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
import { RealtimePresenceService } from '../../realtime/realtime-presence.service';
import { HotelLifecycleService } from '../../hotel-lifecycle/hotel-lifecycle.service';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function employeeCodePrefix(hotelName?: string | null): string {
  const cleaned = (hotelName ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]+/g, ' ')
    .trim();

  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return words
      .slice(0, 3)
      .map((word) => word[0])
      .join('')
      .padEnd(3, 'X')
      .slice(0, 3);
  }

  const compact = cleaned.replace(/\s+/g, '');
  if (compact.length >= 3) return compact.slice(0, 3);
  if (compact.length > 0) return compact.padEnd(3, 'X');
  return 'EMP';
}

function genEmployeeCode(hotelName?: string | null): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const prefix = employeeCodePrefix(hotelName);
  let suffix = '';
  for (let i = 0; i < 4; i += 1) {
    suffix += chars[randomInt(0, chars.length)];
  }
  return `${prefix}-${suffix}`;
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
  defaultShift: {
    select: {
      id: true,
      name: true,
      startTime: true,
      endTime: true,
      days: true,
      color: true,
    },
  },
} as const;

function genUsername(firstName: string, lastName: string, email: string) {
  const base = `${firstName}.${lastName}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '');

  return base || email.split('@')[0].toLowerCase();
}

@Injectable()
export class StaffService {
  constructor(
    private prisma: PrismaService,
    private readonly presenceService: RealtimePresenceService,
    private readonly hotelLifecycleService: HotelLifecycleService,
  ) {}

  private async ensureJobTitle(hotelId: string, jobTitleId?: string | null) {
    if (!jobTitleId) return null;
    const jobTitle = await this.prisma.jobTitle.findFirst({
      where: { id: jobTitleId, hotelId },
      include: {
        department: { select: { id: true, name: true } },
      },
    });
    if (!jobTitle) throw new NotFoundException('Job title not found.');
    return jobTitle;
  }

  private async ensureShiftTemplate(hotelId: string, shiftTemplateId?: string | null) {
    if (!shiftTemplateId) return null;
    const shiftTemplate = await this.prisma.shiftTemplate.findFirst({
      where: { id: shiftTemplateId, hotelId },
      select: {
        id: true,
        name: true,
        startTime: true,
        endTime: true,
        days: true,
        color: true,
      },
    });
    if (!shiftTemplate) throw new NotFoundException('Shift template not found.');
    return shiftTemplate;
  }

  private async setPinWithClient(
    prisma: PrismaService | any,
    hotelId: string,
    staffId: string,
    dto: SetStaffPinDto,
  ) {
    const staff = await prisma.staff.findFirst({
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
    await prisma.staff.update({
      where: { id: staffId },
      data: {
        pinHash,
        pinUpdatedAt: new Date(),
        pinFailedAttempts: 0,
      },
    });

    return { staffId, pin };
  }

  async setPin(hotelId: string, staffId: string, dto: SetStaffPinDto) {
    return this.setPinWithClient(this.prisma, hotelId, staffId, dto);
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

    const presenceMap = await this.presenceService.getPresenceMap(
      staff.map((member) => member.user.id),
    );

    const staffWithStatus = staff.map((s) => {
      const records = attMap.get(s.id) ?? [];
      const last = records[records.length - 1];
      let clockStatus: string;
      if (leaveSet.has(s.id)) clockStatus = 'On Leave';
      else if (!records.length) clockStatus = 'Not Clocked In';
      else if (last?.type === 'CLOCK_IN') clockStatus = 'Clocked In';
      else clockStatus = 'Clocked Out';

      return {
        ...s,
        clockStatus,
        user: {
          ...s.user,
          isOnline: presenceMap.get(s.user.id)?.isOnline ?? false,
          lastSeenAt: presenceMap.get(s.user.id)?.lastSeenAt ?? null,
        },
      };
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
    const presenceMap = await this.presenceService.getPresenceMap(staff.user ? [staff.user.id] : []);

    return {
      ...staff,
      user: staff.user
        ? {
            ...staff.user,
            isOnline: presenceMap.get(staff.user.id)?.isOnline ?? false,
            lastSeenAt: presenceMap.get(staff.user.id)?.lastSeenAt ?? null,
          }
        : staff.user,
    };
  }

  // ── Create (Staff + User atomically) ───────────────────────────────────────
  async create(hotelId: string, dto: CreateStaffDto) {
    // Check email not already taken
    const existingUser = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existingUser) throw new ConflictException('A user with this email already exists.');

    // Auto-generate employee code
    const hotel = await this.prisma.hotel.findUnique({
      where: { id: hotelId },
      select: { name: true },
    });
    let employeeCode: string;
    let attempts = 0;
    do {
      employeeCode = genEmployeeCode(hotel?.name);
      const exists = await this.prisma.staff.findUnique({ where: { employeeCode } });
      if (!exists) break;
    } while (++attempts < 20);

    if (attempts >= 20) {
      throw new ConflictException('Could not generate a unique employee code. Please try again.');
    }

    const jobTitle = await this.ensureJobTitle(hotelId, dto.jobTitleId?.trim() || null);
    const shiftTemplate = await this.ensureShiftTemplate(hotelId, dto.shiftTemplateId?.trim() || null);
    const position = jobTitle?.name || dto.position;
    const department = dto.department || jobTitle?.department?.name || '';

    if (!department.trim()) {
      throw new BadRequestException('Department is required.');
    }
    if (!position.trim()) {
      throw new BadRequestException('Position is required.');
    }

    const passwordHash = await bcrypt.hash('password', 10);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email,
          username: genUsername(dto.firstName, dto.lastName, dto.email),
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
          department,
          position,
          jobTitleId: jobTitle?.id || null,
          shiftTemplateId: shiftTemplate?.id || null,
          salary: dto.salary ?? 0,
          hireDate: new Date(dto.hireDate),
        },
        include: {
          ...STAFF_INCLUDE,
        },
      });

      await this.setPinWithClient(tx, hotelId, staff.id, { generate: true });
      await this.hotelLifecycleService.syncOnboardingStatus(hotelId, tx);

      return { staff, employeeCode: employeeCode!, defaultPassword: 'password' };
    });
  }

  // ── Update ─────────────────────────────────────────────────────────────────
  async update(hotelId: string, id: string, dto: UpdateStaffDto) {
    const staff = await this.prisma.staff.findFirst({ where: { id, hotelId } });
    if (!staff) throw new NotFoundException('Staff member not found.');

    const jobTitle =
      dto.jobTitleId !== undefined
        ? await this.ensureJobTitle(hotelId, dto.jobTitleId?.trim() || null)
        : undefined;
    const shiftTemplate =
      dto.shiftTemplateId !== undefined
        ? await this.ensureShiftTemplate(hotelId, dto.shiftTemplateId?.trim() || null)
        : undefined;

    // If email changed, update user too
    const staffUpdate = this.prisma.staff.update({
      where: { id },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        department:
          dto.department !== undefined
            ? dto.department
            : jobTitle
              ? jobTitle.department?.name || staff.department
              : undefined,
        position: dto.position !== undefined ? dto.position : jobTitle?.name || undefined,
        jobTitleId: dto.jobTitleId !== undefined ? jobTitle?.id || null : undefined,
        shiftTemplateId:
          dto.shiftTemplateId !== undefined ? shiftTemplate?.id || null : undefined,
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

  async getStaff(hotelId: string) {
    return this.prisma.staff.findMany({
      where: {
        hotelId,
        user: { isActive: true },
        OR: [
          { user: { role: { notIn: ['ADMIN', 'SUPER_ADMIN'] } } },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatar: true,
        position: true,
      },
      orderBy: { firstName: 'asc' },
    });
  }
}
