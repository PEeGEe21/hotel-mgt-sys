import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EntitlementsService } from '../entitlements/entitlements.service';
import { CreateTenantSupportCaseDto } from './dtos/create-tenant-support-case.dto';

const SUPPORT_CASE_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
const MANAGEMENT_ROLES = new Set(['ADMIN', 'MANAGER', 'SUPER_ADMIN']);
const HOTEL_VISIBLE_EVENT_TYPES = new Set(['CASE_CREATED', 'STATUS_CHANGED', 'PRIORITY_CHANGED', 'ASSIGNED', 'UNASSIGNED']);
const TENANT_REQUEST_TYPES = ['PLAN_UPGRADE', 'BILLING_CONTACT_CHANGE', 'FEATURE_ACTIVATION'] as const;

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

@Injectable()
export class SupportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlementsService: EntitlementsService,
  ) {}

  private canViewHotelWide(role?: string | null) {
    return MANAGEMENT_ROLES.has(role ?? '');
  }

  private normalizeTenantRequestType(value?: string | null) {
    return normalizeEnumValue(value, TENANT_REQUEST_TYPES, 'requestType');
  }

  private validateTenantRequestPayload(
    requestType: (typeof TENANT_REQUEST_TYPES)[number] | null,
    payload: Record<string, unknown> | undefined,
  ) {
    if (!requestType) return null;

    const data = payload && typeof payload === 'object' ? payload : {};
    const readString = (key: string) => {
      const value = data[key];
      return typeof value === 'string' ? value.trim() : '';
    };

    if (requestType === 'PLAN_UPGRADE') {
      const requestedPlanCode = readString('requestedPlanCode');
      const businessNeed = readString('businessNeed');
      if (!requestedPlanCode) {
        throw new BadRequestException('Requested plan is required for a plan upgrade request.');
      }
      if (!businessNeed) {
        throw new BadRequestException('Business need is required for a plan upgrade request.');
      }
      return {
        requestedPlanCode,
        businessNeed,
        currentPlanCode: readString('currentPlanCode') || null,
      };
    }

    if (requestType === 'BILLING_CONTACT_CHANGE') {
      const billingContactName = readString('billingContactName');
      const billingEmail = readString('billingEmail');
      if (!billingContactName || !billingEmail) {
        throw new BadRequestException(
          'Billing contact name and email are required for a billing contact change request.',
        );
      }
      return {
        billingContactName,
        billingEmail,
        note: readString('note') || null,
      };
    }

    if (requestType === 'FEATURE_ACTIVATION') {
      const featureKey = readString('featureKey');
      const businessNeed = readString('businessNeed');
      if (!featureKey) {
        throw new BadRequestException('Feature key is required for a feature activation request.');
      }
      if (!businessNeed) {
        throw new BadRequestException(
          'Business need is required for a feature activation request.',
        );
      }
      return {
        featureKey,
        featureName: readString('featureName') || null,
        businessNeed,
      };
    }

    return null;
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

  async listCases(args: {
    hotelId: string;
    actorUserId: string;
    role?: string | null;
    status?: string;
    priority?: string;
    search?: string;
  }) {
    const canViewAll = this.canViewHotelWide(args.role);
    const where = {
      hotelId: args.hotelId,
      ...(canViewAll ? {} : { createdByUserId: args.actorUserId }),
      ...(args.status ? { status: args.status.trim().toUpperCase() } : {}),
      ...(args.priority ? { priority: args.priority.trim().toUpperCase() } : {}),
      ...(args.search
        ? {
            OR: [
              { subject: { contains: args.search, mode: 'insensitive' as const } },
              { description: { contains: args.search, mode: 'insensitive' as const } },
              { category: { contains: args.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [rows, groupedCounts] = await Promise.all([
      (this.prisma as any).supportCase.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }],
        include: {
          assignedAdmin: {
            select: {
              id: true,
              email: true,
              staff: { select: { firstName: true, lastName: true } },
            },
          },
        },
      }),
      (this.prisma as any).supportCase.groupBy({
        by: ['status'],
        where,
        _count: { _all: true },
      }),
    ]);

    const counts = groupedCounts.reduce((acc: Record<string, number>, row: any) => {
      acc[row.status] = row._count?._all ?? 0;
      return acc;
    }, {});

    return {
      cases: rows.map((row: any) => ({
        id: row.id,
        category: row.category,
        priority: row.priority,
        status: row.status,
        subject: row.subject,
        source: row.source,
        requestType: row.requestType ?? null,
        requestPayload: row.requestPayload ?? null,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        assignedAdminName: row.assignedAdmin
          ? row.assignedAdmin.staff
            ? `${row.assignedAdmin.staff.firstName} ${row.assignedAdmin.staff.lastName}`.trim()
            : row.assignedAdmin.email
          : null,
      })),
      statusCounts: counts,
      canViewHotelWide: canViewAll,
    };
  }

  async getCaseDetail(args: { hotelId: string; actorUserId: string; role?: string | null; caseId: string }) {
    const supportCase = await (this.prisma as any).supportCase.findFirst({
      where: {
        id: args.caseId,
        hotelId: args.hotelId,
      },
      include: {
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
          where: { visibility: 'HOTEL_VISIBLE' },
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

    if (!this.canViewHotelWide(args.role) && supportCase.createdByUserId !== args.actorUserId) {
      throw new ForbiddenException('You can only view your own support cases.');
    }

    return {
      id: supportCase.id,
      category: supportCase.category,
      priority: supportCase.priority,
      status: supportCase.status,
      subject: supportCase.subject,
      description: supportCase.description,
      source: supportCase.source,
      requestType: supportCase.requestType ?? null,
      requestPayload: supportCase.requestPayload ?? null,
      createdAt: supportCase.createdAt,
      updatedAt: supportCase.updatedAt,
      assignedAdminName: supportCase.assignedAdmin
        ? supportCase.assignedAdmin.staff
          ? `${supportCase.assignedAdmin.staff.firstName} ${supportCase.assignedAdmin.staff.lastName}`.trim()
          : supportCase.assignedAdmin.email
        : null,
      createdByName: supportCase.createdByUser
        ? supportCase.createdByUser.staff
          ? `${supportCase.createdByUser.staff.firstName} ${supportCase.createdByUser.staff.lastName}`.trim()
          : supportCase.createdByUser.email
        : null,
      events: supportCase.events
        .filter((event: any) => HOTEL_VISIBLE_EVENT_TYPES.has(event.type))
        .map((event: any) => ({
          id: event.id,
          type: event.type,
          payload: event.payload ?? null,
          createdAt: event.createdAt,
          actorName: event.actorUser
            ? event.actorUser.staff
              ? `${event.actorUser.staff.firstName} ${event.actorUser.staff.lastName}`.trim()
              : event.actorUser.email
            : 'System',
        })),
      comments: supportCase.comments.map((comment: any) => ({
        id: comment.id,
        body: comment.body,
        visibility: comment.visibility,
        createdAt: comment.createdAt,
        authorName: comment.authorUser
          ? comment.authorUser.staff
            ? `${comment.authorUser.staff.firstName} ${comment.authorUser.staff.lastName}`.trim()
            : comment.authorUser.email
          : 'Support',
      })),
    };
  }

  async createCase(args: { hotelId: string; actorUserId: string; dto: CreateTenantSupportCaseDto }) {
    const hotel = await this.prisma.hotel.findUnique({
      where: { id: args.hotelId },
      select: { id: true, name: true },
    });
    if (!hotel) {
      throw new NotFoundException('Hotel not found.');
    }

    const priority =
      normalizeEnumValue(args.dto.priority ?? 'MEDIUM', SUPPORT_CASE_PRIORITIES, 'priority') ?? 'MEDIUM';
    const requestType = this.normalizeTenantRequestType(args.dto.requestType);
    const requestPayload = this.validateTenantRequestPayload(requestType, args.dto.requestPayload);
    const entitlements = await this.entitlementsService.resolveHotelEntitlements(args.hotelId);

    const created = await this.prisma.$transaction(async (tx) => {
      const supportCase = await (tx as any).supportCase.create({
        data: {
          hotelId: args.hotelId,
          createdByUserId: args.actorUserId,
          source: 'HOTEL',
          category: args.dto.category.trim(),
          priority,
          status: 'OPEN',
          subject: args.dto.subject.trim(),
          description: args.dto.description.trim(),
          requestType,
          requestPayload: requestPayload ? (requestPayload as any) : undefined,
          entitlementSnapshot: entitlements as any,
          subscriptionSnapshot: entitlements.plan
            ? {
                planId: entitlements.plan.id,
                planCode: entitlements.plan.code,
                planName: entitlements.plan.name,
                status: entitlements.subscriptionStatus,
              }
            : {
                planId: null,
                planCode: null,
                planName: null,
                status: entitlements.subscriptionStatus,
              },
        },
      });

      await this.createSupportEvent(tx, supportCase.id, args.actorUserId, 'CASE_CREATED', {
        priority,
        source: 'HOTEL',
        requestType,
      });

      return supportCase;
    });

    await this.prisma.auditLog.create({
      data: {
        hotelId: args.hotelId,
        actorUserId: args.actorUserId,
        action: 'hotel.support.case.create',
        targetType: 'SUPPORT_CASE',
        targetId: created.id,
        metadata: {
          hotelName: hotel.name,
          subject: created.subject,
          category: created.category,
          priority: created.priority,
          requestType: created.requestType ?? null,
        },
      },
    });

    return this.getCaseDetail({
      hotelId: args.hotelId,
      actorUserId: args.actorUserId,
      role: 'ADMIN',
      caseId: created.id,
    });
  }
}
