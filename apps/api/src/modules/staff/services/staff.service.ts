import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { SetStaffPinDto } from '../dtos/set-pin.dto';
import { randomInt } from 'crypto';
import { PrismaService } from 'src/prisma/prisma.service';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { StaffFilterDto } from '../dtos/staff-filter.dto';
import { UpdateStaffDto } from '../dtos/update-staff.dto';
import { CreateStaffDto } from '../dtos/create-staff.dto';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function genEmployeeCode(index: number): string {
  return `EMP-${String(index).padStart(3, '0')}`;
}

const STAFF_INCLUDE = {
  user: {
    select: {
      id: true,
      email: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      mustChangePassword: true,
    },
  },
} as const;

@Injectable()
export class StaffService {
  constructor(private prisma: PrismaService) {}

  async setPin(hotelId: string, staffId: string, dto: SetStaffPinDto) {
    const staff = await this.prisma.staff.findFirst({
      where: { id: staffId, hotelId },
      select: { id: true },
    });
    if (!staff) throw new NotFoundException('Staff not found.');

    let pin = dto.pin?.trim();
    if (!pin || dto.generate) {
      pin = String(randomInt(1000, 10000));
    }

    if (!/^\d{4,6}$/.test(pin)) {
      throw new BadRequestException('PIN must be 4 to 6 digits.');
    }

    const pinHash = await bcrypt.hash(pin, 10);
    await this.prisma.staff.update({
      where: { id: staffId },
      data: {
        pinHash,
        pinUpdatedAt: new Date(),
        pinFailedAttempts: 0,
      },
    });

    return { staffId, pin };
  }

  async findAll(hotelId: string, filters: StaffFilterDto) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = { hotelId };
    if (filters.department)
      where.department = { contains: filters.department, mode: 'insensitive' };
    if (filters.role) where.user = { role: filters.role };
    if (filters.search) {
      where.OR = [
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
        { employeeCode: { contains: filters.search, mode: 'insensitive' } },
        { position: { contains: filters.search, mode: 'insensitive' } },
        { department: { contains: filters.search, mode: 'insensitive' } },
        { user: { email: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

    const [staff, total] = await Promise.all([
      this.prisma.staff.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
        include: {
          ...STAFF_INCLUDE,
          _count: { select: { tasks: true, attendance: true } },
        },
      }),
      this.prisma.staff.count({ where }),
    ]);

    // Today's attendance status for each staff member
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const staffIds = staff.map((s) => s.id);
    const [todayAttendance, activeLeaves] = await Promise.all([
      this.prisma.attendance.findMany({
        where: { staffId: { in: staffIds }, timestamp: { gte: today, lt: tomorrow } },
        orderBy: { timestamp: 'asc' },
      }),
      this.prisma.leave.findMany({
        where: {
          staffId: { in: staffIds },
          status: 'APPROVED',
          startDate: { lte: tomorrow },
          endDate: { gte: today },
        },
        select: { staffId: true },
      }),
    ]);

    const attMap = new Map<string, any[]>();
    todayAttendance.forEach((a) => {
      const list = attMap.get(a.staffId) ?? [];
      list.push(a);
      attMap.set(a.staffId, list);
    });
    const leaveSet = new Set(activeLeaves.map((l) => l.staffId));

    const staffWithStatus = staff.map((s) => {
      const records = attMap.get(s.id) ?? [];
      const last = records[records.length - 1];
      let clockStatus: string;
      if (leaveSet.has(s.id)) clockStatus = 'On Leave';
      else if (!records.length) clockStatus = 'Not Clocked In';
      else if (last?.type === 'CLOCK_IN') clockStatus = 'Clocked In';
      else clockStatus = 'Clocked Out';

      return { ...s, clockStatus };
    });

    // Stats
    const clocked = staffWithStatus.filter((s) => s.clockStatus === 'Clocked In').length;
    const onLeave = staffWithStatus.filter((s) => s.clockStatus === 'On Leave').length;
    const notClockedIn = staffWithStatus.filter((s) => s.clockStatus === 'Not Clocked In').length;

    // Departments list
    const departments = await this.prisma.department.findMany({
      where: { hotelId },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });

    return {
      staff: staffWithStatus,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      meta: {
        total,
        current_page: page,
        last_page: Math.ceil(total / limit),
        per_page: limit,
        from: skip + 1,
        to: Math.min(skip + limit, total),
      },
      stats: { total, clocked, onLeave, notClockedIn },
      departments,
    };
  }

  // ── Single ─────────────────────────────────────────────────────────────────
  async findOne(hotelId: string, id: string) {
    const staff = await this.prisma.staff.findFirst({
      where: { id, hotelId },
      include: {
        ...STAFF_INCLUDE,
        tasks: {
          where: { status: { in: ['PENDING', 'IN_PROGRESS'] } },
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: { room: { select: { number: true, type: true } } },
        },
        leaves: {
          orderBy: { startDate: 'desc' },
          take: 10,
        },
        attendance: {
          orderBy: { timestamp: 'desc' },
          take: 20,
        },
      },
    });
    if (!staff) throw new NotFoundException('Staff member not found.');
    return staff;
  }

  // ── Create (Staff + User atomically) ───────────────────────────────────────
  async create(hotelId: string, dto: CreateStaffDto) {
    // Check email not already taken
    const existingUser = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existingUser) throw new ConflictException('A user with this email already exists.');

    // Auto-generate employee code
    const count = await this.prisma.staff.count({ where: { hotelId } });
    let employeeCode: string;
    let attempts = 0;
    do {
      employeeCode = genEmployeeCode(count + 1 + attempts);
      const exists = await this.prisma.staff.findUnique({ where: { employeeCode } });
      if (!exists) break;
    } while (++attempts < 20);

    const passwordHash = await bcrypt.hash('password', 10);

    return this.prisma.$transaction(async (tx) => {
      // generate user name using firstname and lastname and email

      const user = await tx.user.create({
        data: {
          email: dto.email,
          passwordHash,
          role: dto.role,
          isActive: true,
          mustChangePassword: true,
        },
      });

      const staff = await tx.staff.create({
        data: {
          hotelId,
          userId: user.id,
          employeeCode: employeeCode!,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          department: dto.department,
          position: dto.position,
          salary: dto.salary ?? 0,
          hireDate: new Date(dto.hireDate),
        },
        include: {
          ...STAFF_INCLUDE,
        },
      });

      await this.setPin(hotelId, staff.id, { generate: true });

      return { staff, employeeCode: employeeCode!, defaultPassword: 'password' };
    });
  }

  // ── Update ─────────────────────────────────────────────────────────────────
  async update(hotelId: string, id: string, dto: UpdateStaffDto) {
    const staff = await this.prisma.staff.findFirst({ where: { id, hotelId } });
    if (!staff) throw new NotFoundException('Staff member not found.');

    // If email changed, update user too
    const staffUpdate = this.prisma.staff.update({
      where: { id },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        department: dto.department,
        position: dto.position,
        salary: dto.salary,
      },
      include: STAFF_INCLUDE,
    });

    if (dto.email || dto.role) {
      await this.prisma.user.update({
        where: { id: staff.userId },
        data: {
          ...(dto.email ? { email: dto.email } : {}),
          ...(dto.role ? { role: dto.role } : {}),
        },
      });
    }

    return staffUpdate;
  }

  // ── Deactivate / Reactivate ────────────────────────────────────────────────
  async setActive(hotelId: string, id: string, isActive: boolean) {
    const staff = await this.prisma.staff.findFirst({ where: { id, hotelId } });
    if (!staff) throw new NotFoundException('Staff member not found.');

    await this.prisma.user.update({
      where: { id: staff.userId },
      data: { isActive },
    });

    return this.prisma.staff.findFirst({
      where: { id },
      include: STAFF_INCLUDE,
    });
  }

  // ── Reset password to default ──────────────────────────────────────────────
  async resetPassword(hotelId: string, id: string) {
    const staff = await this.prisma.staff.findFirst({ where: { id, hotelId } });
    if (!staff) throw new NotFoundException('Staff member not found.');

    const passwordHash = await bcrypt.hash('password', 10);
    await this.prisma.user.update({
      where: { id: staff.userId },
      data: { passwordHash, mustChangePassword: true },
    });

    return { message: 'Password reset to default. Staff must change on next login.' };
  }

  // ── Roles list (from enum — no DB needed) ─────────────────────────────────
  getRoles() {
    return Object.values(Role).filter((r) => r !== 'SUPER_ADMIN');
  }
}
