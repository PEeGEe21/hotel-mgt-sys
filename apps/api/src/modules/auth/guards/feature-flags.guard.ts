import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../../prisma/prisma.service';

export const FEATURE_FLAGS_KEY = 'feature_flags';
export const RequireFeatureFlags = (...flags: string[]) => SetMetadata(FEATURE_FLAGS_KEY, flags);

const HOTEL_FLAG_FIELD_MAP: Record<string, string> = {
  keycard_auth: 'keycardAuthEnabled',
};

@Injectable()
export class FeatureFlagsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(FEATURE_FLAGS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required || required.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    const hotelId = user?.hotelId ?? null;
    const role = user?.role ?? null;

    if (role === 'SUPER_ADMIN') {
      return true;
    }

    const flags = await this.prisma.featureFlag.findMany({
      where: {
        key: {
          in: required,
        },
      },
      select: {
        key: true,
        enabled: true,
      },
    });

    const flagMap = new Map(flags.map((flag) => [flag.key, flag.enabled !== false]));

    for (const flagKey of required) {
      if (flagMap.get(flagKey) === false) {
        throw new ForbiddenException(`Feature ${flagKey} is disabled.`);
      }
    }

    if (!hotelId) {
      const missing = required.filter((flagKey) => !flagMap.has(flagKey));
      if (missing.length > 0) {
        throw new ForbiddenException(`Feature ${missing[0]} is not enabled.`);
      }
      return true;
    }

    const hotelFieldSelections = required
      .map((flagKey) => HOTEL_FLAG_FIELD_MAP[flagKey])
      .filter(Boolean)
      .reduce<Record<string, boolean>>((acc, field) => {
        acc[field] = true;
        return acc;
      }, {});

    if (Object.keys(hotelFieldSelections).length === 0) {
      const missing = required.filter((flagKey) => !flagMap.has(flagKey));
      if (missing.length > 0) {
        throw new ForbiddenException(`Feature ${missing[0]} is not enabled.`);
      }
      return true;
    }

    const hotel = await (this.prisma.hotel as any).findUnique({
      where: { id: hotelId },
      select: {
        id: true,
        ...hotelFieldSelections,
      },
    });

    if (!hotel) {
      throw new ForbiddenException('Hotel context is unavailable for this feature.');
    }

    for (const flagKey of required) {
      const hotelField = HOTEL_FLAG_FIELD_MAP[flagKey];
      if (!hotelField) continue;
      if (hotel[hotelField] !== true) {
        throw new ForbiddenException(`Feature ${flagKey} is not enabled for this hotel.`);
      }
    }

    return true;
  }
}
