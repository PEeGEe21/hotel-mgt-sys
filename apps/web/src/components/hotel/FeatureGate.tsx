'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { AlertTriangle, LifeBuoy, LockKeyhole } from 'lucide-react';
import { useHotelEntitlements } from '@/hooks/hotel/useHotelEntitlements';
import {
  type HotelFeatureAccessResponse,
  useHotelFeatureAccess,
} from '@/hooks/hotel/useHotelFeatureAccess';
import { usePermissions } from '@/hooks/usePermissions';
import type { Permission } from '@/lib/permissions';

type FeatureGateProps = {
  flagKey: string;
  title: string;
  description: string;
  children: ReactNode;
  permission?: Permission;
  supportHref?: string;
};

type LockReason = {
  badge: string;
  title: string;
  description: string;
};

function resolveLockReason(
  flagKey: string,
  featureAccess: HotelFeatureAccessResponse | undefined,
  subscriptionStatus: string | undefined,
): LockReason {
  const source = featureAccess?.sources?.[flagKey];
  const status = subscriptionStatus ?? featureAccess?.subscriptionStatus ?? 'UNKNOWN';

  if (['SUSPENDED', 'EXPIRED', 'CANCELLED'].includes(status)) {
    return {
      badge: 'Account status',
      title: 'Unavailable while hotel account access is restricted',
      description:
        'This feature is currently limited by the hotel subscription state. Review the subscription page or contact platform support.',
    };
  }

  if (source?.globalEnabled === false) {
    return {
      badge: 'Platform control',
      title: 'Temporarily disabled by platform support',
      description:
        'This feature exists in your workspace, but the platform team has disabled it globally for now.',
    };
  }

  if (source?.hotelEnabled === false) {
    return {
      badge: 'Hotel rollout',
      title: 'Not enabled for this hotel yet',
      description:
        'Your plan can support this feature, but it has not been rolled out for this hotel yet.',
    };
  }

  if (source?.planEnabled === false) {
    return {
      badge: 'Plan limit',
      title: 'Not included in your current plan',
      description:
        'This feature is available in HotelOS, but your current subscription plan does not include it.',
    };
  }

  if (source?.overrideEnabled === false) {
    return {
      badge: 'Hotel override',
      title: 'Temporarily turned off for this hotel',
      description:
        'A hotel-level override has disabled this feature. Contact your administrator or platform support if you need it restored.',
    };
  }

  return {
    badge: 'Unavailable',
    title: 'This feature is currently unavailable',
    description:
      'HotelOS could not enable this feature for the current hotel context yet. Please contact support if you expected access.',
  };
}

function FeatureLockedPanel({
  title,
  description,
  reason,
  supportHref = '/settings/support',
}: {
  title: string;
  description: string;
  reason: LockReason;
  supportHref?: string;
}) {
  return (
    <div className="rounded-xl border border-amber-500/20 bg-[#161b27] p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-200">
            <LockKeyhole size={11} />
            {reason.badge}
          </span>
          <div>
            <h3 className="text-base font-semibold text-white">{title}</h3>
            <p className="mt-1 text-sm text-slate-400">{description}</p>
          </div>
          <div className="rounded-lg border border-[#1e2536] bg-[#0f1117] px-4 py-3">
            <div className="flex items-start gap-2">
              <AlertTriangle size={15} className="mt-0.5 text-amber-300" />
              <div>
                <p className="text-sm font-medium text-amber-100">{reason.title}</p>
                <p className="mt-1 text-sm text-slate-400">{reason.description}</p>
              </div>
            </div>
          </div>
        </div>
        <Link
          href={supportHref}
          className="inline-flex items-center gap-2 rounded-lg border border-amber-400/20 bg-[#0f1117] px-3 py-2 text-sm font-medium text-amber-200 hover:text-white"
        >
          <LifeBuoy size={14} />
          Contact Support
        </Link>
      </div>
    </div>
  );
}

export function FeatureGate({
  flagKey,
  title,
  description,
  children,
  permission,
  supportHref,
}: FeatureGateProps) {
  const { can, isManagement, ready } = usePermissions();
  const { data: featureAccess, isLoading } = useHotelFeatureAccess();
  const { data: entitlements } = useHotelEntitlements();

  if (permission && ready && !can(permission)) {
    if (!isManagement) return null;
    return (
      <FeatureLockedPanel
        title={title}
        description={description}
        supportHref={supportHref}
        reason={{
          badge: 'Role access',
          title: 'Unavailable for your role',
          description:
            'Your current role does not include access to this area. Ask a hotel administrator if you need it for your work.',
        }}
      />
    );
  }

  if (isLoading) {
    return <>{children}</>;
  }

  if (featureAccess?.flags?.[flagKey] !== false) {
    return <>{children}</>;
  }

  if (!isManagement) {
    return null;
  }

  return (
    <FeatureLockedPanel
      title={title}
      description={description}
      supportHref={supportHref}
      reason={resolveLockReason(flagKey, featureAccess, entitlements?.subscription.status)}
    />
  );
}
