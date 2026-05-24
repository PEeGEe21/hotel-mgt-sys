import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export type ResolvedEntitlementItem = {
  key: string;
  name: string | null;
  description: string | null;
  category: string | null;
  scopeType: string;
  rolloutStage: string;
  planRequired: string | null;
  globalEnabled: boolean;
  defaultEnabled: boolean;
  planEnabled: boolean | null;
  planLimitValue: string | null;
  overrideEnabled: boolean | null;
  overrideLimitValue: string | null;
  overrideReason: string | null;
  hotelRolloutEnabled: boolean | null;
  effectiveEnabled: boolean;
  effectiveLimitValue: string | null;
};

export type HotelEntitlementSnapshot = {
  hotelId: string;
  plan: {
    id: string | null;
    code: string | null;
    name: string | null;
  } | null;
  subscriptionStatus: string;
  features: Record<string, boolean>;
  limits: Record<string, string | number | null>;
  warnings: string[];
  items: ResolvedEntitlementItem[];
};

@Injectable()
export class EntitlementsService {
  constructor(private readonly prisma: PrismaService) {}

  private buildSubscriptionWarnings(subscription: any | null) {
    const warnings: string[] = [];

    if (!subscription) {
      warnings.push('No subscription has been assigned to this hotel yet.');
      return warnings;
    }

    switch (subscription.status) {
      case 'TRIAL':
        warnings.push(
          subscription.trialEndsAt
            ? `Trial access is active until ${subscription.trialEndsAt.toISOString()}.`
            : 'Hotel is still on a trial subscription.',
        );
        break;
      case 'GRACE':
        warnings.push(
          subscription.graceEndsAt
            ? `Subscription is in grace until ${subscription.graceEndsAt.toISOString()}.`
            : 'Subscription is currently in grace state.',
        );
        break;
      case 'SUSPENDED':
        warnings.push('Subscription is suspended and may affect tenant access.');
        break;
      case 'EXPIRED':
        warnings.push('Subscription is expired and needs renewal attention.');
        break;
      case 'CANCELLED':
        warnings.push('Subscription has been cancelled.');
        break;
      default:
        break;
    }

    return warnings;
  }

  async resolveHotelEntitlements(hotelId: string): Promise<HotelEntitlementSnapshot> {
    const hotel = await (this.prisma.hotel as any).findUnique({
      where: { id: hotelId },
      select: {
        id: true,
        name: true,
        keycardAuthEnabled: true,
      },
    });
    if (!hotel) {
      throw new NotFoundException('Hotel not found.');
    }

    const subscription = await (this.prisma as any).hotelSubscription.findFirst({
      where: { hotelId },
      orderBy: [{ updatedAt: 'desc' }],
      include: { plan: true },
    });

    const [flags, overrides] = await Promise.all([
      (this.prisma as any).featureFlag.findMany({
        orderBy: [{ category: 'asc' }, { key: 'asc' }],
        include: {
          planEntitlements: subscription?.planId
            ? {
                where: { planId: subscription.planId },
              }
            : false,
        },
      }),
      (this.prisma as any).hotelFeatureOverride.findMany({
        where: { hotelId },
      }),
    ]);

    const overrideMap = new Map<string, any>(overrides.map((entry: any) => [entry.flagKey, entry]));
    const features: Record<string, boolean> = {};
    const limits: Record<string, string | number | null> = {};
    const items: ResolvedEntitlementItem[] = [];

    for (const flag of flags) {
      const planEntitlement: any =
        Array.isArray(flag.planEntitlements) ? flag.planEntitlements[0] ?? null : null;
      const override: any = overrideMap.get(flag.key) ?? null;

      const globalEnabled = flag.enabled !== false;
      const defaultEnabled = flag.defaultEnabled !== false;
      const planEnabled = planEntitlement ? planEntitlement.enabled === true : null;
      const planLimitValue =
        planEntitlement?.limitValue !== null && planEntitlement?.limitValue !== undefined
          ? String(planEntitlement.limitValue)
          : null;
      const overrideEnabled = override ? override.enabled === true : null;
      const overrideLimitValue =
        override?.limitValue !== null && override?.limitValue !== undefined
          ? String(override.limitValue)
          : null;
      const hotelRolloutEnabled = flag.key === 'keycard_auth' ? hotel.keycardAuthEnabled === true : null;

      let enabled = defaultEnabled;
      let effectiveLimitValue: string | null = null;

      if (planEntitlement) {
        enabled = planEntitlement.enabled === true;
        effectiveLimitValue = planLimitValue;
      }

      if (override) {
        enabled = override.enabled === true;
        if (overrideLimitValue !== null) {
          effectiveLimitValue = overrideLimitValue;
        }
      }

      let effectiveEnabled = globalEnabled && enabled;
      if (flag.key === 'keycard_auth') {
        effectiveEnabled = effectiveEnabled && hotel.keycardAuthEnabled === true;
      }

      features[flag.key] = effectiveEnabled;
      limits[flag.key] = effectiveLimitValue;

      items.push({
        key: flag.key,
        name: flag.name ?? null,
        description: flag.description ?? null,
        category: flag.category ?? null,
        scopeType: flag.scopeType,
        rolloutStage: flag.rolloutStage,
        planRequired: flag.planRequired ?? null,
        globalEnabled,
        defaultEnabled,
        planEnabled,
        planLimitValue,
        overrideEnabled,
        overrideLimitValue,
        overrideReason: override?.reason ?? null,
        hotelRolloutEnabled,
        effectiveEnabled,
        effectiveLimitValue,
      });
    }

    return {
      hotelId,
      plan: subscription?.plan
        ? {
            id: subscription.plan.id,
            code: subscription.plan.code,
            name: subscription.plan.name,
          }
        : null,
      subscriptionStatus: subscription?.status ?? 'NONE',
      features,
      limits,
      warnings: this.buildSubscriptionWarnings(subscription),
      items,
    };
  }
}
