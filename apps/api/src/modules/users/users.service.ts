import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserAccountDto } from './dtos/create-user-account.dto';
import { UpdateUserAccountDto } from './dtos/update-user-account.dto';
import { ResetPasswordDto } from './dtos/reset-password.dto';
import { UpdateUserPermissionsDto } from './dtos/update-user-permissions.dto';
import * as bcrypt from 'bcryptjs';
import { UsersFilterDto } from './dtos/users-filter.dto';
import { Role } from '@prisma/client';
import { RealtimePresenceService } from '../realtime/realtime-presence.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private readonly presenceService: RealtimePresenceService,
  ) {}

  private async resolveHotelId(hotelId?: string | null, role?: string) {
    if (hotelId) return hotelId;

    if (role === Role.SUPER_ADMIN || role === Role.ADMIN) {
      const hotel = await this.prisma.hotel.findFirst({
        select: { id: true },
        orderBy: { createdAt: 'asc' },
      });
      if (hotel?.id) return hotel.id;
    }

    throw new ForbiddenException('Hotel context is unavailable for this user.');
  }

  async findAll(hotelId: string | null | undefined, role: string | undefined, search?: string) {
    const resolvedHotelId = await this.resolveHotelId(hotelId, role);
    const where: any = {
      staff: { is: { hotelId: resolvedHotelId } },
    };
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { staff: { is: { firstName: { contains: search, mode: 'insensitive' } } } },
        { staff: { is: { lastName: { contains: search, mode: 'insensitive' } } } },
        { staff: { is: { department: { contains: search, mode: 'insensitive' } } } },
      ];
    }

    const users = await this.prisma.user.findMany({
      where,
      include: { staff: true },
      orderBy: { createdAt: 'desc' },
    });

    const presenceMap = await this.presenceService.getPresenceMap(users.map((user) => user.id));

    return users.map((u) => ({
      id: u.id,
      staffId: u.staff?.id ?? null,
      staffName: u.staff ? `${u.staff.firstName} ${u.staff.lastName}` : u.email,
      firstName: u.staff?.firstName ?? null,
      lastName: u.staff?.lastName ?? null,
      employeeCode: u.staff?.employeeCode ?? null,
      username: u.email.split('@')[0],
      email: u.email,
      role: u.role,
      status: u.isActive ? (u.lastLoginAt ? 'Active' : 'Pending') : 'Suspended',
      lastLogin: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
      createdAt: u.createdAt.toISOString(),
      department: u.staff?.department ?? null,
      position: u.staff?.position ?? null,
      permissionGrants: u.permissionGrants ?? [],
      permissionDenies: u.permissionDenies ?? [],
      isOnline: presenceMap.get(u.id)?.isOnline ?? false,
      lastSeenAt: presenceMap.get(u.id)?.lastSeenAt ?? null,
    }));
  }

  async list(hotelId: string | null | undefined, role: string | undefined, filters: UsersFilterDto) {
    const resolvedHotelId = await this.resolveHotelId(hotelId, role);
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = {
      staff: { is: { hotelId: resolvedHotelId } },
    };
    if (filters.search) {
      where.OR = [
        { email: { contains: filters.search, mode: 'insensitive' } },
        { username: { contains: filters.search, mode: 'insensitive' } },
        { staff: { is: { firstName: { contains: filters.search, mode: 'insensitive' } } } },
        { staff: { is: { lastName: { contains: filters.search, mode: 'insensitive' } } } },
        { staff: { is: { department: { contains: filters.search, mode: 'insensitive' } } } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        include: { staff: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    const presenceMap = await this.presenceService.getPresenceMap(users.map((user) => user.id));

    const usersMapped = users.map((u) => {
      return {
        id: u.id,
        staffId: u.staff?.id ?? null,
        staffName: u.staff ? `${u.staff.firstName} ${u.staff.lastName}` : u.email,
        firstName: u.staff?.firstName ?? null,
        lastName: u.staff?.lastName ?? null,
        employeeCode: u.staff?.employeeCode ?? null,
        username: u.username ?? u.email.split('@')[0],
        email: u.email,
        role: u.role,
        status: u.isActive ? (u.lastLoginAt ? 'Active' : 'Pending') : 'Suspended',
        lastLogin: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
        createdAt: u.createdAt.toISOString(),
        department: u.staff?.department ?? null,
        position: u.staff?.position ?? null,
        permissionGrants: u.permissionGrants ?? [],
        permissionDenies: u.permissionDenies ?? [],
        isOnline: presenceMap.get(u.id)?.isOnline ?? false,
        lastSeenAt: presenceMap.get(u.id)?.lastSeenAt ?? null,
      };
    });

    // Stats
    const active = usersMapped.filter((s) => s.status === 'Active').length;
    const suspended = usersMapped.filter((s) => s.status === 'Suspended').length;
    const pending = usersMapped.filter((s) => s.status === 'Pending').length;

    return {
      users: usersMapped,
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
      stats: { total, active, suspended, pending },
    };
  }

  async create(hotelId: string | null | undefined, role: string | undefined, dto: CreateUserAccountDto) {
    const resolvedHotelId = await this.resolveHotelId(hotelId, role);
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new BadRequestException('Email already in use.');

    const employeeExists = await this.prisma.staff.findFirst({
      where: { hotelId: resolvedHotelId, employeeCode: dto.employeeCode },
      select: { id: true },
    });
    if (employeeExists) throw new BadRequestException('Employee code already exists.');

    const passwordHash = await bcrypt.hash(dto.password, 12);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email,
          passwordHash,
          role: dto.role,
          isActive: true,
        },
      });

      await tx.staff.create({
        data: {
          userId: user.id,
          hotelId: resolvedHotelId,
          employeeCode: dto.employeeCode,
          firstName: dto.firstName,
          lastName: dto.lastName,
          department: dto.department,
          position: dto.position,
          phone: dto.phone ?? null,
          hireDate: new Date(),
          salary: 0,
        },
      });

      return user;
    });
  }

  async update(
    hotelId: string | null | undefined,
    role: string | undefined,
    userId: string,
    dto: UpdateUserAccountDto,
  ) {
    const resolvedHotelId = await this.resolveHotelId(hotelId, role);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { staff: true },
    });
    if (!user || user.staff?.hotelId !== resolvedHotelId) {
      throw new NotFoundException('User account not found.');
    }

    if (dto.email && dto.email !== user.email) {
      const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (exists) throw new BadRequestException('Email already in use.');
    }

    if (dto.employeeCode && dto.employeeCode !== user.staff?.employeeCode) {
      const employeeExists = await this.prisma.staff.findFirst({
        where: { hotelId: resolvedHotelId, employeeCode: dto.employeeCode },
        select: { id: true },
      });
      if (employeeExists) throw new BadRequestException('Employee code already exists.');
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: {
          email: dto.email ?? user.email,
          role: dto.role ?? user.role,
          isActive: dto.isActive ?? user.isActive,
        },
      });

      if (user.staff) {
        await tx.staff.update({
          where: { id: user.staff.id },
          data: {
            firstName: dto.firstName ?? user.staff.firstName,
            lastName: dto.lastName ?? user.staff.lastName,
            department: dto.department ?? user.staff.department,
            position: dto.position ?? user.staff.position,
            employeeCode: dto.employeeCode ?? user.staff.employeeCode,
            phone: dto.phone ?? user.staff.phone,
          },
        });
      }

      return updatedUser;
    });
  }

  async updatePermissions(
    hotelId: string | null | undefined,
    role: string | undefined,
    actorUserId: string,
    userId: string,
    dto: UpdateUserPermissionsDto,
  ) {
    const resolvedHotelId = await this.resolveHotelId(hotelId, role);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { staff: true },
    });
    if (!user || user.staff?.hotelId !== resolvedHotelId) {
      throw new NotFoundException('User account not found.');
    }

    if (user.role === 'SUPER_ADMIN') {
      throw new BadRequestException('Super Admin permissions cannot be modified.');
    }

    const grants = dto.grants ?? user.permissionGrants ?? [];
    const denies = dto.denies ?? user.permissionDenies ?? [];
    const before = [
      ...new Set([...(user.permissionGrants ?? []), ...(user.permissionDenies ?? [])]),
    ].sort();
    const after = [...new Set([...grants, ...denies])].sort();
    const changed = before.join('|') !== after.join('|');

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          permissionGrants: grants,
          permissionDenies: denies,
        },
      });

      if (changed) {
        await tx.permissionAuditLog.create({
          data: {
            hotelId: resolvedHotelId,
            actorUserId,
            targetType: 'USER',
            targetUserId: user.id,
            before,
            after,
          },
        });
      }
    });

    return { success: true };
  }

  async resetPassword(
    hotelId: string | null | undefined,
    role: string | undefined,
    userId: string,
    dto: ResetPasswordDto,
  ) {
    const resolvedHotelId = await this.resolveHotelId(hotelId, role);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { staff: true },
    });
    if (!user || user.staff?.hotelId !== resolvedHotelId) {
      throw new NotFoundException('User account not found.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    return { success: true };
  }

  async remove(hotelId: string | null | undefined, role: string | undefined, userId: string) {
    const resolvedHotelId = await this.resolveHotelId(hotelId, role);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { staff: true },
    });
    if (!user || user.staff?.hotelId !== resolvedHotelId) {
      throw new NotFoundException('User account not found.');
    }

    await this.prisma.user.update({ where: { id: userId }, data: { isActive: false } });
    return { success: true };
  }
}
