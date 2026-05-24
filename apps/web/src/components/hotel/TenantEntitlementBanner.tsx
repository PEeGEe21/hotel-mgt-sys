'use client';

import Link from 'next/link';
import { AlertTriangle, LifeBuoy } from 'lucide-react';
import { useHotelEntitlements } from '@/hooks/hotel/useHotelEntitlements';

export function TenantEntitlementBanner({ compact = false }: { compact?: boolean }) {
  const { data } = useHotelEntitlements();
  const warnings = data?.warnings ?? [];
  const openCases = data?.support.openCasesCount ?? 0;

  if (warnings.length === 0 && openCases === 0) return null;

  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-amber-300">
            <AlertTriangle size={16} />
            <p className="text-sm font-semibold">
              {data?.subscription.plan?.name ?? 'Hotel access'} status: {data?.subscription.status ?? 'Unknown'}
            </p>
          </div>
          <div className="space-y-1">
            {warnings.slice(0, compact ? 1 : 3).map((warning) => (
              <p key={warning} className="text-sm text-amber-100/90">
                {warning}
              </p>
            ))}
            {openCases > 0 ? (
              <p className="text-sm text-amber-100/90">
                {openCases} open support {openCases === 1 ? 'case is' : 'cases are'} currently linked to this hotel.
              </p>
            ) : null}
          </div>
        </div>
        <Link
          href="/settings/support"
          className="inline-flex items-center gap-2 rounded-lg border border-amber-400/20 bg-[#161b27] px-3 py-2 text-sm font-medium text-amber-200 hover:text-white"
        >
          <LifeBuoy size={14} />
          Open Support
        </Link>
      </div>
    </div>
  );
}
