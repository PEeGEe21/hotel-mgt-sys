import { Injectable, UnauthorizedException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../../../prisma/prisma.service';
import { Role } from '@prisma/client';
import { DEFAULT_ROLE_PERMISSIONS } from '../../../common/constants/role-permissions';
import { UpdateMeDto } from '../dtos/update-me.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  // ─── Validate user credentials (called by LocalStrategy) ──────────────────
  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { staff: { include: { hotel: true } } },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    return user;
  }

  // ─── Login — returns access + refresh tokens ───────────────────────────────
  async login(user: any, meta?: { ipAddress?: string | null; userAgent?: string | null }) {
    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccessToken(user),
      this.generateRefreshToken(user.id),
    ]);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const rolePermissions = await this.getRolePermissions(user.staff?.hotelId, user.role);

    const result = {
      accessToken,
      refreshToken,
      user: { ...this.sanitizeUser(user), rolePermissions },
      hotel: this.sanitizeHotel(user.staff?.hotel),
    };

    if (meta?.ipAddress || meta?.userAgent) {
      await this.logAudit({
        actorUserId: user.id,
        hotelId: user.staff?.hotelId ?? null,
        action: 'auth.login',
        ipAddress: meta.ipAddress ?? null,
        userAgent: meta.userAgent ?? null,
      });
    }

    return result;
  }

  // ─── Refresh — rotate refresh token, issue new access token ───────────────
  async refresh(token: string) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token },
      include: { user: { include: { staff: true } } },
    });

    if (!stored || stored.expiresAt < new Date()) {
      // Delete expired token if found
      if (stored) {
        await this.prisma.refreshToken.delete({ where: { token } });
      }
      throw new UnauthorizedException('Refresh token expired or invalid.');
    }

    if (!stored.user.isActive) {
      throw new UnauthorizedException('Account is inactive.');
    }

    // Rotate — delete old, issue new
    await this.prisma.refreshToken.delete({ where: { token } });

    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccessToken(stored.user, stored.impersonatorId ?? null),
      this.generateRefreshToken(stored.user.id, {
        impersonatorId: stored.impersonatorId ?? null,
        isImpersonation: stored.isImpersonation ?? false,
      }),
    ]);

    return { accessToken, refreshToken };
  }

  // ─── Logout — invalidate refresh token ────────────────────────────────────
  async logout(
    userId: string,
    refreshToken?: string,
    meta?: { ipAddress?: string | null; userAgent?: string | null },
  ) {
    if (refreshToken) {
      await this.prisma.refreshToken.deleteMany({
        where: { userId, token: refreshToken },
      });
    }
    if (meta?.ipAddress || meta?.userAgent) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { staff: { select: { hotelId: true } } },
      });
      await this.logAudit({
        actorUserId: userId,
        hotelId: user?.staff?.hotelId ?? null,
        action: 'auth.logout',
        ipAddress: meta.ipAddress ?? null,
        userAgent: meta.userAgent ?? null,
      });
    }
    return { message: 'Logged out successfully.' };
  }

  // ─── Logout all sessions ───────────────────────────────────────────────────
  async logoutAll(
    userId: string,
    meta?: { ipAddress?: string | null; userAgent?: string | null },
  ) {
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
    if (meta?.ipAddress || meta?.userAgent) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { staff: { select: { hotelId: true } } },
      });
      await this.logAudit({
        actorUserId: userId,
        hotelId: user?.staff?.hotelId ?? null,
        action: 'auth.logout_all',
        ipAddress: meta.ipAddress ?? null,
        userAgent: meta.userAgent ?? null,
      });
    }
    return { message: 'All sessions terminated.' };
  }

  // ─── Get current user profile ─────────────────────────────────────────────
  async getMe(
    userId: string,
    meta?: { impersonatorId?: string | null; isImpersonation?: boolean },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { staff: { include: { hotel: true } } },
    });
    if (!user) throw new UnauthorizedException('User not found.');
    const rolePermissions = await this.getRolePermissions(user.staff?.hotelId, user.role);
    return {
      user: {
        ...this.sanitizeUser(user),
        rolePermissions,
        impersonatorId: meta?.impersonatorId ?? null,
        isImpersonation: Boolean(meta?.isImpersonation),
      },
      hotel: this.sanitizeHotel(user.staff?.hotel),
    };
  }

  // ─── Update current user profile ─────────────────────────────────────────
  async updateMe(userId: string, dto: UpdateMeDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { staff: true },
    });
    if (!user) throw new UnauthorizedException('User not found.');

    if (dto.email && dto.email !== user.email) {
      const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (exists) throw new BadRequestException('Email already in use.');
    }

    const staffUpdates: any = {};
    if (dto.name) {
      const parts = dto.name.trim().split(/\s+/).filter(Boolean);
      if (parts.length >= 1) staffUpdates.firstName = parts[0];
      if (parts.length >= 2) staffUpdates.lastName = parts.slice(1).join(' ');
    }
    if (dto.phone !== undefined) staffUpdates.phone = dto.phone;
    if (dto.avatar !== undefined) staffUpdates.avatar = dto.avatar;

    await this.prisma.$transaction(async (tx) => {
      if (dto.email && dto.email !== user.email) {
        await tx.user.update({
          where: { id: user.id },
          data: { email: dto.email },
        });
      }

      if (user.staff && Object.keys(staffUpdates).length) {
        await tx.staff.update({
          where: { id: user.staff.id },
          data: staffUpdates,
        });
      }
    });

    const updated = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { staff: { include: { hotel: true } } },
    });

    if (!updated) throw new UnauthorizedException('User not found.');
    const rolePermissions = await this.getRolePermissions(updated.staff?.hotelId, updated.role);
    return {
      user: { ...this.sanitizeUser(updated), rolePermissions },
      hotel: this.sanitizeHotel(updated.staff?.hotel),
    };
  }

  // ─── Change password ───────────────────────────────────────────────────────
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found.');

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new BadRequestException('Current password is incorrect.');

    if (newPassword.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters.');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash, mustChangePassword: false },
    });

    return { message: 'Password changed successfully.' };
  }

  // ─── Reset attendance PIN (current user) ─────────────────────────────────
  async resetAttendancePin(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { staff: true },
    });
    if (!user || !user.staff) throw new UnauthorizedException('User not found.');

    const pin = String(Math.floor(1000 + Math.random() * 9000));
    const pinHash = await bcrypt.hash(pin, 12);

    await this.prisma.staff.update({
      where: { id: user.staff.id },
      data: {
        pinHash,
        pinUpdatedAt: new Date(),
        pinLastUsedAt: null,
        pinFailedAttempts: 0,
      },
    });

    return { pin };
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────
  private generateAccessToken(user: any, impersonatorId?: string | null) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      impersonatorId: impersonatorId ?? null,
      isImpersonation: Boolean(impersonatorId),
    };
    return this.jwt.signAsync(payload, {
      secret: this.config.get('JWT_SECRET'),
      expiresIn: this.config.get('JWT_EXPIRES_IN', '15m'),
    });
  }

  private async generateRefreshToken(
    userId: string,
    opts?: { impersonatorId?: string | null; isImpersonation?: boolean },
  ) {
    const token = crypto.randomBytes(64).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await this.prisma.refreshToken.create({
      data: {
        token,
        userId,
        expiresAt,
        impersonatorId: opts?.impersonatorId ?? null,
        isImpersonation: Boolean(opts?.isImpersonation),
      },
    });

    return token;
  }

  async impersonate(
    impersonatorId: string,
    targetUserId: string,
    meta?: { ipAddress?: string | null; userAgent?: string | null },
  ) {
    if (impersonatorId === targetUserId) {
      throw new BadRequestException('Cannot impersonate yourself.');
    }

    const [impersonator, target] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: impersonatorId },
        include: { staff: { include: { hotel: true } } },
      }),
      this.prisma.user.findUnique({
        where: { id: targetUserId },
        include: { staff: { include: { hotel: true } } },
      }),
    ]);

    if (!impersonator || !impersonator.isActive) {
      throw new UnauthorizedException('Impersonator not found or inactive.');
    }
    if (!target || !target.isActive) {
      throw new UnauthorizedException('Target user not found or inactive.');
    }
    if (!target.staff?.hotelId) {
      throw new BadRequestException('Target user is not linked to a hotel.');
    }
    if (impersonator.staff?.hotelId && target.staff?.hotelId !== impersonator.staff?.hotelId) {
      throw new ForbiddenException('Cannot impersonate users from another hotel.');
    }

    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccessToken(target, impersonator.id),
      this.generateRefreshToken(target.id, {
        impersonatorId: impersonator.id,
        isImpersonation: true,
      }),
    ]);

    const rolePermissions = await this.getRolePermissions(target.staff?.hotelId, target.role);

    await this.logAudit({
      actorUserId: impersonator.id,
      hotelId: target.staff?.hotelId ?? null,
      action: 'auth.impersonate.start',
      targetUserId: target.id,
      ipAddress: meta?.ipAddress ?? null,
      userAgent: meta?.userAgent ?? null,
      metadata: { targetEmail: target.email },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        ...this.sanitizeUser(target),
        rolePermissions,
        impersonatorId: impersonator.id,
        isImpersonation: true,
      },
      hotel: this.sanitizeHotel(target.staff?.hotel),
    };
  }

  async stopImpersonation(
    currentUserId: string,
    impersonatorId: string | null,
    refreshToken: string | null,
    meta?: { ipAddress?: string | null; userAgent?: string | null },
  ) {
    if (!impersonatorId) {
      throw new BadRequestException('Not currently impersonating.');
    }

    if (refreshToken) {
      await this.prisma.refreshToken.deleteMany({
        where: { userId: currentUserId, token: refreshToken },
      });
    }

    const impersonator = await this.prisma.user.findUnique({
      where: { id: impersonatorId },
      include: { staff: { include: { hotel: true } } },
    });
    if (!impersonator || !impersonator.isActive) {
      throw new UnauthorizedException('Impersonator not found or inactive.');
    }

    const [accessToken, newRefreshToken] = await Promise.all([
      this.generateAccessToken(impersonator, null),
      this.generateRefreshToken(impersonator.id),
    ]);

    const rolePermissions = await this.getRolePermissions(
      impersonator.staff?.hotelId,
      impersonator.role,
    );

    await this.logAudit({
      actorUserId: impersonator.id,
      hotelId: impersonator.staff?.hotelId ?? null,
      action: 'auth.impersonate.stop',
      targetUserId: currentUserId,
      ipAddress: meta?.ipAddress ?? null,
      userAgent: meta?.userAgent ?? null,
    });

    return {
      accessToken,
      refreshToken: newRefreshToken,
      user: {
        ...this.sanitizeUser(impersonator),
        rolePermissions,
        impersonatorId: null,
        isImpersonation: false,
      },
      hotel: this.sanitizeHotel(impersonator.staff?.hotel),
    };
  }

  private async logAudit(params: {
    actorUserId: string;
    hotelId: string | null;
    action: string;
    targetType?: string | null;
    targetId?: string | null;
    targetUserId?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    metadata?: any;
  }) {
    if (!params.hotelId) return;
    await this.prisma.auditLog.create({
      data: {
        hotelId: params.hotelId,
        actorUserId: params.actorUserId,
        action: params.action,
        targetType: params.targetType ?? null,
        targetId: params.targetId ?? null,
        targetUserId: params.targetUserId ?? null,
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
        metadata: params.metadata ?? null,
      },
    });
  }

  // ─── Public hotel info (for login page branding — no auth required) ────────
  async getPublicHotelInfo(domain?: string) {
    const hotel = domain
      ? await this.prisma.hotel.findFirst({
          where: {
            OR: [
              { domain },
              { domain: domain.replace(/^www\./, '') }, // strip www
            ],
          },
        })
      : null;

    // Fallback to first hotel if domain not matched (single-tenant / dev)
    const resolved = hotel ?? (await this.prisma.hotel.findFirst());
    if (!resolved) return null;

    return {
      name: resolved.name,
      city: resolved.city,
      country: resolved.country,
      domain: resolved.domain,
      logo: resolved.logo ?? null,
      geofenceEnabled: resolved.geofenceEnabled ?? false,
      geofenceRadiusMeters: resolved.geofenceRadiusMeters ?? 0,
      attendancePinRequired: resolved.attendancePinRequired ?? false,
      attendanceKioskEnabled: resolved.attendanceKioskEnabled ?? true,
      attendancePersonalEnabled: resolved.attendancePersonalEnabled ?? true,
    };
  }

  private sanitizeUser(user: any) {
    const staff = user.staff;
    const fullName = staff ? `${staff.firstName} ${staff.lastName}`.trim() : user.email;
    const username = user.email?.includes('@') ? user.email.split('@')[0] : user.email;

    return {
      id: user.id,
      email: user.email,
      name: fullName,
      username,
      role: user.role,
      department: staff?.department ?? null,
      position: staff?.position ?? null,
      phone: staff?.phone ?? null,
      firstName: staff?.firstName ?? null,
      lastName: staff?.lastName ?? null,
      employeeCode: staff?.employeeCode ?? null,
      attendancePinSet: !!staff?.pinHash,
      joinDate: staff?.hireDate ?? null,
      lastLoginAt: user.lastLoginAt ?? null,
      avatar: staff?.avatar ?? null,
      mustChangePassword: user.mustChangePassword ?? false,
      permissionOverrides: {
        grants: user.permissionGrants ?? [],
        denies: user.permissionDenies ?? [],
      },
    };
  }

  private async getRolePermissions(hotelId: string | undefined, role: Role): Promise<string[]> {
    if (!hotelId) return DEFAULT_ROLE_PERMISSIONS[role] ?? [];
    const existing = await this.prisma.rolePermission.findUnique({
      where: { hotelId_role: { hotelId, role } },
    });
    if (existing) return existing.permissions ?? [];

    const defaults = DEFAULT_ROLE_PERMISSIONS[role] ?? [];
    await this.prisma.rolePermission.create({
      data: { hotelId, role, permissions: defaults },
    });
    return defaults;
  }

  private sanitizeHotel(hotel: any) {
    if (!hotel) return null;
    return {
      id: hotel.id,
      name: hotel.name,
      domain: hotel.domain ?? null,
      city: hotel.city,
      country: hotel.country,
      currency: hotel.currency,
      timezone: hotel.timezone,
      logo: hotel.logo ?? null,
      email: hotel.email,
      phone: hotel.phone,
      geofenceEnabled: hotel.geofenceEnabled ?? false,
      geofenceRadiusMeters: hotel.geofenceRadiusMeters ?? 0,
      attendancePinRequired: hotel.attendancePinRequired ?? false,
      attendanceKioskEnabled: hotel.attendanceKioskEnabled ?? true,
      attendancePersonalEnabled: hotel.attendancePersonalEnabled ?? true,
    };
  }
}
