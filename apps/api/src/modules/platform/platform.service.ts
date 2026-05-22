import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { randomInt } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePlatformHotelOnboardingDto } from './dtos/create-platform-hotel-onboarding.dto';
import { HotelLifecycleService } from '../hotel-lifecycle/hotel-lifecycle.service';
import { UpdatePlatformHotelDto } from './dtos/update-platform-hotel.dto';
import { UpdatePlatformHotelLifecycleDto } from './dtos/update-platform-hotel-lifecycle.dto';

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

type PlatformHotelHealth = {
  score: number;
  status: 'healthy' | 'warning' | 'critical' | 'setup';
  label: string;
  lastStaffLoginAt: Date | null;
  lastReservationCreatedAt: Date | null;
  overdueInvoices: number;
  signals: string[];
};

const ADMIN_ROLE = 'ADMIN';
const OVERDUE_PAYMENT_STATUSES = ['UNPAID', 'PARTIAL'] as const;

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly hotelLifecycleService: HotelLifecycleService,
  ) {}

  private deriveHotelHealth(params: {
    suspendedAt: Date | null;
    deletedAt: Date | null;
    onboardingStatus: string;
    lastStaffLoginAt: Date | null;
    lastReservationCreatedAt: Date | null;
    overdueInvoices: number;
    staffCount: number;
    roomCount: number;
  }): PlatformHotelHealth {
    const now = Date.now();
    const daysSinceLogin = params.lastStaffLoginAt
      ? (now - params.lastStaffLoginAt.getTime()) / (24 * 60 * 60 * 1000)
      : Number.POSITIVE_INFINITY;
    const daysSinceReservation = params.lastReservationCreatedAt
      ? (now - params.lastReservationCreatedAt.getTime()) / (24 * 60 * 60 * 1000)
      : Number.POSITIVE_INFINITY;

    const signals: string[] = [];
    let score = 100;

    if (params.deletedAt) {
      return {
        score: 5,
        status: 'critical',
        label: 'Soft-deleted',
        lastStaffLoginAt: params.lastStaffLoginAt,
        lastReservationCreatedAt: params.lastReservationCreatedAt,
        overdueInvoices: params.overdueInvoices,
        signals: ['Tenant is soft-deleted and pending purge or restore.'],
      };
    }

    if (params.suspendedAt) {
      score -= 45;
      signals.push('Tenant is suspended at the platform level.');
    }

    if (params.onboardingStatus !== 'ACTIVE' || params.staffCount === 0 || params.roomCount === 0) {
      score -= 30;
      signals.push('Onboarding is still incomplete.');
    }

    if (daysSinceLogin === Number.POSITIVE_INFINITY) {
      score -= 25;
      signals.push('No staff login activity has been recorded yet.');
    } else if (daysSinceLogin > 30) {
      score -= 25;
      signals.push('No staff login in the last 30 days.');
    } else if (daysSinceLogin > 14) {
      score -= 12;
      signals.push('Staff login activity is slowing down.');
    }

    if (daysSinceReservation === Number.POSITIVE_INFINITY) {
      score -= 15;
      signals.push('No reservations have been created yet.');
    } else if (daysSinceReservation > 30) {
      score -= 20;
      signals.push('No reservations created in the last 30 days.');
    } else if (daysSinceReservation > 14) {
      score -= 10;
      signals.push('Reservation creation activity is cooling off.');
    }

    if (params.overdueInvoices >= 5) {
      score -= 25;
      signals.push(`${params.overdueInvoices} overdue invoices need collection follow-up.`);
    } else if (params.overdueInvoices > 0) {
      score -= 12;
      signals.push(`${params.overdueInvoices} overdue invoice${params.overdueInvoices === 1 ? '' : 's'} outstanding.`);
    }

    score = Math.max(0, Math.min(100, score));

    if (params.onboardingStatus !== 'ACTIVE' || params.staffCount === 0 || params.roomCount === 0) {
      return {
        score,
        status: 'setup',
        label: 'Setup',
        lastStaffLoginAt: params.lastStaffLoginAt,
        lastReservationCreatedAt: params.lastReservationCreatedAt,
        overdueInvoices: params.overdueInvoices,
        signals,
      };
    }

    if (score <= 49) {
      return {
        score,
        status: 'critical',
        label: 'Critical',
        lastStaffLoginAt: params.lastStaffLoginAt,
        lastReservationCreatedAt: params.lastReservationCreatedAt,
        overdueInvoices: params.overdueInvoices,
        signals,
      };
    }

    if (score <= 79) {
      return {
        score,
        status: 'warning',
        label: 'Watch',
        lastStaffLoginAt: params.lastStaffLoginAt,
        lastReservationCreatedAt: params.lastReservationCreatedAt,
        overdueInvoices: params.overdueInvoices,
        signals,
      };
    }

    return {
      score,
      status: 'healthy',
      label: 'Healthy',
      lastStaffLoginAt: params.lastStaffLoginAt,
      lastReservationCreatedAt: params.lastReservationCreatedAt,
      overdueInvoices: params.overdueInvoices,
      signals: signals.length > 0 ? signals : ['Recent activity looks healthy across staff and bookings.'],
    };
  }

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
          role: ADMIN_ROLE,
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

      const syncedHotel = await this.hotelLifecycleService.syncOnboardingStatus(hotel.id, tx);

      return {
        hotel: {
          id: hotel.id,
          name: hotel.name,
          city: hotel.city,
          country: hotel.country,
          email: hotel.email,
          phone: hotel.phone,
          onboardingStatus: syncedHotel.onboardingStatus,
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

    const [totalHotels, totalUsers, activeUsers, recentLogins, recentReservations, staleHotels, suspendedHotels] =
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
        this.prisma.hotel.count({ where: { suspendedAt: { not: null } } }),
      ]);

    return {
      totals: {
        hotels: totalHotels,
        users: totalUsers,
        activeUsers,
        recentLogins24h: recentLogins,
        recentReservations30d: recentReservations,
        staleHotels30d: staleHotels,
        suspendedHotels,
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
          onboardingStatus: true,
          suspendedAt: true,
          suspensionReason: true,
          deletedAt: true,
          purgeAfterAt: true,
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
        const [primaryAdmin, latestStaffLogin, recentReservation, overdueInvoices] = await Promise.all([
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
          this.prisma.reservation.findFirst({
            where: { hotelId: hotel.id },
            select: { createdAt: true },
            orderBy: { createdAt: 'desc' },
          }),
          this.prisma.invoice.count({
            where: {
              hotelId: hotel.id,
              dueAt: { lt: new Date() },
              paymentStatus: { in: [...OVERDUE_PAYMENT_STATUSES] },
            },
          }),
        ]);

        const onboardingStatus = this.hotelLifecycleService.deriveOnboardingStatus(
          hotel._count.rooms,
          hotel._count.staff,
        );
        const lastLoginAt = latestStaffLogin?.user.lastLoginAt ?? null;
        const lastReservationCreatedAt = recentReservation?.createdAt ?? null;
        const health = this.deriveHotelHealth({
          suspendedAt: hotel.suspendedAt,
          deletedAt: hotel.deletedAt,
          onboardingStatus,
          lastStaffLoginAt: lastLoginAt,
          lastReservationCreatedAt,
          overdueInvoices,
          staffCount: hotel._count.staff,
          roomCount: hotel._count.rooms,
        });
        const status =
          hotel.deletedAt
            ? 'deleted'
            : hotel.suspendedAt
            ? 'suspended'
            : hotel._count.staff === 0 || onboardingStatus !== 'ACTIVE'
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
          onboardingStatus,
          suspendedAt: hotel.suspendedAt,
          suspensionReason: hotel.suspensionReason,
          deletedAt: hotel.deletedAt,
          purgeAfterAt: hotel.purgeAfterAt,
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
          health: {
            ...health,
            lastStaffLoginAt: health.lastStaffLoginAt,
            lastReservationCreatedAt: health.lastReservationCreatedAt,
          },
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
        onboardingStatus: true,
        suspendedAt: true,
        suspensionReason: true,
        deletedAt: true,
        purgeAfterAt: true,
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

    const onboardingStatus = this.hotelLifecycleService.deriveOnboardingStatus(hotel._count.rooms, hotel._count.staff);

    const [admins, recentReservations, recentStaffLogins, latestReservation, overdueInvoices] = await Promise.all([
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
      this.prisma.reservation.findFirst({
        where: { hotelId },
        select: { createdAt: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.invoice.count({
        where: {
          hotelId,
          dueAt: { lt: new Date() },
          paymentStatus: { in: [...OVERDUE_PAYMENT_STATUSES] },
        },
      }),
    ]);

    const latestStaffLoginAt = recentStaffLogins[0]?.user.lastLoginAt ?? null;
    const health = this.deriveHotelHealth({
      suspendedAt: hotel.suspendedAt,
      deletedAt: hotel.deletedAt,
      onboardingStatus,
      lastStaffLoginAt: latestStaffLoginAt,
      lastReservationCreatedAt: latestReservation?.createdAt ?? null,
      overdueInvoices,
      staffCount: hotel._count.staff,
      roomCount: hotel._count.rooms,
    });

    return {
      ...hotel,
      onboardingStatus,
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
      health: {
        ...health,
        lastStaffLoginAt: health.lastStaffLoginAt,
        lastReservationCreatedAt: health.lastReservationCreatedAt,
      },
    };
  }

  async updateHotel(actorUserId: string, hotelId: string, dto: UpdatePlatformHotelDto) {
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
      },
    });

    if (!hotel) {
      throw new NotFoundException('Hotel not found.');
    }

    const normalizedDomain = dto.domain !== undefined ? normalizeOptional(dto.domain)?.toLowerCase() : undefined;
    if (normalizedDomain && normalizedDomain !== hotel.domain) {
      const existing = await this.prisma.hotel.findUnique({
        where: { domain: normalizedDomain },
        select: { id: true },
      });
      if (existing && existing.id !== hotelId) {
        throw new ConflictException('A hotel with this domain already exists.');
      }
    }

    const data = {
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.domain !== undefined ? { domain: normalizedDomain } : {}),
      ...(dto.address !== undefined ? { address: dto.address.trim() } : {}),
      ...(dto.city !== undefined ? { city: dto.city.trim() } : {}),
      ...(dto.state !== undefined ? { state: normalizeOptional(dto.state) } : {}),
      ...(dto.country !== undefined ? { country: dto.country.trim() } : {}),
      ...(dto.phone !== undefined ? { phone: dto.phone.trim() } : {}),
      ...(dto.email !== undefined ? { email: dto.email.trim().toLowerCase() } : {}),
      ...(dto.website !== undefined ? { website: normalizeOptional(dto.website) } : {}),
      ...(dto.description !== undefined ? { description: normalizeOptional(dto.description) } : {}),
      ...(dto.currency !== undefined ? { currency: dto.currency.trim().toUpperCase() } : {}),
      ...(dto.timezone !== undefined ? { timezone: dto.timezone.trim() } : {}),
    };

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('Provide at least one hotel field to update.');
    }

    await this.prisma.hotel.update({
      where: { id: hotelId },
      data,
      select: { id: true },
    });

    const changedFields = Object.keys(data).filter((key) => {
      const before = (hotel as Record<string, unknown>)[key] ?? null;
      const after = (data as Record<string, unknown>)[key] ?? null;
      return before !== after;
    });

    await this.prisma.auditLog.create({
      data: {
        hotelId,
        actorUserId,
        action: 'platform.hotel.update',
        targetType: 'HOTEL',
        targetId: hotelId,
        metadata: {
          hotelName: data.name ?? hotel.name,
          changedFields,
        },
      },
    });

    return this.getHotelDetail(hotelId);
  }

  async suspendHotel(actorUserId: string, hotelId: string, dto: UpdatePlatformHotelLifecycleDto) {
    const hotel = await this.prisma.hotel.findUnique({
      where: { id: hotelId },
      select: { id: true, name: true, suspendedAt: true, deletedAt: true },
    });

    if (!hotel) {
      throw new NotFoundException('Hotel not found.');
    }

    if (hotel.suspendedAt) {
      throw new BadRequestException('Hotel is already suspended.');
    }

    if (hotel.deletedAt) {
      throw new BadRequestException('Restore this hotel before changing its suspension state.');
    }

    if (dto.confirmationName.trim() !== hotel.name) {
      throw new BadRequestException('Confirmation name did not match the hotel name.');
    }

    const reason = normalizeOptional(dto.reason);
    if (!reason) {
      throw new BadRequestException('A suspension reason is required.');
    }

    const updated = await this.prisma.hotel.update({
      where: { id: hotelId },
      data: {
        suspendedAt: new Date(),
        suspensionReason: reason,
      },
      select: {
        id: true,
        name: true,
        suspendedAt: true,
        suspensionReason: true,
        onboardingStatus: true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        hotelId,
        actorUserId,
        action: 'platform.hotel.suspend',
        targetType: 'HOTEL',
        targetId: hotelId,
        metadata: {
          hotelName: updated.name,
          reason: updated.suspensionReason,
          confirmationName: dto.confirmationName.trim(),
        },
      },
    });

    return updated;
  }

  async reactivateHotel(actorUserId: string, hotelId: string, dto: UpdatePlatformHotelLifecycleDto) {
    const hotel = await this.prisma.hotel.findUnique({
      where: { id: hotelId },
      select: { id: true, name: true, suspendedAt: true, onboardingStatus: true, deletedAt: true },
    });

    if (!hotel) {
      throw new NotFoundException('Hotel not found.');
    }

    if (!hotel.suspendedAt) {
      throw new BadRequestException('Hotel is not suspended.');
    }

    if (hotel.deletedAt) {
      throw new BadRequestException('Restore this hotel before reactivating it.');
    }

    if (dto.confirmationName.trim() !== hotel.name) {
      throw new BadRequestException('Confirmation name did not match the hotel name.');
    }

    const reason = normalizeOptional(dto.reason);

    const updated = await this.prisma.hotel.update({
      where: { id: hotelId },
      data: {
        suspendedAt: null,
        suspensionReason: reason,
      },
      select: {
        id: true,
        name: true,
        suspendedAt: true,
        suspensionReason: true,
      },
    });

    const syncedHotel = await this.hotelLifecycleService.syncOnboardingStatus(hotelId);

    await this.prisma.auditLog.create({
      data: {
        hotelId,
        actorUserId,
        action: 'platform.hotel.reactivate',
        targetType: 'HOTEL',
        targetId: hotelId,
        metadata: {
          hotelName: updated.name,
          note: reason,
          confirmationName: dto.confirmationName.trim(),
        },
      },
    });

    return {
      ...updated,
      onboardingStatus: syncedHotel.onboardingStatus,
    };
  }

  async softDeleteHotel(actorUserId: string, hotelId: string, dto: UpdatePlatformHotelLifecycleDto) {
    const hotel = await this.prisma.hotel.findUnique({
      where: { id: hotelId },
      select: {
        id: true,
        name: true,
        suspendedAt: true,
        suspensionReason: true,
        deletedAt: true,
        purgeAfterAt: true,
        onboardingStatus: true,
      },
    });

    if (!hotel) {
      throw new NotFoundException('Hotel not found.');
    }

    if (hotel.deletedAt) {
      throw new BadRequestException('Hotel is already soft-deleted.');
    }

    if (dto.confirmationName.trim() !== hotel.name) {
      throw new BadRequestException('Confirmation name did not match the hotel name.');
    }

    const reason = normalizeOptional(dto.reason);
    if (!reason) {
      throw new BadRequestException('A soft-delete reason is required.');
    }

    const now = new Date();
    const purgeAfter = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const updated = await this.prisma.hotel.update({
      where: { id: hotelId },
      data: {
        deletedAt: now,
        purgeAfterAt: purgeAfter,
        suspendedAt: hotel.suspendedAt ?? now,
        suspensionReason: hotel.suspensionReason ?? reason,
      },
      select: {
        id: true,
        name: true,
        suspendedAt: true,
        suspensionReason: true,
        deletedAt: true,
        purgeAfterAt: true,
        onboardingStatus: true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        hotelId,
        actorUserId,
        action: 'platform.hotel.soft_delete',
        targetType: 'HOTEL',
        targetId: hotelId,
        metadata: {
          hotelName: updated.name,
          reason,
          confirmationName: dto.confirmationName.trim(),
          purgeAfterAt: updated.purgeAfterAt,
        },
      },
    });

    return updated;
  }

  async restoreHotel(actorUserId: string, hotelId: string, dto: UpdatePlatformHotelLifecycleDto) {
    const hotel = await this.prisma.hotel.findUnique({
      where: { id: hotelId },
      select: {
        id: true,
        name: true,
        deletedAt: true,
        purgeAfterAt: true,
        suspendedAt: true,
        onboardingStatus: true,
      },
    });

    if (!hotel) {
      throw new NotFoundException('Hotel not found.');
    }

    if (!hotel.deletedAt) {
      throw new BadRequestException('Hotel is not soft-deleted.');
    }

    if (dto.confirmationName.trim() !== hotel.name) {
      throw new BadRequestException('Confirmation name did not match the hotel name.');
    }

    const note = normalizeOptional(dto.reason);

    const updated = await this.prisma.hotel.update({
      where: { id: hotelId },
      data: {
        deletedAt: null,
        purgeAfterAt: null,
      },
      select: {
        id: true,
        name: true,
        suspendedAt: true,
        suspensionReason: true,
        deletedAt: true,
        purgeAfterAt: true,
      },
    });

    const syncedHotel = await this.hotelLifecycleService.syncOnboardingStatus(hotelId);

    await this.prisma.auditLog.create({
      data: {
        hotelId,
        actorUserId,
        action: 'platform.hotel.restore',
        targetType: 'HOTEL',
        targetId: hotelId,
        metadata: {
          hotelName: updated.name,
          note,
          confirmationName: dto.confirmationName.trim(),
        },
      },
    });

    return {
      ...updated,
      onboardingStatus: syncedHotel.onboardingStatus,
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

  async getAuditLogs(params: {
    page?: number;
    limit?: number;
    action?: string;
    actor?: string;
    hotel?: string;
    targetUser?: string;
    search?: string;
  }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(Math.max(params.limit ?? 20, 5), 100);
    const skip = (page - 1) * limit;

    const where = {
      ...(params.action ? { action: { contains: params.action, mode: 'insensitive' as const } } : {}),
      ...(params.actor ? { actor: { email: { contains: params.actor, mode: 'insensitive' as const } } } : {}),
      ...(params.hotel ? { hotel: { name: { contains: params.hotel, mode: 'insensitive' as const } } } : {}),
      ...(params.targetUser
        ? { targetUser: { email: { contains: params.targetUser, mode: 'insensitive' as const } } }
        : {}),
      ...(params.search
        ? {
            OR: [
              { action: { contains: params.search, mode: 'insensitive' as const } },
              { actor: { email: { contains: params.search, mode: 'insensitive' as const } } },
              { hotel: { name: { contains: params.search, mode: 'insensitive' as const } } },
              { targetUser: { email: { contains: params.search, mode: 'insensitive' as const } } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          hotel: { select: { id: true, name: true } },
          actor: {
            select: {
              id: true,
              email: true,
              role: true,
              staff: { select: { firstName: true, lastName: true } },
            },
          },
          targetUser: {
            select: {
              id: true,
              email: true,
              staff: { select: { firstName: true, lastName: true } },
            },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      logs: rows.map((row) => ({
        id: row.id,
        action: row.action,
        targetType: row.targetType ?? null,
        targetId: row.targetId ?? null,
        createdAt: row.createdAt,
        ipAddress: row.ipAddress ?? null,
        userAgent: row.userAgent ?? null,
        metadata: row.metadata ?? null,
        hotel: row.hotel ? { id: row.hotel.id, name: row.hotel.name } : null,
        actor: {
          id: row.actor.id,
          email: row.actor.email,
          role: row.actor.role,
          name: row.actor.staff
            ? `${row.actor.staff.firstName} ${row.actor.staff.lastName}`.trim()
            : row.actor.email,
        },
        targetUser: row.targetUser
          ? {
              id: row.targetUser.id,
              email: row.targetUser.email,
              name: row.targetUser.staff
                ? `${row.targetUser.staff.firstName} ${row.targetUser.staff.lastName}`.trim()
                : row.targetUser.email,
            }
          : null,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
