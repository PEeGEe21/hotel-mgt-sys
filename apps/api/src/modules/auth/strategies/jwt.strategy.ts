import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthSessionService } from '../services/auth-session.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
    private authSessionService: AuthSessionService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get('JWT_SECRET'),
    });
  }

  async validate(payload: {
    sub: string;
    email: string;
    role: string;
    sid?: string;
    impersonatorId?: string | null;
    isImpersonation?: boolean;
  }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, isActive: true, staff: { select: { id: true, hotelId: true } } },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Account not found or inactive.');
    }

    if (payload.sid) {
      await this.authSessionService.validateSession(payload.sid, payload.sub);
      await this.authSessionService.touchSession(payload.sid);
    }

    return {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      sid: payload.sid ?? null,
      impersonatorId: payload.impersonatorId ?? null,
      isImpersonation: Boolean(payload.isImpersonation),
      staffId: user?.staff?.id ?? null,
      hotelId: user?.staff?.hotelId ?? null,
    };
  }
}
