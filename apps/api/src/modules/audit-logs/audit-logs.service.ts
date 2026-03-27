import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditLogsService {
  constructor(private prisma: PrismaService) {}

  async list(params: {
    hotelId: string;
    page?: number;
    limit?: number;
    action?: string;
    actorUserId?: string;
    targetUserId?: string;
    search?: string;
  }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(Math.max(params.limit ?? 20, 5), 100);
    const skip = (page - 1) * limit;

    const where: any = { hotelId: params.hotelId };
    if (params.action) where.action = { contains: params.action, mode: 'insensitive' };
    if (params.actorUserId) where.actorUserId = params.actorUserId;
    if (params.targetUserId) where.targetUserId = params.targetUserId;

    if (params.search) {
      const q = params.search;
      where.OR = [
        { action: { contains: q, mode: 'insensitive' } },
        { actor: { email: { contains: q, mode: 'insensitive' } } },
        { targetUser: { email: { contains: q, mode: 'insensitive' } } },
        { actor: { staff: { firstName: { contains: q, mode: 'insensitive' } } } },
        { actor: { staff: { lastName: { contains: q, mode: 'insensitive' } } } },
        { targetUser: { staff: { firstName: { contains: q, mode: 'insensitive' } } } },
        { targetUser: { staff: { lastName: { contains: q, mode: 'insensitive' } } } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          actor: { select: { id: true, email: true, staff: { select: { firstName: true, lastName: true } } } },
          targetUser: { select: { id: true, email: true, staff: { select: { firstName: true, lastName: true } } } },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    const logs = rows.map((row) => ({
      id: row.id,
      action: row.action,
      targetType: row.targetType ?? null,
      targetId: row.targetId ?? null,
      targetUserId: row.targetUserId ?? null,
      ipAddress: row.ipAddress ?? null,
      userAgent: row.userAgent ?? null,
      metadata: row.metadata ?? null,
      createdAt: row.createdAt,
      actor: {
        id: row.actor.id,
        email: row.actor.email,
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
    }));

    return {
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      meta: {
        total,
        current_page: page,
        per_page: limit,
        last_page: Math.ceil(total / limit),
        from: total === 0 ? 0 : skip + 1,
        to: Math.min(skip + limit, total),
      },
    };
  }
}
