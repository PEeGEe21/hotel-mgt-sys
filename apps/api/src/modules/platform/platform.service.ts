import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { randomInt } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePlatformHotelOnboardingDto } from './dtos/create-platform-hotel-onboarding.dto';
import { CreatePlatformSuperAdminDto } from './dtos/create-platform-super-admin.dto';
import { HotelLifecycleService } from '../hotel-lifecycle/hotel-lifecycle.service';
import { UpdatePlatformHotelDto } from './dtos/update-platform-hotel.dto';
import { UpdatePlatformHotelLifecycleDto } from './dtos/update-platform-hotel-lifecycle.dto';
import { EmailService } from '../../common/email/email.service';
import { CreateSubscriptionPlanDto } from './dtos/create-subscription-plan.dto';
import { UpdateSubscriptionPlanDto } from './dtos/update-subscription-plan.dto';
import { UpdateHotelSubscriptionDto } from './dtos/update-hotel-subscription.dto';
import { UpdatePlanEntitlementsDto } from './dtos/update-plan-entitlements.dto';
import { UpdateHotelFeatureFlagDto } from './dtos/update-hotel-feature-flag.dto';
import { CreateFeatureFlagDto } from './dtos/create-feature-flag.dto';
import { RedisCacheService } from '../../common/redis/redis-cache.service';
import { EntitlementsService, HotelEntitlementSnapshot } from '../entitlements/entitlements.service';
import { CreateSupportCaseDto } from './dtos/create-support-case.dto';
import { UpdateSupportCaseDto } from './dtos/update-support-case.dto';
import { CreateSupportCommentDto } from './dtos/create-support-comment.dto';

type ListHotelsParams = {
  page?: number;
  limit?: number;
  search?: string;
  all?: boolean;
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

type PlatformKeycardProviderMode = 'mock' | 'live';

const ADMIN_ROLE = 'ADMIN';
const OVERDUE_PAYMENT_STATUSES = ['UNPAID', 'PARTIAL'] as const;
const SUPPORT_CASE_STATUSES = [
  'OPEN',
  'TRIAGED',
  'IN_PROGRESS',
  'WAITING_ON_HOTEL',
  'RESOLVED',
  'CLOSED',
] as const;
const SUPPORT_CASE_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
const SUPPORT_COMMENT_VISIBILITIES = ['INTERNAL', 'HOTEL_VISIBLE'] as const;

function normalizeOptional(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function humanizeMachineValue(value: string) {
  return value
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function parseOptionalDate(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException(`Invalid date: ${value}`);
  }
  return parsed;
}

function normalizeEnumValue<T extends readonly string[]>(
  value: string | null | undefined,
  allowed: T,
  fieldName: string,
): T[number] | null {
  if (value === undefined || value === null) return null;
  const normalized = value.trim().toUpperCase();
  if (!normalized) return null;
  if (!allowed.includes(normalized as T[number])) {
    throw new BadRequestException(`Invalid ${fieldName}: ${value}`);
  }
  return normalized as T[number];
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
    private readonly email: EmailService,
    private readonly cache: RedisCacheService,
    private readonly entitlementsService: EntitlementsService,
  ) {}

  private normalizeLockVendor(vendor?: string | null) {
    const normalized = vendor?.trim().toUpperCase();
    return normalized || null;
  }

  private deriveKeycardProviderMode(vendor?: string | null): PlatformKeycardProviderMode {
    return this.normalizeLockVendor(vendor) && this.normalizeLockVendor(vendor) !== 'MOCK'
      ? 'live'
      : 'mock';
  }

  private buildKeycardAccessDiagnosis(args: {
    result: string;
    hasConfigurationIssues: boolean;
  }) {
    if (['REVOKED', 'EXPIRED'].includes(args.result)) return 'lifecycle';
    if (['UNKNOWN', 'DENIED'].includes(args.result) && args.hasConfigurationIssues) {
      return 'configuration';
    }
    if (['DENIED', 'LOST'].includes(args.result)) return 'lifecycle';
    return 'unknown';
  }

  private getTenantAppUrl(hotelDomain?: string | null) {
    const baseUrl =
      process.env.FRONTEND_URL ||
      process.env.NEXT_PUBLIC_WEB_APP_URL ||
      'http://localhost:3000';

    if (!hotelDomain) return baseUrl;

    try {
      const url = new URL(baseUrl);
      url.hostname = hotelDomain.includes('.') ? hotelDomain : `${hotelDomain}.${url.hostname}`;
      return url.toString().replace(/\/$/, '');
    } catch {
      return baseUrl;
    }
  }

  private getPlatformAdminUrl() {
    return (
      process.env.PLATFORM_ADMIN_URL ||
      process.env.NEXT_PUBLIC_PLATFORM_ADMIN_URL ||
      process.env.ADMIN_APP_URL ||
      'http://localhost:3001'
    ).replace(/\/$/, '');
  }

  private async sendTenantAdminOnboardingEmail(params: {
    hotelId: string;
    hotelName: string;
    hotelDomain: string | null;
    recipientEmail: string;
    recipientName: string;
    temporaryPassword: string;
  }) {
    const signInUrl = this.getTenantAppUrl(params.hotelDomain);

    await this.email.sendEmail({
      to: params.recipientEmail,
      hotelId: params.hotelId,
      event: 'platform.hotel.initial_admin_created',
      subject: `Your ${params.hotelName} admin account is ready`,
      text: `Hello ${params.recipientName},\n\nYour ${params.hotelName} admin account has been created.\n\nSign-in URL: ${signInUrl}\nEmail: ${params.recipientEmail}\nTemporary password: ${params.temporaryPassword}\n\nYou will be asked to change your password on first sign-in.`,
      html: `
        <p>Hello ${params.recipientName},</p>
        <p>Your <strong>${params.hotelName}</strong> admin account has been created.</p>
        <p><strong>Sign-in URL:</strong> <a href="${signInUrl}">${signInUrl}</a></p>
        <p><strong>Email:</strong> ${params.recipientEmail}</p>
        <p><strong>Temporary password:</strong> ${params.temporaryPassword}</p>
        <p>You will be asked to change your password on first sign-in.</p>
      `,
      metadata: {
        hotelName: params.hotelName,
        recipientEmail: params.recipientEmail,
      },
    });
  }

  private async sendSuperAdminWelcomeEmail(params: {
    recipientEmail: string;
    recipientName: string;
    temporaryPassword: string;
  }) {
    const signInUrl = `${this.getPlatformAdminUrl()}/login`;

    await this.email.sendEmail({
      to: params.recipientEmail,
      hotelId: null,
      event: 'platform.super_admin.created',
      subject: 'Your HotelOS platform admin account is ready',
      text: `Hello ${params.recipientName},\n\nA HotelOS super admin account has been created for you.\n\nSign-in URL: ${signInUrl}\nEmail: ${params.recipientEmail}\nTemporary password: ${params.temporaryPassword}\n\nYou will complete MFA setup the first time you sign in.`,
      html: `
        <p>Hello ${params.recipientName},</p>
        <p>A HotelOS super admin account has been created for you.</p>
        <p><strong>Sign-in URL:</strong> <a href="${signInUrl}">${signInUrl}</a></p>
        <p><strong>Email:</strong> ${params.recipientEmail}</p>
        <p><strong>Temporary password:</strong> ${params.temporaryPassword}</p>
        <p>You will complete MFA setup the first time you sign in.</p>
      `,
      metadata: {
        recipientEmail: params.recipientEmail,
      },
    });
  }

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

  private async getLatestHotelSubscriptions(hotelIds: string[]) {
    if (hotelIds.length === 0) return new Map<string, any>();

    const rows = await (this.prisma as any).hotelSubscription.findMany({
      where: {
        hotelId: {
          in: hotelIds,
        },
      },
      orderBy: [{ updatedAt: 'desc' }],
      include: {
        plan: true,
      },
    });

    const latestByHotel = new Map<string, any>();
    for (const row of rows) {
      if (!latestByHotel.has(row.hotelId)) {
        latestByHotel.set(row.hotelId, row);
      }
    }

    return latestByHotel;
  }

  private async resolveHotelEntitlementsInternal(hotelId: string): Promise<HotelEntitlementSnapshot> {
    return this.entitlementsService.resolveHotelEntitlements(hotelId);
  }

  private async invalidateDashboardFeatureFlagsForHotel(hotelId: string) {
    await this.cache.del(`dashboard:feature-flags:${hotelId}`);
  }

  private async invalidateDashboardFeatureFlagsForPlan(planId: string) {
    const subscriptions = await (this.prisma as any).hotelSubscription.findMany({
      where: { planId },
      select: { hotelId: true },
      distinct: ['hotelId'],
    });

    await Promise.all(
      subscriptions.map((subscription: { hotelId: string }) =>
        this.invalidateDashboardFeatureFlagsForHotel(subscription.hotelId),
      ),
    );
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

    const result = await this.prisma.$transaction(async (tx) => {
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

    await this.sendTenantAdminOnboardingEmail({
      hotelId: result.hotel.id,
      hotelName: result.hotel.name,
      hotelDomain: domain ?? null,
      recipientEmail: result.admin.email,
      recipientName: result.admin.name,
      temporaryPassword,
    });

    return result;
  }

  async getStats() {
    type FailureGroup = {
      hotelId: string;
      _count?: {
        _all?: number | null;
      } | null;
    };
    type MissingMappingHotel = {
      id: string;
      name: string;
      totalRooms: number;
      missingRooms: number;
    };
    type DenialSpikeHotel = {
      id: string;
      name: string;
      deniedEvents24h: number;
    };

    const now = Date.now();
    const last24Hours = new Date(now - 24 * 60 * 60 * 1000);
    const last30Days = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const [
      totalHotels,
      totalUsers,
      activeUsers,
      recentLogins,
      recentReservations,
      staleHotels,
      suspendedHotels,
      keycardHotels,
      recentKeycardFailures,
    ] =
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
        this.prisma.hotel.findMany({
          where: { keycardAuthEnabled: true },
          select: {
            id: true,
            name: true,
            lockVendor: true,
            rooms: {
              select: {
                id: true,
                lockDeviceId: true,
              },
            },
          },
        }),
        (this.prisma as any).keycardAccessLog.groupBy({
          by: ['hotelId'],
          where: {
            hotelId: { not: null },
            createdAt: { gte: last24Hours },
            result: { not: 'GRANTED' },
          },
          _count: {
            _all: true,
          },
        }),
      ]);

    const enabledHotels = keycardHotels.length;
    const mockProviderHotels = keycardHotels.filter(
      (hotel) => this.deriveKeycardProviderMode(hotel.lockVendor) === 'mock',
    ).length;
    const liveProviderHotels = enabledHotels - mockProviderHotels;
    const missingMappingHotels: MissingMappingHotel[] = keycardHotels
      .map((hotel) => {
        const totalRooms = hotel.rooms.length;
        const mappedRooms = hotel.rooms.filter((room) => Boolean(room.lockDeviceId)).length;
        return {
          id: hotel.id,
          name: hotel.name,
          totalRooms,
          missingRooms: Math.max(0, totalRooms - mappedRooms),
        };
      })
      .filter((hotel) => hotel.missingRooms > 0);
    const failureGroups = recentKeycardFailures as FailureGroup[];
    const failureEvents24h = failureGroups.reduce(
      (sum, item) => sum + (item._count?._all ?? 0),
      0,
    );
    const failureHotelIds = failureGroups
      .map((item) => item.hotelId)
      .filter(Boolean);
    const failureHotelsById = failureHotelIds.length
      ? await this.prisma.hotel.findMany({
          where: { id: { in: failureHotelIds } },
          select: { id: true, name: true },
        })
      : [];
    const failureHotelMap = new Map(failureHotelsById.map((hotel) => [hotel.id, hotel.name]));
    const denialSpikeHotels: DenialSpikeHotel[] = failureGroups
      .map((item) => ({
        id: item.hotelId,
        name: failureHotelMap.get(item.hotelId) ?? 'Unknown hotel',
        deniedEvents24h: item._count?._all ?? 0,
      }))
      .filter((hotel) => hotel.id && hotel.deniedEvents24h >= 3)
      .sort((a, b) => b.deniedEvents24h - a.deniedEvents24h)
      .slice(0, 5);

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
      keycards: {
        enabledHotels,
        mockProviderHotels,
        liveProviderHotels,
        hotelsWithMissingRoomLockMappings: missingMappingHotels.length,
        recentFailureEvents24h: failureEvents24h,
        denialSpikeHotels,
        missingMappingHotels: missingMappingHotels.slice(0, 5),
      },
      generatedAt: new Date().toISOString(),
    };
  }

  async getSubscriptionsOverview() {
    const [plans, hotels, subscriptions] = await Promise.all([
      (this.prisma as any).subscriptionPlan.findMany({
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.hotel.findMany({
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
        },
      }),
      (this.prisma as any).hotelSubscription.findMany({
        orderBy: [{ updatedAt: 'desc' }],
        include: {
          hotel: {
            select: {
              id: true,
              name: true,
            },
          },
          plan: true,
        },
      }),
    ]);

    const latestByHotel = new Map<string, any>();
    for (const subscription of subscriptions) {
      if (!latestByHotel.has(subscription.hotelId)) {
        latestByHotel.set(subscription.hotelId, subscription);
      }
    }

    const assignments = hotels.map((hotel) => {
      const subscription = latestByHotel.get(hotel.id) ?? null;
      return {
        id: subscription?.id ?? `none:${hotel.id}`,
        hotelId: hotel.id,
        hotelName: hotel.name,
        planId: subscription?.plan?.id ?? null,
        planCode: subscription?.plan?.code ?? null,
        planName: subscription?.plan?.name ?? null,
        status: subscription?.status ?? 'NONE',
        startsAt: subscription?.startsAt?.toISOString() ?? null,
        endsAt: subscription?.endsAt?.toISOString() ?? null,
        trialEndsAt: subscription?.trialEndsAt?.toISOString() ?? null,
        graceEndsAt: subscription?.graceEndsAt?.toISOString() ?? null,
        billingEmail: subscription?.billingEmail ?? null,
        billingContactName: subscription?.billingContactName ?? null,
      };
    });

    const statusCounts = assignments.reduce<Record<string, number>>((acc, assignment) => {
      acc[assignment.status] = (acc[assignment.status] ?? 0) + 1;
      return acc;
    }, {});

    const planCounts = assignments.reduce<Record<string, { total: number; active: number }>>((acc, assignment) => {
      if (!assignment.planId) return acc;
      const entry = acc[assignment.planId] ?? { total: 0, active: 0 };
      entry.total += 1;
      if (assignment.status === 'ACTIVE' || assignment.status === 'TRIAL' || assignment.status === 'GRACE') {
        entry.active += 1;
      }
      acc[assignment.planId] = entry;
      return acc;
    }, {});

    return {
      plans: plans.map((plan: any) => ({
        id: plan.id,
        code: plan.code,
        name: plan.name,
        description: plan.description ?? null,
        priceMonthly: plan.priceMonthly !== null ? Number(plan.priceMonthly) : null,
        priceYearly: plan.priceYearly !== null ? Number(plan.priceYearly) : null,
        billingIntervalOptions: plan.billingIntervalOptions ?? [],
        isActive: plan.isActive,
        isPublic: plan.isPublic,
        sortOrder: plan.sortOrder,
        hotelCount: planCounts[plan.id]?.total ?? 0,
        activeHotelCount: planCounts[plan.id]?.active ?? 0,
      })),
      assignments,
      statusCounts,
    };
  }

  async createSubscriptionPlan(actorUserId: string, dto: CreateSubscriptionPlanDto) {
    const code = dto.code.trim().toUpperCase();
    const existing = await (this.prisma as any).subscriptionPlan.findUnique({
      where: { code },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('A subscription plan with this code already exists.');
    }

    const plan = await (this.prisma as any).subscriptionPlan.create({
      data: {
        code,
        name: dto.name.trim(),
        description: normalizeOptional(dto.description),
        priceMonthly: dto.priceMonthly ?? null,
        priceYearly: dto.priceYearly ?? null,
        billingIntervalOptions:
          dto.billingIntervalOptions?.length
            ? dto.billingIntervalOptions.map((entry) => entry.trim().toUpperCase()).filter(Boolean)
            : ['MONTHLY', 'YEARLY'],
        isActive: dto.isActive ?? true,
        isPublic: dto.isPublic ?? false,
        sortOrder: dto.sortOrder ?? 0,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        hotelId: null,
        actorUserId,
        action: 'platform.subscription_plan.create',
        targetType: 'SUBSCRIPTION_PLAN',
        targetId: plan.id,
        metadata: {
          code: plan.code,
          name: plan.name,
        },
      },
    });

    return this.getSubscriptionsOverview();
  }

  async updateSubscriptionPlan(actorUserId: string, planId: string, dto: UpdateSubscriptionPlanDto) {
    const plan = await (this.prisma as any).subscriptionPlan.findUnique({
      where: { id: planId },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        priceMonthly: true,
        priceYearly: true,
        billingIntervalOptions: true,
        isActive: true,
        isPublic: true,
        sortOrder: true,
      },
    });
    if (!plan) {
      throw new NotFoundException('Subscription plan not found.');
    }

    const code = dto.code !== undefined ? dto.code.trim().toUpperCase() : undefined;
    if (code && code !== plan.code) {
      const existing = await (this.prisma as any).subscriptionPlan.findUnique({
        where: { code },
        select: { id: true },
      });
      if (existing && existing.id !== planId) {
        throw new ConflictException('A subscription plan with this code already exists.');
      }
    }

    const data = {
      ...(code !== undefined ? { code } : {}),
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.description !== undefined ? { description: normalizeOptional(dto.description) } : {}),
      ...(dto.priceMonthly !== undefined ? { priceMonthly: dto.priceMonthly } : {}),
      ...(dto.priceYearly !== undefined ? { priceYearly: dto.priceYearly } : {}),
      ...(dto.billingIntervalOptions !== undefined
        ? {
            billingIntervalOptions: dto.billingIntervalOptions
              .map((entry) => entry.trim().toUpperCase())
              .filter(Boolean),
          }
        : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      ...(dto.isPublic !== undefined ? { isPublic: dto.isPublic } : {}),
      ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
    };

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('Provide at least one plan field to update.');
    }

    await (this.prisma as any).subscriptionPlan.update({
      where: { id: planId },
      data,
    });

    await this.prisma.auditLog.create({
      data: {
        hotelId: null,
        actorUserId,
        action: 'platform.subscription_plan.update',
        targetType: 'SUBSCRIPTION_PLAN',
        targetId: planId,
        metadata: {
          before: plan,
          changedFields: Object.keys(data),
        },
      },
    });

    return this.getSubscriptionsOverview();
  }

  async updatePlanEntitlements(actorUserId: string, planId: string, dto: UpdatePlanEntitlementsDto) {
    const plan = await (this.prisma as any).subscriptionPlan.findUnique({
      where: { id: planId },
      select: { id: true, code: true, name: true },
    });
    if (!plan) {
      throw new NotFoundException('Subscription plan not found.');
    }

    const normalizedEntries = dto.entitlements.map((entry) => ({
      flagKey: entry.flagKey.trim(),
      enabled: entry.enabled,
      limitValue: normalizeOptional(entry.limitValue),
    }));
    const uniqueKeys = new Set(normalizedEntries.map((entry) => entry.flagKey));
    if (uniqueKeys.size !== normalizedEntries.length) {
      throw new BadRequestException('Duplicate feature keys are not allowed in one entitlement update.');
    }

    const flags = await (this.prisma as any).featureFlag.findMany({
      where: {
        key: {
          in: normalizedEntries.map((entry) => entry.flagKey),
        },
      },
      select: { key: true },
    });
    if (flags.length !== normalizedEntries.length) {
      const known = new Set(flags.map((flag: { key: string }) => flag.key));
      const missing = normalizedEntries
        .map((entry) => entry.flagKey)
        .filter((flagKey) => !known.has(flagKey));
      throw new NotFoundException(`Unknown feature flag(s): ${missing.join(', ')}`);
    }

    const existing = await (this.prisma as any).planFeatureEntitlement.findMany({
      where: { planId },
      orderBy: [{ flagKey: 'asc' }],
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.planFeatureEntitlement.deleteMany({
        where: {
          planId,
          ...(normalizedEntries.length
            ? {
                flagKey: {
                  notIn: normalizedEntries.map((entry) => entry.flagKey),
                },
              }
            : {}),
        },
      });

      for (const entry of normalizedEntries) {
        await (tx as any).planFeatureEntitlement.upsert({
          where: {
            planId_flagKey: {
              planId,
              flagKey: entry.flagKey,
            },
          },
          update: {
            enabled: entry.enabled,
            limitValue: entry.limitValue,
          },
          create: {
            planId,
            flagKey: entry.flagKey,
            enabled: entry.enabled,
            limitValue: entry.limitValue,
          },
        });
      }
    });

    await this.prisma.auditLog.create({
      data: {
        hotelId: null,
        actorUserId,
        action: 'platform.subscription_plan.entitlements.update',
        targetType: 'SUBSCRIPTION_PLAN',
        targetId: planId,
        metadata: {
          planCode: plan.code,
          planName: plan.name,
          before: existing.map((entry: any) => ({
            flagKey: entry.flagKey,
            enabled: entry.enabled,
            limitValue: entry.limitValue ?? null,
          })),
          after: normalizedEntries,
        },
      },
    });

    await this.invalidateDashboardFeatureFlagsForPlan(planId);

    return this.getFeatureCatalogOverview();
  }

  async getFeatureCatalogOverview() {
    const [flags, plans, overrides, recentChanges] = await Promise.all([
      (this.prisma as any).featureFlag.findMany({
        orderBy: [{ category: 'asc' }, { key: 'asc' }],
        include: {
          planEntitlements: {
            include: {
              plan: true,
            },
          },
        },
      }),
      (this.prisma as any).subscriptionPlan.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
      (this.prisma as any).hotelFeatureOverride.findMany(),
      (this.prisma.auditLog as any).findMany({
        where: {
          action: {
            in: ['platform.subscription_plan.entitlements.update', 'platform.hotel.feature_override.update'],
          },
        },
        orderBy: [{ createdAt: 'desc' }],
        take: 12,
        include: {
          hotel: { select: { id: true, name: true } },
          actor: {
            select: {
              id: true,
              email: true,
              staff: { select: { firstName: true, lastName: true } },
            },
          },
        },
      }),
    ]);

    const overrideCounts = overrides.reduce((acc: Record<string, number>, override: any) => {
      acc[override.flagKey] = (acc[override.flagKey] ?? 0) + 1;
      return acc;
    }, {});

    return {
      features: flags.map((flag: any) => ({
        key: flag.key,
        name: flag.name ?? null,
        description: flag.description ?? null,
        category: flag.category ?? null,
        defaultEnabled: flag.defaultEnabled !== false,
        globalEnabled: flag.enabled !== false,
        scopeType: flag.scopeType,
        rolloutStage: flag.rolloutStage,
        planRequired: flag.planRequired ?? null,
        planAssignments: flag.planEntitlements.map((entry: any) => ({
          planId: entry.plan.id,
          planCode: entry.plan.code,
          planName: entry.plan.name,
          enabled: entry.enabled,
          limitValue: entry.limitValue ?? null,
        })),
        overrideCount: overrideCounts[flag.key] ?? 0,
      })),
      plans: plans.map((plan: any) => ({
        id: plan.id,
        code: plan.code,
        name: plan.name,
      })),
      recentChanges: recentChanges.map((entry: any) => ({
        id: entry.id,
        action: entry.action,
        createdAt: entry.createdAt,
        hotel: entry.hotel ? { id: entry.hotel.id, name: entry.hotel.name } : null,
        actorName: entry.actor?.staff
          ? `${entry.actor.staff.firstName} ${entry.actor.staff.lastName}`.trim()
          : entry.actor?.email ?? 'Unknown actor',
        summary:
          entry.action === 'platform.subscription_plan.entitlements.update'
            ? `Updated plan entitlements for ${String((entry.metadata as any)?.planCode ?? 'a plan')}.`
            : `Updated hotel feature override for ${entry.hotel?.name ?? 'a hotel'}.`,
        metadata: entry.metadata ?? null,
      })),
      totals: {
        features: flags.length,
        hotelOverrides: overrides.length,
      },
    };
  }

  async createFeatureFlag(actorUserId: string, dto: CreateFeatureFlagDto) {
    const key = dto.key.trim().toLowerCase();
    if (!key) {
      throw new BadRequestException('Feature key is required.');
    }

    const existing = await (this.prisma as any).featureFlag.findUnique({
      where: { key },
      select: { key: true },
    });
    if (existing) {
      throw new ConflictException('A feature with this key already exists.');
    }

    const created = await (this.prisma as any).featureFlag.create({
      data: {
        key,
        name: normalizeOptional(dto.name),
        description: normalizeOptional(dto.description),
        category: normalizeOptional(dto.category),
        enabled: dto.enabled ?? true,
        defaultEnabled: dto.defaultEnabled ?? true,
        planRequired: normalizeOptional(dto.planRequired),
        scopeType: dto.scopeType ?? 'MODULE',
        rolloutStage: dto.rolloutStage ?? 'GA',
      },
    });

    await this.prisma.auditLog.create({
      data: {
        hotelId: null,
        actorUserId,
        action: 'platform.feature_flag.create',
        targetType: 'FEATURE_FLAG',
        targetId: created.key,
        metadata: {
          key: created.key,
          name: created.name ?? null,
          category: created.category ?? null,
          scopeType: created.scopeType,
          rolloutStage: created.rolloutStage,
        },
      },
    });

    return this.getFeatureCatalogOverview();
  }

  private async assertSupportAssignee(assignedAdminId: string | null | undefined) {
    if (!assignedAdminId) return null;
    const admin = await this.prisma.user.findUnique({
      where: { id: assignedAdminId },
      select: {
        id: true,
        email: true,
        role: true,
        staff: { select: { firstName: true, lastName: true } },
      },
    });
    if (!admin || admin.role !== 'SUPER_ADMIN') {
      throw new NotFoundException('Assigned support admin not found.');
    }
    return admin;
  }

  private async createSupportEvent(
    tx: any,
    caseId: string,
    actorUserId: string | null,
    type: string,
    payload?: Record<string, unknown> | null,
  ) {
    await tx.supportCaseEvent.create({
      data: {
        caseId,
        actorUserId,
        type,
        payload: payload ? (payload as any) : undefined,
      },
    });
  }

  async createSupportCase(actorUserId: string, dto: CreateSupportCaseDto) {
    const hotel = await this.prisma.hotel.findUnique({
      where: { id: dto.hotelId },
      select: { id: true, name: true },
    });
    if (!hotel) {
      throw new NotFoundException('Hotel not found.');
    }

    const priority = normalizeEnumValue(dto.priority ?? 'MEDIUM', SUPPORT_CASE_PRIORITIES, 'priority') ?? 'MEDIUM';
    const assignedAdmin = await this.assertSupportAssignee(dto.assignedAdminId ?? null);
    const [entitlements, subscription] = await Promise.all([
      this.resolveHotelEntitlementsInternal(dto.hotelId),
      (this.prisma as any).hotelSubscription.findFirst({
        where: { hotelId: dto.hotelId },
        orderBy: [{ updatedAt: 'desc' }],
        include: { plan: true },
      }),
    ]);

    const created = await this.prisma.$transaction(async (tx) => {
      const supportCase = await (tx as any).supportCase.create({
        data: {
          hotelId: dto.hotelId,
          createdByUserId: actorUserId,
          source: 'PLATFORM',
          category: dto.category.trim(),
          priority,
          status: 'OPEN',
          subject: dto.subject.trim(),
          description: dto.description.trim(),
          assignedAdminId: assignedAdmin?.id ?? null,
          subscriptionSnapshot: subscription
            ? {
                status: subscription.status,
                planId: subscription.planId ?? null,
                planCode: subscription.plan?.code ?? null,
                planName: subscription.plan?.name ?? null,
              }
            : null,
          entitlementSnapshot: entitlements as any,
        },
      });

      await this.createSupportEvent(tx, supportCase.id, actorUserId, 'CASE_CREATED', {
        hotelName: hotel.name,
        priority,
        assignedAdminId: assignedAdmin?.id ?? null,
      });

      if (assignedAdmin) {
        await this.createSupportEvent(tx, supportCase.id, actorUserId, 'ASSIGNED', {
          assignedAdminId: assignedAdmin.id,
          assignedAdminName: assignedAdmin.staff
            ? `${assignedAdmin.staff.firstName} ${assignedAdmin.staff.lastName}`.trim()
            : assignedAdmin.email,
        });
      }

      return supportCase;
    });

    await this.prisma.auditLog.create({
      data: {
        hotelId: dto.hotelId,
        actorUserId,
        action: 'platform.support.case.create',
        targetType: 'SUPPORT_CASE',
        targetId: created.id,
        metadata: {
          hotelName: hotel.name,
          subject: created.subject,
          category: created.category,
          priority: created.priority,
        },
      },
    });

    return this.getSupportCaseDetail(created.id);
  }

  async updateSupportCase(actorUserId: string, caseId: string, dto: UpdateSupportCaseDto) {
    const supportCase = await (this.prisma as any).supportCase.findUnique({
      where: { id: caseId },
      include: {
        hotel: { select: { id: true, name: true } },
        assignedAdmin: {
          select: {
            id: true,
            email: true,
            staff: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });
    if (!supportCase) {
      throw new NotFoundException('Support case not found.');
    }

    const status = normalizeEnumValue(dto.status, SUPPORT_CASE_STATUSES, 'status');
    const priority = normalizeEnumValue(dto.priority, SUPPORT_CASE_PRIORITIES, 'priority');
    const assignedAdmin =
      dto.assignedAdminId !== undefined
        ? await this.assertSupportAssignee(dto.assignedAdminId ? dto.assignedAdminId : null)
        : undefined;

    const data = {
      ...(dto.category !== undefined ? { category: dto.category.trim() } : {}),
      ...(priority !== null ? { priority } : {}),
      ...(status !== null ? { status } : {}),
      ...(dto.subject !== undefined ? { subject: dto.subject.trim() } : {}),
      ...(dto.description !== undefined ? { description: dto.description.trim() } : {}),
      ...(dto.assignedAdminId !== undefined ? { assignedAdminId: assignedAdmin?.id ?? null } : {}),
    };

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('Provide at least one support case field to update.');
    }

    await this.prisma.$transaction(async (tx) => {
      await (tx as any).supportCase.update({
        where: { id: caseId },
        data,
      });

      if (status !== null && status !== supportCase.status) {
        await this.createSupportEvent(tx, caseId, actorUserId, 'STATUS_CHANGED', {
          from: supportCase.status,
          to: status,
        });
      }

      if (priority !== null && priority !== supportCase.priority) {
        await this.createSupportEvent(tx, caseId, actorUserId, 'PRIORITY_CHANGED', {
          from: supportCase.priority,
          to: priority,
        });
      }

      if (dto.assignedAdminId !== undefined) {
        await this.createSupportEvent(tx, caseId, actorUserId, assignedAdmin ? 'ASSIGNED' : 'UNASSIGNED', {
          from: supportCase.assignedAdminId,
          to: assignedAdmin?.id ?? null,
        });
      }
    });

    await this.prisma.auditLog.create({
      data: {
        hotelId: supportCase.hotelId,
        actorUserId,
        action: 'platform.support.case.update',
        targetType: 'SUPPORT_CASE',
        targetId: caseId,
        metadata: {
          hotelName: supportCase.hotel.name,
          changedFields: Object.keys(data),
          status: status ?? undefined,
          priority: priority ?? undefined,
          assignedAdminId: dto.assignedAdminId !== undefined ? assignedAdmin?.id ?? null : undefined,
        },
      },
    });

    return this.getSupportCaseDetail(caseId);
  }

  async addSupportCaseComment(actorUserId: string, caseId: string, dto: CreateSupportCommentDto) {
    const supportCase = await (this.prisma as any).supportCase.findUnique({
      where: { id: caseId },
      select: {
        id: true,
        hotelId: true,
        hotel: { select: { name: true } },
      },
    });
    if (!supportCase) {
      throw new NotFoundException('Support case not found.');
    }

    const visibility =
      normalizeEnumValue(dto.visibility ?? 'INTERNAL', SUPPORT_COMMENT_VISIBILITIES, 'visibility') ?? 'INTERNAL';

    await this.prisma.$transaction(async (tx) => {
      await tx.supportCaseComment.create({
        data: {
          caseId,
          authorUserId: actorUserId,
          visibility,
          body: dto.body.trim(),
        },
      });

      await this.createSupportEvent(tx, caseId, actorUserId, 'COMMENT_ADDED', {
        visibility,
      });
    });

    await this.prisma.auditLog.create({
      data: {
        hotelId: supportCase.hotelId,
        actorUserId,
        action: 'platform.support.case.comment',
        targetType: 'SUPPORT_CASE',
        targetId: caseId,
        metadata: {
          hotelName: supportCase.hotel.name,
          visibility,
        },
      },
    });

    return this.getSupportCaseDetail(caseId);
  }

  async getSupportCases(params: {
    page?: number;
    limit?: number;
    status?: string;
    priority?: string;
    category?: string;
    hotelId?: string;
    search?: string;
  }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(Math.max(params.limit ?? 20, 1), 100);
    const skip = (page - 1) * limit;

    const where = {
      ...(params.status ? { status: params.status } : {}),
      ...(params.priority ? { priority: params.priority } : {}),
      ...(params.category ? { category: { contains: params.category, mode: 'insensitive' as const } } : {}),
      ...(params.hotelId ? { hotelId: params.hotelId } : {}),
      ...(params.search
        ? {
            OR: [
              { subject: { contains: params.search, mode: 'insensitive' as const } },
              { description: { contains: params.search, mode: 'insensitive' as const } },
              { hotel: { name: { contains: params.search, mode: 'insensitive' as const } } },
            ],
          }
        : {}),
    };

    const [rows, total, groupedCounts] = await Promise.all([
      (this.prisma as any).supportCase.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ updatedAt: 'desc' }],
        include: {
          hotel: { select: { id: true, name: true } },
          assignedAdmin: {
            select: {
              id: true,
              email: true,
              staff: { select: { firstName: true, lastName: true } },
            },
          },
        },
      }),
      (this.prisma as any).supportCase.count({ where }),
      (this.prisma as any).supportCase.groupBy({
        by: ['status'],
        where,
        _count: {
          _all: true,
        },
      }),
    ]);

    const counts = groupedCounts.reduce((acc: Record<string, number>, row: any) => {
      acc[row.status] = row._count?._all ?? 0;
      return acc;
    }, {});

    return {
      cases: rows.map((row: any) => ({
        id: row.id,
        hotelId: row.hotelId,
        hotelName: row.hotel.name,
        subject: row.subject,
        category: row.category,
        priority: row.priority,
        status: row.status,
        source: row.source,
        assignedAdminId: row.assignedAdminId ?? null,
        assignedAdminName: row.assignedAdmin
          ? row.assignedAdmin.staff
            ? `${row.assignedAdmin.staff.firstName} ${row.assignedAdmin.staff.lastName}`.trim()
            : row.assignedAdmin.email
          : null,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      statusCounts: counts,
    };
  }

  async getSupportCaseDetail(id: string) {
    const supportCase = await (this.prisma as any).supportCase.findUnique({
      where: { id },
      include: {
        hotel: {
          select: {
            id: true,
            name: true,
            city: true,
            country: true,
          },
        },
        assignedAdmin: {
          select: {
            id: true,
            email: true,
            staff: { select: { firstName: true, lastName: true } },
          },
        },
        createdByUser: {
          select: {
            id: true,
            email: true,
            staff: { select: { firstName: true, lastName: true } },
          },
        },
        events: {
          orderBy: [{ createdAt: 'asc' }],
          include: {
            actorUser: {
              select: {
                id: true,
                email: true,
                staff: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
        comments: {
          orderBy: [{ createdAt: 'asc' }],
          include: {
            authorUser: {
              select: {
                id: true,
                email: true,
                staff: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
      },
    });

    if (!supportCase) {
      throw new NotFoundException('Support case not found.');
    }

    const [entitlements, hotelDetail] = await Promise.all([
      this.resolveHotelEntitlementsInternal(supportCase.hotelId),
      this.getHotelDetail(supportCase.hotelId),
    ]);

    return {
      id: supportCase.id,
      hotelId: supportCase.hotelId,
      hotel: supportCase.hotel,
      subject: supportCase.subject,
      description: supportCase.description,
      category: supportCase.category,
      priority: supportCase.priority,
      status: supportCase.status,
      source: supportCase.source,
      requestType: supportCase.requestType ?? null,
      requestPayload: supportCase.requestPayload ?? null,
      assignedAdmin: supportCase.assignedAdmin
        ? {
            id: supportCase.assignedAdmin.id,
            name: supportCase.assignedAdmin.staff
              ? `${supportCase.assignedAdmin.staff.firstName} ${supportCase.assignedAdmin.staff.lastName}`.trim()
              : supportCase.assignedAdmin.email,
            email: supportCase.assignedAdmin.email,
          }
        : null,
      createdBy: supportCase.createdByUser
        ? {
            id: supportCase.createdByUser.id,
            name: supportCase.createdByUser.staff
              ? `${supportCase.createdByUser.staff.firstName} ${supportCase.createdByUser.staff.lastName}`.trim()
              : supportCase.createdByUser.email,
            email: supportCase.createdByUser.email,
          }
        : null,
      createdAt: supportCase.createdAt,
      updatedAt: supportCase.updatedAt,
      subscriptionSnapshot: supportCase.subscriptionSnapshot ?? null,
      entitlementSnapshot: supportCase.entitlementSnapshot ?? null,
      liveEntitlements: entitlements,
      hotelHealth: hotelDetail.health,
      hotelLifecycle: {
        onboardingStatus: hotelDetail.onboardingStatus,
        suspendedAt: hotelDetail.suspendedAt,
        suspensionReason: hotelDetail.suspensionReason,
        deletedAt: hotelDetail.deletedAt,
        purgeAfterAt: hotelDetail.purgeAfterAt,
      },
      hotelSubscription: hotelDetail.subscription,
      keycards: hotelDetail.keycards,
      events: supportCase.events.map((event: any) => ({
        id: event.id,
        type: event.type,
        payload: event.payload ?? null,
        createdAt: event.createdAt,
        actor: event.actorUser
          ? {
              id: event.actorUser.id,
              name: event.actorUser.staff
                ? `${event.actorUser.staff.firstName} ${event.actorUser.staff.lastName}`.trim()
                : event.actorUser.email,
              email: event.actorUser.email,
            }
          : null,
      })),
      comments: supportCase.comments.map((comment: any) => ({
        id: comment.id,
        visibility: comment.visibility,
        body: comment.body,
        createdAt: comment.createdAt,
        author: comment.authorUser
          ? {
              id: comment.authorUser.id,
              name: comment.authorUser.staff
                ? `${comment.authorUser.staff.firstName} ${comment.authorUser.staff.lastName}`.trim()
                : comment.authorUser.email,
              email: comment.authorUser.email,
            }
          : null,
      })),
    };
  }

  async getHotelEntitlements(hotelId: string) {
    const [snapshot, recentChanges] = await Promise.all([
      this.resolveHotelEntitlementsInternal(hotelId),
      (this.prisma.auditLog as any).findMany({
        where: {
          hotelId,
          action: 'platform.hotel.feature_override.update',
        },
        orderBy: [{ createdAt: 'desc' }],
        take: 12,
        include: {
          actor: {
            select: {
              id: true,
              email: true,
              staff: { select: { firstName: true, lastName: true } },
            },
          },
        },
      }),
    ]);

    return {
      ...snapshot,
      recentChanges: recentChanges.map((entry: any) => ({
        id: entry.id,
        action: entry.action,
        createdAt: entry.createdAt,
        actorName: entry.actor?.staff
          ? `${entry.actor.staff.firstName} ${entry.actor.staff.lastName}`.trim()
          : entry.actor?.email ?? 'Unknown actor',
        metadata: entry.metadata ?? null,
      })),
    };
  }

  async getHotelObservability(hotelId: string) {
    const hotel = await this.prisma.hotel.findUnique({
      where: { id: hotelId },
      select: { id: true, name: true, suspendedAt: true, deletedAt: true },
    });

    if (!hotel) {
      throw new NotFoundException('Hotel not found.');
    }

    const now = Date.now();
    const last24Hours = new Date(now - 24 * 60 * 60 * 1000);

    const [cronRows, moduleRows, recentEvents, supportOpenCount] = await Promise.all([
      (this.prisma as any).hotelCronSetting.findMany({
        where: {
          hotelId,
          OR: [{ lastFailedAt: { not: null } }, { lastError: { not: null } }],
        },
        orderBy: [{ lastFailedAt: 'desc' }, { updatedAt: 'desc' }],
      }),
      (this.prisma as any).realtimeModuleHealth.findMany({
        where: { hotelId },
        orderBy: [{ lastEventAt: 'desc' }],
      }),
      (this.prisma as any).realtimeEventLog.findMany({
        where: { hotelId },
        orderBy: { createdAt: 'desc' },
        take: 12,
      }),
      (this.prisma as any).supportCase.count({
        where: {
          hotelId,
          status: { in: ['OPEN', 'TRIAGED', 'IN_PROGRESS', 'WAITING_ON_HOTEL'] },
        },
      }),
    ]);

    const failedJobs = cronRows.map((row: any) => ({
      jobType: row.jobType,
      label: humanizeMachineValue(row.jobType),
      enabled: row.enabled === true,
      lastTriggeredAt: row.lastTriggeredAt ?? null,
      lastSucceededAt: row.lastSucceededAt ?? null,
      lastFailedAt: row.lastFailedAt ?? null,
      lastError: row.lastError ?? null,
      severity: row.enabled === false ? 'info' : 'warning',
    }));

    const moduleAlerts = moduleRows.map((row: any) => {
      const ageMs = row.lastEventAt ? now - new Date(row.lastEventAt).getTime() : null;
      const isStale = ageMs !== null && ageMs > 15 * 60 * 1000;
      const status =
        row.lastEventType === 'degraded' ? 'alerting' : isStale ? 'stale' : 'healthy';

      return {
        moduleKey: row.moduleKey,
        label: humanizeMachineValue(row.moduleKey),
        eventName: row.eventName,
        eventCount: row.eventCount ?? 0,
        lastEventAt: row.lastEventAt ?? null,
        lastEventType: row.lastEventType ?? null,
        lastSummary: row.lastSummary ?? null,
        status,
      };
    });

    const realtimeIncidents = recentEvents.map((row: any) => ({
      id: row.id,
      source: 'realtime',
      severity:
        row.eventType === 'degraded'
          ? 'warning'
          : row.eventType === 'recovered'
            ? 'info'
            : 'warning',
      title: `${humanizeMachineValue(row.moduleKey)} realtime ${String(row.eventType ?? 'event')}`,
      summary: row.summary,
      createdAt: row.createdAt,
      moduleKey: row.moduleKey,
      jobType: null,
    }));

    const cronIncidents = failedJobs
      .filter((job: (typeof failedJobs)[number]) => job.lastFailedAt)
      .slice(0, 6)
      .map((job: (typeof failedJobs)[number]) => ({
        id: `cron:${job.jobType}:${job.lastFailedAt}`,
        source: 'cron',
        severity: 'warning',
        title: `${job.label} failed`,
        summary: job.lastError ?? 'Job recorded a failure.',
        createdAt: job.lastFailedAt,
        moduleKey: null,
        jobType: job.jobType,
      }));

    const incidents = [...realtimeIncidents, ...cronIncidents]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 12);

    return {
      hotelId: hotel.id,
      hotelName: hotel.name,
      summary: {
        openFailedJobs: failedJobs.filter((job: (typeof failedJobs)[number]) => job.enabled && job.lastFailedAt).length,
        activeModuleAlerts: moduleAlerts.filter((module: (typeof moduleAlerts)[number]) => module.status !== 'healthy').length,
        degradedEvents24h: recentEvents.filter(
          (row: any) => row.eventType === 'degraded' && new Date(row.createdAt) >= last24Hours,
        ).length,
        openSupportCases: supportOpenCount,
        suspended: hotel.suspendedAt !== null,
        deleted: hotel.deletedAt !== null,
      },
      failedJobs,
      moduleAlerts,
      recentIncidents: incidents,
    };
  }

  async listHotels(params: ListHotelsParams) {
    const page = Math.max(1, params.page ?? 1);
    const limit = params.all ? undefined : Math.min(Math.max(params.limit ?? 20, 5), 100);
    const skip = params.all || !limit ? 0 : (page - 1) * limit;

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
      (this.prisma.hotel as any).findMany({
        where,
        orderBy: { createdAt: 'desc' },
        ...(params.all ? {} : { skip, take: limit }),
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
          keycardAuthEnabled: true,
          lockVendor: true,
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
      rows.map(async (hotel: any) => {
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
        const roomMappings = await this.prisma.room.findMany({
          where: { hotelId: hotel.id },
          select: { id: true, lockDeviceId: true },
        });
        const deniedEvents24h = await (this.prisma as any).keycardAccessLog.count({
          where: {
            hotelId: hotel.id,
            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
            result: { not: 'GRANTED' },
          },
        });

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
          keycardAuthEnabled: hotel.keycardAuthEnabled,
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
          keycards: {
            enabled: hotel.keycardAuthEnabled,
            hotelLockVendor: this.normalizeLockVendor(hotel.lockVendor),
            providerMode: this.deriveKeycardProviderMode(hotel.lockVendor),
            totalRooms: roomMappings.length,
            roomsWithLockMapping: roomMappings.filter((room) => Boolean(room.lockDeviceId)).length,
            missingRoomLockMappings: roomMappings.filter((room) => !room.lockDeviceId).length,
            deniedEvents24h,
          },
        };
      }),
    );

    return {
      hotels,
      total,
      page: params.all ? 1 : page,
      limit: params.all ? hotels.length : limit,
      totalPages: params.all ? 1 : Math.ceil(total / (limit ?? 20)),
    };
  }

  async search(query?: string) {
    const term = query?.trim();
    if (!term || term.length < 2) {
      return { hotels: [], users: [], actions: [] };
    }

    const [hotels, users, actions] = await Promise.all([
      this.prisma.hotel.findMany({
        where: {
          OR: [
            { name: { contains: term, mode: 'insensitive' } },
            { domain: { contains: term, mode: 'insensitive' } },
            { city: { contains: term, mode: 'insensitive' } },
            { country: { contains: term, mode: 'insensitive' } },
          ],
        },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          name: true,
          city: true,
          country: true,
          domain: true,
        },
      }),
      this.prisma.user.findMany({
        where: {
          OR: [
            { email: { contains: term, mode: 'insensitive' } },
            { username: { contains: term, mode: 'insensitive' } },
            { staff: { firstName: { contains: term, mode: 'insensitive' } } },
            { staff: { lastName: { contains: term, mode: 'insensitive' } } },
            { staff: { employeeCode: { contains: term, mode: 'insensitive' } } },
          ],
        },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          email: true,
          username: true,
          role: true,
          staff: {
            select: {
              firstName: true,
              lastName: true,
              hotel: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.auditLog.findMany({
        where: {
          OR: [
            { action: { contains: term, mode: 'insensitive' } },
            { actor: { email: { contains: term, mode: 'insensitive' } } },
            { hotel: { name: { contains: term, mode: 'insensitive' } } },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          action: true,
          createdAt: true,
          actor: {
            select: {
              email: true,
              staff: { select: { firstName: true, lastName: true } },
            },
          },
          hotel: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
    ]);

    return {
      hotels,
      users: users.map((user) => ({
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.staff ? `${user.staff.firstName} ${user.staff.lastName}`.trim() : user.username ?? user.email,
        hotel: user.staff?.hotel ?? null,
      })),
      actions: actions.map((action) => ({
        id: action.id,
        action: action.action,
        createdAt: action.createdAt,
        actorName: action.actor.staff
          ? `${action.actor.staff.firstName} ${action.actor.staff.lastName}`.trim()
          : action.actor.email,
        hotel: action.hotel,
      })),
    };
  }

  async listSuperAdmins(search?: string) {
    const term = search?.trim();
    const rows = await this.prisma.user.findMany({
      where: {
        role: 'SUPER_ADMIN',
        ...(term
          ? {
              OR: [
                { email: { contains: term, mode: 'insensitive' } },
                { username: { contains: term, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        username: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        mfaEnabled: true,
      },
    });

    return {
      superAdmins: rows.map((row) => ({
        id: row.id,
        email: row.email,
        name: row.username ?? row.email,
        isActive: row.isActive,
        lastLoginAt: row.lastLoginAt,
        createdAt: row.createdAt,
        mfaEnabled: row.mfaEnabled,
      })),
    };
  }

  async createSuperAdmin(actorUserId: string, dto: CreatePlatformSuperAdminDto) {
    const email = dto.email.trim().toLowerCase();
    const name = dto.name.trim();

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      throw new ConflictException('A user with this email already exists.');
    }

    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);

    const user = await this.prisma.user.create({
      data: {
        email,
        username: name,
        passwordHash,
        role: 'SUPER_ADMIN',
        isActive: true,
        mustChangePassword: true,
      },
      select: {
        id: true,
        email: true,
        username: true,
        createdAt: true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        hotelId: null,
        actorUserId,
        action: 'platform.super_admin.created',
        targetType: 'USER',
        targetId: user.id,
        targetUserId: user.id,
        metadata: {
          email: user.email,
          name,
        },
      },
    });

    await this.sendSuperAdminWelcomeEmail({
      recipientEmail: user.email,
      recipientName: name,
      temporaryPassword,
    });

    return {
      superAdmin: {
        id: user.id,
        email: user.email,
        name: user.username ?? user.email,
        createdAt: user.createdAt,
        // remove when email sending is set
        temporaryPassword: temporaryPassword
      },
      emailQueued: true,
    };
  }

  async getHotelDetail(hotelId: string) {
    type ResultGroup = {
      result: string;
      _count?: {
        _all?: number | null;
      } | null;
    };
    type RecentKeycardEvent = {
      id: string;
      createdAt: Date;
      result: string;
      reason?: string | null;
      deviceId?: string | null;
      accessToken: string;
      room?: {
        number: string;
      } | null;
    };

    const hotel = await (this.prisma.hotel as any).findUnique({
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
        keycardAuthEnabled: true,
        lockVendor: true,
        lockApiKey: true,
        lockApiConfig: true,
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

    const [admins, recentReservations, recentStaffLogins, latestReservation, overdueInvoices, rooms, keycardEventGroups, recentKeycardEvents, subscription] = await Promise.all([
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
      this.prisma.room.findMany({
        where: { hotelId },
        select: {
          id: true,
          number: true,
          lockDeviceId: true,
          lockVendor: true,
        },
      }),
      (this.prisma as any).keycardAccessLog.groupBy({
        by: ['result'],
        where: {
          hotelId,
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
        _count: {
          _all: true,
        },
      }),
      (this.prisma as any).keycardAccessLog.findMany({
        where: { hotelId },
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: {
          room: {
            select: {
              number: true,
            },
          },
        },
      }),
      (this.prisma as any).hotelSubscription?.findFirst
        ? (this.prisma as any).hotelSubscription.findFirst({
            where: { hotelId },
            orderBy: [{ updatedAt: 'desc' }],
            include: {
              plan: true,
            },
          })
        : Promise.resolve(null),
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
    const roomMappingCount = rooms.filter((room) => Boolean(room.lockDeviceId)).length;
    const missingRoomLockMappings = Math.max(0, rooms.length - roomMappingCount);
    const hasLiveProvider = this.deriveKeycardProviderMode(hotel.lockVendor) === 'live';
    const lockApiConfigured = Boolean(hotel.lockApiKey || hotel.lockApiConfig);
    const keycardCountsByResult = new Map<string, number>(
      (keycardEventGroups as ResultGroup[]).map((group) => [group.result, group._count?._all ?? 0]),
    );
    const configurationIssues: string[] = [];
    if (hotel.keycardAuthEnabled && !this.normalizeLockVendor(hotel.lockVendor)) {
      configurationIssues.push('Hotel keycard access is enabled without a default lock vendor.');
    }
    if (hotel.keycardAuthEnabled && hasLiveProvider && !lockApiConfigured) {
      configurationIssues.push('A live lock vendor is selected but vendor credentials/config are missing.');
    }
    if (hotel.keycardAuthEnabled && missingRoomLockMappings > 0) {
      configurationIssues.push(
        `${missingRoomLockMappings} room${missingRoomLockMappings === 1 ? '' : 's'} are missing lock device mappings.`,
      );
    }
    const lifecycleIssues: string[] = [];
    const revoked24h = keycardCountsByResult.get('REVOKED') ?? 0;
    const expired24h = keycardCountsByResult.get('EXPIRED') ?? 0;
    const denied24h = keycardCountsByResult.get('DENIED') ?? 0;
    const unknown24h = keycardCountsByResult.get('UNKNOWN') ?? 0;
    if (denied24h > 0) {
      lifecycleIssues.push(`${denied24h} denied access event${denied24h === 1 ? '' : 's'} in the last 24 hours.`);
    }
    if (revoked24h > 0) {
      lifecycleIssues.push(`${revoked24h} revoked-card access attempt${revoked24h === 1 ? '' : 's'} in the last 24 hours.`);
    }
    if (expired24h > 0) {
      lifecycleIssues.push(`${expired24h} expired-card access attempt${expired24h === 1 ? '' : 's'} in the last 24 hours.`);
    }
    if (unknown24h > 0) {
      lifecycleIssues.push(`${unknown24h} unknown-token access event${unknown24h === 1 ? '' : 's'} in the last 24 hours.`);
    }
    const hasConfigurationIssues = configurationIssues.length > 0;

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
      subscription: subscription
        ? {
            id: subscription.id,
            planId: subscription.planId ?? null,
            planCode: subscription.plan?.code ?? null,
            planName: subscription.plan?.name ?? null,
            status: subscription.status,
            startsAt: subscription.startsAt ?? null,
            endsAt: subscription.endsAt ?? null,
            trialEndsAt: subscription.trialEndsAt ?? null,
            graceEndsAt: subscription.graceEndsAt ?? null,
            billingEmail: subscription.billingEmail ?? null,
            billingContactName: subscription.billingContactName ?? null,
            notes: subscription.notes ?? null,
          }
        : null,
      keycards: {
        enabled: hotel.keycardAuthEnabled,
        hotelLockVendor: this.normalizeLockVendor(hotel.lockVendor),
        providerMode: this.deriveKeycardProviderMode(hotel.lockVendor),
        lockApiConfigured,
        totalRooms: rooms.length,
        roomsWithLockMapping: roomMappingCount,
        missingRoomLockMappings,
        roomVendors: Array.from(
          rooms.reduce((map, room) => {
            const vendor = this.normalizeLockVendor(room.lockVendor) || this.normalizeLockVendor(hotel.lockVendor) || 'MOCK';
            map.set(vendor, (map.get(vendor) ?? 0) + 1);
            return map;
          }, new Map<string, number>()),
        ).map(([vendor, rooms]) => ({ vendor, rooms })),
        accessSummary: {
          granted24h: keycardCountsByResult.get('GRANTED') ?? 0,
          denied24h,
          expired24h,
          revoked24h,
          unknown24h,
          recentEvents: (recentKeycardEvents as RecentKeycardEvent[]).map((event) => ({
            id: event.id,
            createdAt: event.createdAt,
            result: event.result,
            reason: event.reason ?? null,
            roomNumber: event.room?.number ?? null,
            deviceId: event.deviceId ?? null,
            accessTokenPreview: `${event.accessToken.slice(0, 8)}...`,
            diagnosis: this.buildKeycardAccessDiagnosis({
              result: event.result,
              hasConfigurationIssues,
            }),
          })),
        },
        supportSignals: {
          configurationIssues,
          lifecycleIssues,
        },
      },
    };
  }

  async updateHotelSubscription(actorUserId: string, hotelId: string, dto: UpdateHotelSubscriptionDto) {
    const hotel = await this.prisma.hotel.findUnique({
      where: { id: hotelId },
      select: { id: true, name: true, email: true },
    });
    if (!hotel) {
      throw new NotFoundException('Hotel not found.');
    }

    let nextPlan: { id: string; code: string; name: string } | null = null;
    if (dto.planId) {
      const plan = await (this.prisma as any).subscriptionPlan.findUnique({
        where: { id: dto.planId },
        select: { id: true, code: true, name: true },
      });
      if (!plan) {
        throw new NotFoundException('Subscription plan not found.');
      }
      nextPlan = plan;
    }

    const existing = await (this.prisma as any).hotelSubscription.findFirst({
      where: { hotelId },
      orderBy: [{ updatedAt: 'desc' }],
      include: { plan: true },
    });

    const data = {
      ...(dto.planId !== undefined ? { planId: dto.planId || null } : {}),
      ...(dto.status !== undefined ? { status: dto.status.trim().toUpperCase() } : {}),
      ...(dto.startsAt !== undefined ? { startsAt: parseOptionalDate(dto.startsAt) } : {}),
      ...(dto.endsAt !== undefined ? { endsAt: parseOptionalDate(dto.endsAt) } : {}),
      ...(dto.trialEndsAt !== undefined ? { trialEndsAt: parseOptionalDate(dto.trialEndsAt) } : {}),
      ...(dto.graceEndsAt !== undefined ? { graceEndsAt: parseOptionalDate(dto.graceEndsAt) } : {}),
      ...(dto.billingEmail !== undefined ? { billingEmail: normalizeOptional(dto.billingEmail)?.toLowerCase() } : {}),
      ...(dto.billingContactName !== undefined
        ? { billingContactName: normalizeOptional(dto.billingContactName) }
        : {}),
      ...(dto.notes !== undefined ? { notes: normalizeOptional(dto.notes) } : {}),
    };

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('Provide at least one subscription field to update.');
    }

    if (existing) {
      await (this.prisma as any).hotelSubscription.update({
        where: { id: existing.id },
        data,
      });
    } else {
      await (this.prisma as any).hotelSubscription.create({
        data: {
          hotelId,
          status: 'TRIAL',
          ...data,
        },
      });
    }

    await this.prisma.auditLog.create({
      data: {
        hotelId,
        actorUserId,
        action: 'platform.hotel.subscription.update',
        targetType: 'HOTEL_SUBSCRIPTION',
        targetId: existing?.id ?? hotelId,
        metadata: {
          hotelName: hotel.name,
          changedFields: Object.keys(data),
          previousStatus: existing?.status ?? null,
          previousPlanId: existing?.planId ?? null,
        },
      },
    });

    const effectivePlan = nextPlan ?? (existing?.plan
      ? {
          id: existing.plan.id,
          code: existing.plan.code,
          name: existing.plan.name,
        }
      : null);

    const notifyEmail = normalizeOptional(dto.billingEmail)?.toLowerCase() || existing?.billingEmail || hotel.email;
    if (notifyEmail) {
      await this.email.sendEmail({
        to: notifyEmail,
        hotelId,
        event: 'platform.hotel.subscription.updated',
        subject: `${hotel.name} subscription updated`,
        text: `Hello,\n\nThe subscription for ${hotel.name} was updated.\n\nPlan: ${effectivePlan?.name ?? 'Unassigned'}\nStatus: ${data.status ?? existing?.status ?? 'UNCHANGED'}\n\nIf you did not expect this change, contact support from your HotelOS workspace.`,
        html: `
          <p>Hello,</p>
          <p>The subscription for <strong>${hotel.name}</strong> was updated.</p>
          <p><strong>Plan:</strong> ${effectivePlan?.name ?? 'Unassigned'}</p>
          <p><strong>Status:</strong> ${data.status ?? existing?.status ?? 'UNCHANGED'}</p>
          <p>If you did not expect this change, contact support from your HotelOS workspace.</p>
        `,
      });
    }

    await this.invalidateDashboardFeatureFlagsForHotel(hotelId);

    return this.getHotelDetail(hotelId);
  }

  async updateHotelFeatureFlag(
    actorUserId: string,
    hotelId: string,
    flagKey: string,
    dto: UpdateHotelFeatureFlagDto,
  ) {
    const [hotel, flag, existing] = await Promise.all([
      this.prisma.hotel.findUnique({
        where: { id: hotelId },
        select: { id: true, name: true },
      }),
      (this.prisma as any).featureFlag.findUnique({
        where: { key: flagKey },
        select: { key: true, name: true },
      }),
      (this.prisma as any).hotelFeatureOverride.findUnique({
        where: {
          hotelId_flagKey: {
            hotelId,
            flagKey,
          },
        },
      }),
    ]);

    if (!hotel) {
      throw new NotFoundException('Hotel not found.');
    }
    if (!flag) {
      throw new NotFoundException('Feature flag not found.');
    }

    const mode = dto.mode;
    if (mode === 'override' && dto.enabled === undefined) {
      throw new BadRequestException('Provide an enabled value when setting an override.');
    }

    if (mode === 'inherit') {
      if (existing) {
        await (this.prisma as any).hotelFeatureOverride.delete({
          where: {
            hotelId_flagKey: {
              hotelId,
              flagKey,
            },
          },
        });
      }
    } else {
      await (this.prisma as any).hotelFeatureOverride.upsert({
        where: {
          hotelId_flagKey: {
            hotelId,
            flagKey,
          },
        },
        update: {
          enabled: dto.enabled,
          limitValue: normalizeOptional(dto.limitValue),
          reason: normalizeOptional(dto.reason),
        },
        create: {
          hotelId,
          flagKey,
          enabled: dto.enabled ?? false,
          limitValue: normalizeOptional(dto.limitValue),
          reason: normalizeOptional(dto.reason),
        },
      });
    }

    await this.prisma.auditLog.create({
      data: {
        hotelId,
        actorUserId,
        action: 'platform.hotel.feature_override.update',
        targetType: 'HOTEL_FEATURE_OVERRIDE',
        targetId: `${hotelId}:${flagKey}`,
        metadata: {
          hotelName: hotel.name,
          flagKey,
          flagName: flag.name ?? flagKey,
          mode,
          before: existing
            ? {
                enabled: existing.enabled,
                limitValue: existing.limitValue ?? null,
                reason: existing.reason ?? null,
              }
            : null,
          after:
            mode === 'inherit'
              ? null
              : {
                  enabled: dto.enabled ?? false,
                  limitValue: normalizeOptional(dto.limitValue),
                  reason: normalizeOptional(dto.reason),
                },
        },
      },
    });

    await this.invalidateDashboardFeatureFlagsForHotel(hotelId);

    return this.getHotelEntitlements(hotelId);
  }

  async updateHotel(actorUserId: string, hotelId: string, dto: UpdatePlatformHotelDto) {
    const hotel = await (this.prisma.hotel as any).findUnique({
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
        keycardAuthEnabled: true,
        lockVendor: true,
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
      ...(dto.keycardAuthEnabled !== undefined
        ? { keycardAuthEnabled: dto.keycardAuthEnabled }
        : {}),
      ...(dto.lockVendor !== undefined ? { lockVendor: normalizeOptional(dto.lockVendor)?.toUpperCase() } : {}),
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

    if (changedFields.some((field) => ['keycardAuthEnabled', 'lockVendor'].includes(field))) {
      await this.prisma.auditLog.create({
        data: {
          hotelId,
          actorUserId,
          action: 'platform.hotel.keycard_config_update',
          targetType: 'HOTEL',
          targetId: hotelId,
          metadata: {
            hotelName: data.name ?? hotel.name,
            changedFields: changedFields.filter((field) =>
              ['keycardAuthEnabled', 'lockVendor'].includes(field),
            ),
          },
        },
      });

      if (changedFields.includes('keycardAuthEnabled')) {
        await this.invalidateDashboardFeatureFlagsForHotel(hotelId);
      }
    }

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
    const purgeAfter = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

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
