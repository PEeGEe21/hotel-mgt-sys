import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../../../prisma/prisma.service';

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
  async login(user: any) {
    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccessToken(user),
      this.generateRefreshToken(user.id),
    ]);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      accessToken,
      refreshToken,
      user: this.sanitizeUser(user),
      hotel: this.sanitizeHotel(user.staff?.hotel),
    };
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
      this.generateAccessToken(stored.user),
      this.generateRefreshToken(stored.user.id),
    ]);

    return { accessToken, refreshToken };
  }

  // ─── Logout — invalidate refresh token ────────────────────────────────────
  async logout(userId: string, refreshToken: string) {
    await this.prisma.refreshToken.deleteMany({
      where: { userId, token: refreshToken },
    });
    return { message: 'Logged out successfully.' };
  }

  // ─── Logout all sessions ───────────────────────────────────────────────────
  async logoutAll(userId: string) {
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
    return { message: 'All sessions terminated.' };
  }

  // ─── Get current user profile ─────────────────────────────────────────────
  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { staff: { include: { hotel: true } } },
    });
    if (!user) throw new UnauthorizedException('User not found.');
    return {
      user: this.sanitizeUser(user),
      hotel: this.sanitizeHotel(user.staff?.hotel),
    };
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────
  private generateAccessToken(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    return this.jwt.signAsync(payload, {
      secret: this.config.get('JWT_SECRET'),
      expiresIn: this.config.get('JWT_EXPIRES_IN', '15m'),
    });
  }

  private async generateRefreshToken(userId: string) {
    const token = crypto.randomBytes(64).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await this.prisma.refreshToken.create({
      data: { token, userId, expiresAt },
    });

    return token;
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
    };
  }

  private sanitizeUser(user: any) {
    return {
      id: user.id,
      email: user.email,
      name: user.staff ? `${user.staff.firstName} ${user.staff.lastName}` : user.email,
      role: user.role,
      department: user.staff?.department ?? null,
      position: user.staff?.position ?? null,
      permissionOverrides: {
        grants: user.permissionGrants ?? [],
        denies: user.permissionDenies ?? [],
      },
    };
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
    };
  }
}
