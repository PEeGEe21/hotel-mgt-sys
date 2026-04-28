import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Socket } from 'socket.io';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '@prisma/client';

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

  private async resolveHotelId(args: { userId: string; role: string; staffHotelId: string | null }) {
    if (args.staffHotelId) return args.staffHotelId;

    if (args.role === Role.SUPER_ADMIN || args.role === Role.ADMIN) {
      const roleDashboardHotel = await this.prisma.roleDashboardConfig.findFirst({
        where: { role: args.role as Role },
        select: { hotelId: true },
        orderBy: { createdAt: 'asc' },
      });

      if (roleDashboardHotel?.hotelId) {
        return roleDashboardHotel.hotelId;
      }

      const firstHotel = await this.prisma.hotel.findFirst({
        select: { id: true },
        orderBy: { createdAt: 'asc' },
      });

      return firstHotel?.id ?? null;
    }

    return null;
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

    const hotelId = await this.resolveHotelId({
      userId: payload.sub,
      role: payload.role,
      staffHotelId: user.staff?.hotelId ?? null,
    });

    return {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      impersonatorId: payload.impersonatorId ?? null,
      isImpersonation: Boolean(payload.isImpersonation),
      staffId: user.staff?.id ?? null,
      hotelId,
    };
  }
}
