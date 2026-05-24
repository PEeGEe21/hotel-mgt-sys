'use client';

import { CreditCard, LifeBuoy, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useHotelEntitlements } from '@/hooks/hotel/useHotelEntitlements';
import { usePermissions } from '@/hooks/usePermissions';

function formatFeatureLabel(key: string) {
  return key.replaceAll('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function SubscriptionSettingsPage() {
  const { data, isLoading } = useHotelEntitlements();
  const { isManagement } = usePermissions();
  const unavailableFeatures = (data?.items ?? []).filter((item) => !item.effectiveEnabled);

  return (
    <div className="space-y-6 max-w-full">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Subscription</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Review your hotel&apos;s plan, access state, and feature availability.
        </p>
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-[#1e2536] bg-[#161b27] p-5 text-sm text-slate-400">
          Loading subscription details...
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-[#1e2536] bg-[#161b27] p-5">
              <div className="flex items-center gap-3 text-slate-200">
                <CreditCard size={18} className="text-blue-400" />
                <h2 className="text-sm font-semibold">Current Plan</h2>
              </div>
              <p className="mt-4 text-xl font-semibold text-white">
                {data?.subscription.plan?.name ?? 'No assigned plan'}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {data?.subscription.plan?.code ?? 'UNASSIGNED'} · {data?.subscription.status ?? 'Unknown'}
              </p>
            </div>

            <div className="rounded-xl border border-[#1e2536] bg-[#161b27] p-5">
              <div className="flex items-center gap-3 text-slate-200">
                <ShieldCheck size={18} className="text-emerald-400" />
                <h2 className="text-sm font-semibold">Feature Access</h2>
              </div>
              <p className="mt-4 text-xl font-semibold text-white">
                {data ? Object.values(data.features).filter(Boolean).length : 0}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                enabled out of {data ? Object.keys(data.features).length : 0} tracked features
              </p>
            </div>

            <div className="rounded-xl border border-[#1e2536] bg-[#161b27] p-5">
              <div className="flex items-center gap-3 text-slate-200">
                <LifeBuoy size={18} className="text-amber-400" />
                <h2 className="text-sm font-semibold">Support</h2>
              </div>
              <p className="mt-4 text-xl font-semibold text-white">{data?.support.openCasesCount ?? 0}</p>
              <p className="mt-1 text-sm text-slate-500">open cases · tier {data?.support.supportTier ?? 'STANDARD'}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[0.9fr_1.1fr] gap-4">
            <div className="rounded-xl border border-[#1e2536] bg-[#161b27] p-5">
              <h2 className="text-sm font-semibold text-slate-200">Subscription Status</h2>
              <div className="mt-4 space-y-3 text-sm text-slate-400">
                <p>Hotel: <span className="text-slate-200">{data?.hotel.name}</span></p>
                <p>Status: <span className="text-slate-200">{data?.subscription.status ?? 'Unknown'}</span></p>
                <p>Support mode: <span className="text-slate-200">{data?.support.contactMode ?? 'Unknown'}</span></p>
                {isManagement ? (
                  <p>Contact email: <span className="text-slate-200">{data?.hotel.email ?? 'Not set'}</span></p>
                ) : (
                  <p>Billing details are visible to hotel admins and managers.</p>
                )}
              </div>

              <div className="mt-5 space-y-2">
                {(data?.warnings ?? []).length === 0 ? (
                  <p className="rounded-lg border border-[#1e2536] bg-[#111623] px-3 py-2 text-sm text-slate-400">
                    No subscription warnings right now.
                  </p>
                ) : (
                  data?.warnings.map((warning) => (
                    <p key={warning} className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
                      {warning}
                    </p>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-xl border border-[#1e2536] bg-[#161b27] p-5">
              <h2 className="text-sm font-semibold text-slate-200">Included Features</h2>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                {data?.items.map((item) => (
                  <div key={item.key} className="rounded-lg border border-[#1e2536] bg-[#111623] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-slate-200">
                        {item.name ?? formatFeatureLabel(item.key)}
                      </p>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] uppercase tracking-wide ${
                          item.effectiveEnabled
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        {item.effectiveEnabled ? 'Available' : 'Unavailable'}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      {item.description ?? `${formatFeatureLabel(item.key)} access follows your hotel plan.`}
                    </p>
                    {item.effectiveLimitValue ? (
                      <p className="mt-2 text-xs text-blue-300">Limit: {item.effectiveLimitValue}</p>
                    ) : null}
                  </div>
                ))}
              </div>

              <div className="mt-5">
                <Link href="/settings/support" className="text-sm font-medium text-blue-300 hover:text-blue-200">
                  Need a plan or feature change? Contact support
                </Link>
              </div>
            </div>
          </div>

          {isManagement ? (
            <div className="rounded-xl border border-[#1e2536] bg-[#161b27] p-5">
              <h2 className="text-sm font-semibold text-slate-200">Billing And Plan Requests</h2>
              <p className="mt-1 text-sm text-slate-500">
                Hotel admins and managers can request commercial changes here without directly editing platform subscription settings.
              </p>
              <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="rounded-xl border border-[#1e2536] bg-[#111623] p-4">
                  <p className="text-sm font-semibold text-white">Request plan upgrade</p>
                  <p className="mt-2 text-sm text-slate-500">
                    Ask for a higher plan when your hotel needs more modules, capacity, or operational coverage.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-400">
                    {(data?.requestablePlans ?? []).map((plan) => (
                      <span key={plan.id} className="rounded-full border border-[#1e2536] px-2.5 py-1">
                        {plan.name}
                      </span>
                    ))}
                  </div>
                  <Link
                    href={`/settings/support?requestType=PLAN_UPGRADE${data?.requestablePlans?.[0] ? `&requestedPlanCode=${encodeURIComponent(data.requestablePlans[0].code)}` : ''}`}
                    className="mt-4 inline-flex text-sm font-medium text-blue-300 hover:text-blue-200"
                  >
                    Start upgrade request
                  </Link>
                </div>

                <div className="rounded-xl border border-[#1e2536] bg-[#111623] p-4">
                  <p className="text-sm font-semibold text-white">Change billing contact</p>
                  <p className="mt-2 text-sm text-slate-500">
                    Request an update to the billing email or primary billing contact for this hotel account.
                  </p>
                  <p className="mt-3 text-xs text-slate-400">
                    Current contact: {data?.hotel.email ?? 'Not set'}
                  </p>
                  <Link
                    href={`/settings/support?requestType=BILLING_CONTACT_CHANGE&billingEmail=${encodeURIComponent(data?.hotel.email ?? '')}`}
                    className="mt-4 inline-flex text-sm font-medium text-blue-300 hover:text-blue-200"
                  >
                    Request billing contact update
                  </Link>
                </div>

                <div className="rounded-xl border border-[#1e2536] bg-[#111623] p-4">
                  <p className="text-sm font-semibold text-white">Request feature activation</p>
                  <p className="mt-2 text-sm text-slate-500">
                    Ask support to review a locked or rolled-out feature for this hotel.
                  </p>
                  <p className="mt-3 text-xs text-slate-400">
                    {unavailableFeatures.length > 0
                      ? `${unavailableFeatures.length} tracked feature${unavailableFeatures.length === 1 ? '' : 's'} currently unavailable`
                      : 'No currently unavailable tracked features'}
                  </p>
                  <Link
                    href={`/settings/support?requestType=FEATURE_ACTIVATION${unavailableFeatures[0] ? `&featureKey=${encodeURIComponent(unavailableFeatures[0].key)}` : ''}`}
                    className="mt-4 inline-flex text-sm font-medium text-blue-300 hover:text-blue-200"
                  >
                    Request feature review
                  </Link>
                </div>
              </div>
            </div>
          ) : null}

          <div className="rounded-xl border border-[#1e2536] bg-[#161b27] p-5">
            <h2 className="text-sm font-semibold text-slate-200">Plan Awareness</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-[#1e2536] bg-[#111623] p-4">
                <p className="text-sm font-semibold text-white">Unavailable right now</p>
                {unavailableFeatures.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-400">
                    All currently tracked tenant features are available to this hotel.
                  </p>
                ) : (
                  <div className="mt-3 space-y-3">
                    {unavailableFeatures.slice(0, 5).map((item) => (
                      <div key={item.key} className="rounded-lg border border-[#1e2536] px-3 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium text-slate-200">
                            {item.name ?? formatFeatureLabel(item.key)}
                          </p>
                          <span className="rounded-full bg-slate-700 px-2.5 py-1 text-[11px] uppercase tracking-wide text-slate-300">
                            {item.rolloutStage}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          {item.planRequired
                            ? `Requires ${item.planRequired} or platform approval.`
                            : 'Currently unavailable for this hotel context.'}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-[#1e2536] bg-[#111623] p-4">
                <p className="text-sm font-semibold text-white">Known limits</p>
                <p className="mt-2 text-sm text-slate-500">
                  Where the platform resolves plan limits, they will show here so hotel admins can understand access before they hit a blocker.
                </p>
                <div className="mt-3 space-y-3">
                  {(data?.items ?? [])
                    .filter((item) => item.effectiveLimitValue)
                    .slice(0, 5)
                    .map((item) => (
                      <div key={item.key} className="rounded-lg border border-[#1e2536] px-3 py-3">
                        <p className="text-sm font-medium text-slate-200">
                          {item.name ?? formatFeatureLabel(item.key)}
                        </p>
                        <p className="mt-1 text-xs text-blue-300">Limit: {item.effectiveLimitValue}</p>
                      </div>
                    ))}
                  {!(data?.items ?? []).some((item) => item.effectiveLimitValue) ? (
                    <p className="rounded-lg border border-[#1e2536] px-3 py-3 text-sm text-slate-400">
                      No explicit plan limits are being enforced for this hotel yet.
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
