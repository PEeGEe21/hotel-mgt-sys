import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../../prisma/prisma.service';
import { Role } from '@prisma/client';
import { DEFAULT_ROLE_PERMISSIONS } from '../../../common/constants/role-permissions';
import { PERMISSIONS_KEY } from './index';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required || required.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user?.sub) throw new ForbiddenException('Insufficient permissions');

    if (user.role === 'SUPER_ADMIN') return true;

    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.sub },
      select: {
        role: true,
        permissionGrants: true,
        permissionDenies: true,
        staff: { select: { hotelId: true } },
      },
    });

    if (!dbUser) throw new ForbiddenException('Insufficient permissions');

    const role = dbUser.role as Role;
    const hotelId = dbUser.staff?.hotelId;

    let rolePerms = DEFAULT_ROLE_PERMISSIONS[role] ?? [];
    if (hotelId) {
      const record = await this.prisma.rolePermission.findUnique({
        where: { hotelId_role: { hotelId, role } },
      });
      if (record) rolePerms = record.permissions ?? [];
    }

    const effective = new Set(rolePerms);
    (dbUser.permissionGrants ?? []).forEach((p) => effective.add(p));
    (dbUser.permissionDenies ?? []).forEach((p) => effective.delete(p));

    const ok = required.every((p) => effective.has(p));
    if (!ok) throw new ForbiddenException('Insufficient permissions');

    return true;
  }
}
