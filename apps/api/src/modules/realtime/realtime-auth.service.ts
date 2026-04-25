import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Socket } from 'socket.io';
import { PrismaService } from '../../prisma/prisma.service';

type RealtimeJwtPayload = {
  sub: string;
  email: string;
  role: string;
  impersonatorId?: string | null;
  isImpersonation?: boolean;
};

export type RealtimeUser = {
  sub: string;
  email: string;
  role: string;
  impersonatorId: string | null;
  isImpersonation: boolean;
  staffId: string | null;
  hotelId: string | null;
};

@Injectable()
export class RealtimeAuthService {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  private parseCookies(cookieHeader?: string | null) {
    if (!cookieHeader) return new Map<string, string>();

    return new Map(
      cookieHeader
        .split(';')
        .map((segment) => segment.trim())
        .filter(Boolean)
        .map((segment) => {
          const separatorIndex = segment.indexOf('=');
          if (separatorIndex === -1) return [segment, ''];
          return [
            decodeURIComponent(segment.slice(0, separatorIndex).trim()),
            decodeURIComponent(segment.slice(separatorIndex + 1).trim()),
          ];
        }),
    );
  }

  private extractToken(client: Socket) {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.trim()) {
      return authToken.trim();
    }

    const authorizationHeader = client.handshake.headers.authorization;
    if (typeof authorizationHeader === 'string' && authorizationHeader.startsWith('Bearer ')) {
      return authorizationHeader.slice(7).trim();
    }

    const cookies = this.parseCookies(client.handshake.headers.cookie);
    return cookies.get('hotel_access_token') ?? null;
  }

  async authenticate(client: Socket): Promise<RealtimeUser> {
    const token = this.extractToken(client);
    if (!token) {
      throw new UnauthorizedException('Missing realtime access token.');
    }

    const payload = await this.jwtService.verifyAsync<RealtimeJwtPayload>(token, {
      secret: this.configService.get<string>('JWT_SECRET'),
    });

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        isActive: true,
        staff: {
          select: {
            id: true,
            hotelId: true,
          },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Account not found or inactive.');
    }

    return {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      impersonatorId: payload.impersonatorId ?? null,
      isImpersonation: Boolean(payload.isImpersonation),
      staffId: user.staff?.id ?? null,
      hotelId: user.staff?.hotelId ?? null,
    };
  }
}
