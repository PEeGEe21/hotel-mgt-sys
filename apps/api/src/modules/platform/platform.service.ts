import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomInt } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePlatformHotelOnboardingDto } from './dtos/create-platform-hotel-onboarding.dto';

type ListHotelsParams = {
  page?: number;
  limit?: number;
  search?: string;
};

type ListUsersParams = {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  hotelId?: string;
};

function normalizeOptional(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function genUsername(firstName: string, lastName: string, email: string) {
  const base = `${firstName}.${lastName}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '');

  return base || email.split('@')[0].toLowerCase();
}

function employeeCodePrefix(hotelName?: string | null) {
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

function generateTemporaryPassword(length = 12) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  let password = '';
  for (let i = 0; i < length; i += 1) {
    password += chars[randomInt(0, chars.length)];
  }
  return password;
}

@Injectable()
export class PlatformService {
  constructor(private readonly prisma: PrismaService) {}

  async createHotelOnboarding(actorUserId: string, dto: CreatePlatformHotelOnboardingDto) {
    const hotelName = dto.hotelName.trim();
    const hotelEmail = dto.hotelEmail.trim().toLowerCase();
    const adminEmail = dto.adminEmail.trim().toLowerCase();
    const domain = normalizeOptional(dto.domain)?.toLowerCase();
    const website = normalizeOptional(dto.website);
    const state = normalizeOptional(dto.state);
    const timezone = normalizeOptional(dto.timezone) ?? 'Africa/Lagos';
    const currency = (normalizeOptional(dto.currency) ?? 'NGN').toUpperCase();

    if (hotelEmail === adminEmail) {
      throw new BadRequestException('Hotel contact email and initial admin email must be different.');
    }

    const [existingHotelDomain, existingAdminUser] = await Promise.all([
      domain ? this.prisma.hotel.findUnique({ where: { domain }, select: { id: true } }) : null,
      this.prisma.user.findUnique({ where: { email: adminEmail }, select: { id: true } }),
    ]);

    if (existingHotelDomain) {
      throw new ConflictException('A hotel with this domain already exists.');
    }

    if (existingAdminUser) {
      throw new ConflictException('A user with this admin email already exists.');
    }

    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);
    const username = genUsername(dto.adminFirstName.trim(), dto.adminLastName.trim(), adminEmail);

    let employeeCode = '';
    let attempts = 0;
    do {
      employeeCode = genEmployeeCode(hotelName);
      const existingStaff = await this.prisma.staff.findUnique({ where: { employeeCode }, select: { id: true } });
      if (!existingStaff) break;
    } while (++attempts < 20);

    if (attempts >= 20) {
      throw new ConflictException('Could not generate a unique employee code. Please try again.');
    }

    return this.prisma.$transaction(async (tx) => {
      const hotel = await tx.hotel.create({
        data: {
          name: hotelName,
          domain,
          address: dto.address.trim(),
          city: dto.city.trim(),
          state,
          country: dto.country.trim(),
          phone: dto.hotelPhone.trim(),
          email: hotelEmail,
          website,
          currency,
          timezone,
        },
      });

      const department = await tx.department.create({
        data: {
          hotelId: hotel.id,
          name: 'Administration',
          description: 'Baseline department created during platform onboarding.',
          color: 'bg-slate-700',
        },
      });

      const jobTitle = await tx.jobTitle.create({
        data: {
          hotelId: hotel.id,
          departmentId: department.id,
          name: 'Hotel Admin',
          description: 'Initial tenant admin role created during platform onboarding.',
          color: 'bg-teal-700',
        },
      });

      const user = await tx.user.create({
        data: {
          email: adminEmail,
          username,
          passwordHash,
          role: Role.ADMIN,
          isActive: true,
          mustChangePassword: true,
        },
      });

      const staff = await tx.staff.create({
        data: {
          hotelId: hotel.id,
          userId: user.id,
          jobTitleId: jobTitle.id,
          employeeCode,
          firstName: dto.adminFirstName.trim(),
          lastName: dto.adminLastName.trim(),
          phone: normalizeOptional(dto.adminPhone),
          department: department.name,
          position: jobTitle.name,
          hireDate: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          hotelId: hotel.id,
          actorUserId,
          action: 'platform.hotel.onboarded',
          targetType: 'HOTEL',
          targetId: hotel.id,
          targetUserId: user.id,
          metadata: {
            hotelName: hotel.name,
            adminEmail: user.email,
            seededDepartment: department.name,
            seededJobTitle: jobTitle.name,
          },
        },
      });

      return {
        hotel: {
          id: hotel.id,
          name: hotel.name,
          city: hotel.city,
          country: hotel.country,
          email: hotel.email,
          phone: hotel.phone,
        },
        admin: {
          id: user.id,
          name: `${staff.firstName} ${staff.lastName}`.trim(),
          email: user.email,
          username: user.username,
          employeeCode: staff.employeeCode,
          role: user.role,
        },
        credentials: {
          temporaryPassword,
          mustChangePassword: user.mustChangePassword,
        },
      };
    });
  }

  async getStats() {
    const now = Date.now();
    const last24Hours = new Date(now - 24 * 60 * 60 * 1000);
    const last30Days = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const [totalHotels, totalUsers, activeUsers, recentLogins, recentReservations, staleHotels] =
      await Promise.all([
        this.prisma.hotel.count(),
        this.prisma.user.count(),
        this.prisma.user.count({ where: { isActive: true } }),
        this.prisma.user.count({ where: { lastLoginAt: { gte: last24Hours } } }),
        this.prisma.reservation.count({ where: { createdAt: { gte: last30Days } } }),
        this.prisma.hotel.count({
          where: {
            staff: {
              none: {
                user: {
                  lastLoginAt: { gte: last30Days },
                },
              },
            },
          },
        }),
      ]);

    return {
      totals: {
        hotels: totalHotels,
        users: totalUsers,
        activeUsers,
        recentLogins24h: recentLogins,
        recentReservations30d: recentReservations,
        staleHotels30d: staleHotels,
      },
      generatedAt: new Date().toISOString(),
    };
  }

  async listHotels(params: ListHotelsParams) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(Math.max(params.limit ?? 20, 5), 100);
    const skip = (page - 1) * limit;

    const where = params.search
      ? {
          OR: [
            { name: { contains: params.search, mode: 'insensitive' as const } },
            { domain: { contains: params.search, mode: 'insensitive' as const } },
            { city: { contains: params.search, mode: 'insensitive' as const } },
            { country: { contains: params.search, mode: 'insensitive' as const } },
            { email: { contains: params.search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [rows, total] = await Promise.all([
      this.prisma.hotel.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          domain: true,
          city: true,
          country: true,
          email: true,
          phone: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              rooms: true,
              staff: true,
              reservations: true,
            },
          },
        },
      }),
      this.prisma.hotel.count({ where }),
    ]);

    const hotels = await Promise.all(
      rows.map(async (hotel) => {
        const [primaryAdmin, latestStaffLogin] = await Promise.all([
          this.prisma.user.findFirst({
            where: {
              role: { in: ['SUPER_ADMIN', 'ADMIN'] },
              staff: { hotelId: hotel.id },
            },
            select: {
              id: true,
              email: true,
              isActive: true,
              staff: { select: { firstName: true, lastName: true } },
            },
            orderBy: { createdAt: 'asc' },
          }),
          this.prisma.staff.findFirst({
            where: { hotelId: hotel.id },
            select: {
              user: { select: { lastLoginAt: true } },
            },
            orderBy: { user: { lastLoginAt: 'desc' } },
          }),
        ]);

        const lastLoginAt = latestStaffLogin?.user.lastLoginAt ?? null;
        const status =
          hotel._count.staff === 0
            ? 'setup'
            : lastLoginAt && lastLoginAt.getTime() >= Date.now() - 30 * 24 * 60 * 60 * 1000
              ? 'active'
              : 'stale';

        return {
          id: hotel.id,
          name: hotel.name,
          domain: hotel.domain,
          city: hotel.city,
          country: hotel.country,
          email: hotel.email,
          phone: hotel.phone,
          createdAt: hotel.createdAt,
          updatedAt: hotel.updatedAt,
          status,
          counts: {
            rooms: hotel._count.rooms,
            staff: hotel._count.staff,
            reservations: hotel._count.reservations,
          },
          primaryAdmin: primaryAdmin
            ? {
                id: primaryAdmin.id,
                email: primaryAdmin.email,
                isActive: primaryAdmin.isActive,
                name: primaryAdmin.staff
                  ? `${primaryAdmin.staff.firstName} ${primaryAdmin.staff.lastName}`.trim()
                  : primaryAdmin.email,
              }
            : null,
          latestStaffLoginAt: lastLoginAt,
        };
      }),
    );

    return {
      hotels,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getHotelDetail(hotelId: string) {
    const hotel = await this.prisma.hotel.findUnique({
      where: { id: hotelId },
      select: {
        id: true,
        name: true,
        domain: true,
        address: true,
        city: true,
        state: true,
        country: true,
        phone: true,
        email: true,
        website: true,
        description: true,
        currency: true,
        timezone: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            rooms: true,
            staff: true,
            guests: true,
            reservations: true,
            facilities: true,
            invoices: true,
            payments: true,
          },
        },
      },
    });

    if (!hotel) {
      throw new NotFoundException('Hotel not found.');
    }

    const [admins, recentReservations, recentStaffLogins] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          role: { in: ['SUPER_ADMIN', 'ADMIN'] },
          staff: { hotelId },
        },
        select: {
          id: true,
          email: true,
          isActive: true,
          lastLoginAt: true,
          staff: { select: { firstName: true, lastName: true, department: true, position: true } },
        },
        orderBy: { createdAt: 'asc' },
        take: 10,
      }),
      this.prisma.reservation.findMany({
        where: { hotelId },
        select: {
          id: true,
          createdAt: true,
          status: true,
          checkIn: true,
          checkOut: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      this.prisma.staff.findMany({
        where: { hotelId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          department: true,
          user: {
            select: {
              email: true,
              lastLoginAt: true,
            },
          },
        },
        orderBy: { user: { lastLoginAt: 'desc' } },
        take: 5,
      }),
    ]);

    return {
      ...hotel,
      admins: admins.map((admin) => ({
        id: admin.id,
        email: admin.email,
        isActive: admin.isActive,
        lastLoginAt: admin.lastLoginAt,
        name: admin.staff ? `${admin.staff.firstName} ${admin.staff.lastName}`.trim() : admin.email,
        department: admin.staff?.department ?? null,
        position: admin.staff?.position ?? null,
      })),
      recentReservations,
      recentStaffLogins: recentStaffLogins.map((staff) => ({
        id: staff.id,
        name: `${staff.firstName} ${staff.lastName}`.trim(),
        department: staff.department,
        email: staff.user.email,
        lastLoginAt: staff.user.lastLoginAt,
      })),
    };
  }

  async listUsers(params: ListUsersParams) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(Math.max(params.limit ?? 20, 5), 100);
    const skip = (page - 1) * limit;

    const where = {
      ...(params.role ? { role: params.role as any } : {}),
      ...(params.hotelId ? { staff: { hotelId: params.hotelId } } : {}),
      ...(params.search
        ? {
            OR: [
              { email: { contains: params.search, mode: 'insensitive' as const } },
              { username: { contains: params.search, mode: 'insensitive' as const } },
              { staff: { firstName: { contains: params.search, mode: 'insensitive' as const } } },
              { staff: { lastName: { contains: params.search, mode: 'insensitive' as const } } },
              { staff: { employeeCode: { contains: params.search, mode: 'insensitive' as const } } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          username: true,
          role: true,
          isActive: true,
          mustChangePassword: true,
          lastLoginAt: true,
          createdAt: true,
          staff: {
            select: {
              id: true,
              employeeCode: true,
              firstName: true,
              lastName: true,
              department: true,
              position: true,
              hotel: {
                select: {
                  id: true,
                  name: true,
                  city: true,
                  country: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users: rows.map((row) => ({
        id: row.id,
        email: row.email,
        username: row.username,
        role: row.role,
        isActive: row.isActive,
        mustChangePassword: row.mustChangePassword,
        lastLoginAt: row.lastLoginAt,
        createdAt: row.createdAt,
        staff: row.staff
          ? {
              id: row.staff.id,
              employeeCode: row.staff.employeeCode,
              name: `${row.staff.firstName} ${row.staff.lastName}`.trim(),
              department: row.staff.department,
              position: row.staff.position,
            }
          : null,
        hotel: row.staff?.hotel
          ? {
              id: row.staff.hotel.id,
              name: row.staff.hotel.name,
              city: row.staff.hotel.city,
              country: row.staff.hotel.country,
            }
          : null,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUserDetail(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        staff: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
            department: true,
            position: true,
            phone: true,
            hotel: {
              select: {
                id: true,
                name: true,
                city: true,
                country: true,
              },
            },
          },
        },
        refreshTokens: {
          select: {
            id: true,
            createdAt: true,
            expiresAt: true,
            isImpersonation: true,
            impersonatorId: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      isActive: user.isActive,
      mustChangePassword: user.mustChangePassword,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      staff: user.staff
        ? {
            id: user.staff.id,
            employeeCode: user.staff.employeeCode,
            name: `${user.staff.firstName} ${user.staff.lastName}`.trim(),
            department: user.staff.department,
            position: user.staff.position,
            phone: user.staff.phone,
          }
        : null,
      hotel: user.staff?.hotel
        ? {
            id: user.staff.hotel.id,
            name: user.staff.hotel.name,
            city: user.staff.hotel.city,
            country: user.staff.hotel.country,
          }
        : null,
      recentSessions: user.refreshTokens,
    };
  }

  async getActivityFeed(actorUserId: string, limit?: number) {
    const take = Math.min(Math.max(limit ?? 20, 5), 50);

    const rows = await this.prisma.auditLog.findMany({
      where: {
        OR: [
          { actor: { role: 'SUPER_ADMIN' } },
          { actorUserId },
        ],
      },
      include: {
        hotel: {
          select: {
            id: true,
            name: true,
          },
        },
        actor: {
          select: {
            id: true,
            email: true,
            role: true,
            staff: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take,
    });

    return {
      events: rows.map((row) => ({
        id: row.id,
        action: row.action,
        targetType: row.targetType ?? null,
        targetId: row.targetId ?? null,
        createdAt: row.createdAt,
        hotel: row.hotel
          ? {
              id: row.hotel.id,
              name: row.hotel.name,
            }
          : null,
        actor: {
          id: row.actor.id,
          email: row.actor.email,
          role: row.actor.role,
          name: row.actor.staff
            ? `${row.actor.staff.firstName} ${row.actor.staff.lastName}`.trim()
            : row.actor.email,
        },
        metadata: row.metadata ?? null,
      })),
    };
  }
}
