import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '@prisma/client';
import { DEFAULT_ROLE_PERMISSIONS, LOCKED_ROLES } from '../../common/constants/role-permissions';
import { UpdateRolePermissionsDto } from './dtos/update-role-permissions.dto';

@Injectable()
export class PermissionsService {
  constructor(private prisma: PrismaService) {}

  private normalize(perms: string[]) {
    return Array.from(new Set(perms)).sort();
  }

  async listRolePermissions(hotelId: string) {
    const roles = Object.keys(DEFAULT_ROLE_PERMISSIONS) as Role[];
    const existing = await this.prisma.rolePermission.findMany({ where: { hotelId } });
    const byRole = new Map(existing.map((r) => [r.role, r]));

    const missing = roles.filter((role) => !byRole.has(role));
    if (missing.length) {
      await this.prisma.rolePermission.createMany({
        data: missing.map((role) => ({
          hotelId,
          role,
          permissions: DEFAULT_ROLE_PERMISSIONS[role] ?? [],
        })),
      });
    }

    const records = await this.prisma.rolePermission.findMany({
      where: { hotelId },
      orderBy: { role: 'asc' },
    });

    return records.map((r) => ({ role: r.role, permissions: r.permissions ?? [] }));
  }

  async updateRolePermissions(hotelId: string, actorUserId: string, dto: UpdateRolePermissionsDto) {
    if (!dto.roles?.length) return { success: true };

    const updates = dto.roles.map((r) => ({
      role: r.role,
      permissions: this.normalize(r.permissions ?? []),
    }));

    for (const item of updates) {
      if (LOCKED_ROLES.includes(item.role)) {
        throw new BadRequestException(`${item.role} permissions cannot be modified.`);
      }
    }

    await this.prisma.$transaction(async (tx) => {
      for (const item of updates) {
        const existing = await tx.rolePermission.findUnique({
          where: { hotelId_role: { hotelId, role: item.role } },
        });

        const before = this.normalize(existing?.permissions ?? DEFAULT_ROLE_PERMISSIONS[item.role] ?? []);
        const after = item.permissions;

        const changed = before.join('|') !== after.join('|');
        if (!changed) continue;

        await tx.rolePermission.upsert({
          where: { hotelId_role: { hotelId, role: item.role } },
          update: { permissions: after },
          create: { hotelId, role: item.role, permissions: after },
        });

        await tx.permissionAuditLog.create({
          data: {
            hotelId,
            actorUserId,
            targetType: 'ROLE',
            targetRole: item.role,
            before,
            after,
          },
        });
      }
    });

    return { success: true };
  }

  async listAudit(hotelId: string, limit = 50) {
    const rows = await this.prisma.permissionAuditLog.findMany({
      where: { hotelId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 200),
      include: {
        actor: { select: { id: true, email: true, staff: { select: { firstName: true, lastName: true } } } },
        targetUser: { select: { id: true, email: true, staff: { select: { firstName: true, lastName: true } } } },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      targetType: row.targetType,
      targetRole: row.targetRole,
      before: row.before,
      after: row.after,
      reason: row.reason,
      createdAt: row.createdAt,
      actor: {
        id: row.actor.id,
        email: row.actor.email,
        name: row.actor.staff
          ? `${row.actor.staff.firstName} ${row.actor.staff.lastName}`
          : row.actor.email,
      },
      targetUser: row.targetUser
        ? {
            id: row.targetUser.id,
            email: row.targetUser.email,
            name: row.targetUser.staff
              ? `${row.targetUser.staff.firstName} ${row.targetUser.staff.lastName}`
              : row.targetUser.email,
          }
        : null,
    }));
  }
}
