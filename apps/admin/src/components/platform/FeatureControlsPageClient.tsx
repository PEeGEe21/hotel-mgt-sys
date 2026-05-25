'use client';

import { useEffect, useMemo, useState } from 'react';
import { AuthNotice } from '@/components/platform/AuthNotice';
import openToast from '@/components/ToastComponent';
import { usePlatformFeatureCatalogOverview } from '@/hooks/usePlatform';
import { PlatformClientError, platformClientFetch } from '@/lib/platform-client';

const FEATURE_PAGE_SIZE = 3;

type PlanEntitlementFormEntry = {
  enabled: boolean;
  limitValue: string;
};

function boolTone(value: boolean) {
  return value ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-900';
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function scopeTypeLabel(value: 'MODULE' | 'SUB_FEATURE' | 'LIMIT') {
  switch (value) {
    case 'MODULE':
      return 'Module';
    case 'SUB_FEATURE':
      return 'Sub-feature';
    case 'LIMIT':
      return 'Limit';
  }
}

function rolloutStageLabel(value: 'INTERNAL' | 'BETA' | 'GA' | 'DEPRECATED') {
  switch (value) {
    case 'INTERNAL':
      return 'Internal';
    case 'BETA':
      return 'Beta';
    case 'GA':
      return 'General availability';
    case 'DEPRECATED':
      return 'Deprecated';
  }
}

function buildPlanForm(
  features: Array<{
    key: string;
    defaultEnabled: boolean;
    planAssignments: Array<{
      planId: string;
      enabled: boolean;
      limitValue: string | null;
    }>;
  }>,
  planId: string,
) {
  return Object.fromEntries(
    features.map((feature) => {
      const assignment = feature.planAssignments.find((entry) => entry.planId === planId);
      return [
        feature.key,
        {
          enabled: assignment?.enabled ?? feature.defaultEnabled,
          limitValue: assignment?.limitValue ?? '',
        },
      ];
    }),
  ) as Record<string, PlanEntitlementFormEntry>;
}

function FeatureCatalogCreateForm({
  onCreated,
}: {
  onCreated: () => Promise<void> | void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    key: '',
    name: '',
    category: '',
    description: '',
    enabled: true,
    defaultEnabled: true,
    scopeType: 'MODULE' as 'MODULE' | 'SUB_FEATURE' | 'LIMIT',
    rolloutStage: 'GA' as 'INTERNAL' | 'BETA' | 'GA' | 'DEPRECATED',
    planRequired: '',
  });

  const reset = () => {
    setForm({
      key: '',
      name: '',
      category: '',
      description: '',
      enabled: true,
      defaultEnabled: true,
      scopeType: 'MODULE',
      rolloutStage: 'GA',
      planRequired: '',
    });
    setError(null);
  };

  const close = () => {
    setIsOpen(false);
    reset();
  };

  const save = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await platformClientFetch('/feature-flags', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          key: form.key.trim().toLowerCase(),
          name: form.name.trim() || undefined,
          category: form.category.trim() || undefined,
          description: form.description.trim() || undefined,
          planRequired: form.planRequired.trim() || undefined,
        }),
      });
      await onCreated();
      close();
      openToast('success', 'Feature entitlement created.');
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : 'Could not create feature.';
      setError(message);
      openToast('error', message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800"
      >
        New entitlement
      </button>
      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-800">Feature catalog</p>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight">Create entitlement</h3>
                <p className="mt-2 text-sm text-slate-600">
                  Add a new feature key once, then map it to plans and hotel overrides from this catalog.
                </p>
              </div>
              <button type="button" onClick={close} className="text-sm font-medium text-slate-500">
                Close
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm text-slate-700">
                <span className="font-medium">Feature key</span>
                <input
                  value={form.key}
                  onChange={(event) => setForm((current) => ({ ...current, key: event.target.value }))}
                  placeholder="module_housekeeping"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-teal-700"
                />
              </label>
              <label className="space-y-2 text-sm text-slate-700">
                <span className="font-medium">Display name</span>
                <input
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Housekeeping"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-teal-700"
                />
              </label>
              <label className="space-y-2 text-sm text-slate-700">
                <span className="font-medium">Category</span>
                <input
                  value={form.category}
                  onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                  placeholder="Operations"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-teal-700"
                />
              </label>
              <label className="space-y-2 text-sm text-slate-700">
                <span className="font-medium">Plan required</span>
                <input
                  value={form.planRequired}
                  onChange={(event) => setForm((current) => ({ ...current, planRequired: event.target.value }))}
                  placeholder="Optional plan label"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-teal-700"
                />
              </label>
              <label className="space-y-2 text-sm text-slate-700">
                <span className="font-medium">Scope type</span>
                <select
                  value={form.scopeType}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      scopeType: event.target.value as 'MODULE' | 'SUB_FEATURE' | 'LIMIT',
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-teal-700"
                >
                  <option value="MODULE">Module</option>
                  <option value="SUB_FEATURE">Sub-feature</option>
                  <option value="LIMIT">Limit</option>
                </select>
              </label>
              <label className="space-y-2 text-sm text-slate-700">
                <span className="font-medium">Rollout stage</span>
                <select
                  value={form.rolloutStage}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      rolloutStage: event.target.value as 'INTERNAL' | 'BETA' | 'GA' | 'DEPRECATED',
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-teal-700"
                >
                  <option value="INTERNAL">Internal</option>
                  <option value="BETA">Beta</option>
                  <option value="GA">General availability</option>
                  <option value="DEPRECATED">Deprecated</option>
                </select>
              </label>
            </div>

            <label className="mt-4 block space-y-2 text-sm text-slate-700">
              <span className="font-medium">Description</span>
              <textarea
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                rows={4}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-teal-700"
                placeholder="Describe what this entitlement controls."
              />
            </label>

            <div className="mt-4 flex flex-wrap gap-6">
              <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={form.enabled}
                  onChange={(event) => setForm((current) => ({ ...current, enabled: event.target.checked }))}
                />
                Global flag enabled
              </label>
              <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={form.defaultEnabled}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, defaultEnabled: event.target.checked }))
                  }
                />
                Default enabled
              </label>
            </div>

            {error ? <div className="mt-4"><AuthNotice title="Create failed" message={error} /></div> : null}

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={close}
                className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                disabled={isSaving || !form.key.trim()}
                className="rounded-full bg-teal-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {isSaving ? 'Creating...' : 'Create entitlement'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function FeatureControlsPageClient() {
  const overviewQuery = usePlatformFeatureCatalogOverview();
  const data = overviewQuery.data;
  const authMessage = overviewQuery.error instanceof PlatformClientError ? overviewQuery.error.message : null;
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [planForm, setPlanForm] = useState<Record<string, PlanEntitlementFormEntry>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [featurePage, setFeaturePage] = useState(1);

  useEffect(() => {
    if (!data) return;
    const nextPlanId =
      data.plans.some((plan) => plan.id === selectedPlanId) ? selectedPlanId : (data.plans[0]?.id ?? '');
    setSelectedPlanId(nextPlanId);
    if (nextPlanId) {
      setPlanForm(buildPlanForm(data.features, nextPlanId));
    }
  }, [data, selectedPlanId]);

  const selectedPlan = data?.plans.find((plan) => plan.id === selectedPlanId) ?? null;
  const totalFeaturePages = Math.max(1, Math.ceil((data?.features.length ?? 0) / FEATURE_PAGE_SIZE));
  const paginatedFeatures = useMemo(() => {
    if (!data) return [];
    const start = (featurePage - 1) * FEATURE_PAGE_SIZE;
    return data.features.slice(start, start + FEATURE_PAGE_SIZE);
  }, [data, featurePage]);

  const dirtyCount = useMemo(() => {
    if (!data || !selectedPlanId) return 0;
    const original = buildPlanForm(data.features, selectedPlanId);
    return data.features.filter((feature) => {
      const before = original[feature.key];
      const after = planForm[feature.key];
      if (!before || !after) return false;
      return before.enabled !== after.enabled || before.limitValue !== after.limitValue;
    }).length;
  }, [data, planForm, selectedPlanId]);

  useEffect(() => {
    if (featurePage > totalFeaturePages) {
      setFeaturePage(totalFeaturePages);
    }
  }, [featurePage, totalFeaturePages]);

  const handleSaveEntitlements = async () => {
    if (!selectedPlanId || !data) return;
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(null);
    try {
      await platformClientFetch(`/subscriptions/plans/${selectedPlanId}/entitlements`, {
        method: 'PATCH',
        body: JSON.stringify({
          entitlements: data.features.map((feature) => ({
            flagKey: feature.key,
            enabled: planForm[feature.key]?.enabled ?? false,
            limitValue: planForm[feature.key]?.limitValue.trim() || null,
          })),
        }),
      });
      await overviewQuery.refetch();
      setSaveSuccess('Plan entitlements updated.');
      openToast('success', 'Plan entitlements updated.');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not update plan entitlements.';
      setSaveError(message);
      openToast('error', message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="min-h-screen px-6 py-10 md:px-10">
      <div className="mx-auto max-w-full space-y-6">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-800">Feature controls</p>
          <h1 className="text-3xl font-semibold tracking-tight">Platform feature catalog</h1>
          <p className="max-w-3xl text-sm leading-6 text-slate-600">
            Control feature access by plan, review hotel override volume, and track recent entitlement changes without
            shipping code.
          </p>
        </div>

        {authMessage ? <AuthNotice message={authMessage} /> : null}
        {/* {saveError ? <AuthNotice title="Feature update failed" message={saveError} /> : null}
        {saveSuccess ? <AuthNotice title="Feature controls saved" message={saveSuccess} /> : null} */}

        <section className="grid gap-4 md:grid-cols-3">
          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Catalog features</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight">{data?.totals.features ?? '—'}</p>
          </article>
          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Hotel overrides</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight">{data?.totals.hotelOverrides ?? '—'}</p>
          </article>
          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Plans represented</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight">{data?.plans.length ?? '—'}</p>
          </article>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-800">Plan entitlements</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                  {selectedPlan ? `${selectedPlan.name} (${selectedPlan.code})` : 'Choose a plan'}
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <FeatureCatalogCreateForm
                  onCreated={async () => {
                    await overviewQuery.refetch();
                    setSaveSuccess('Feature catalog updated.');
                  }}
                />
                <select
                  value={selectedPlanId}
                  onChange={(event) => {
                    const nextPlanId = event.target.value;
                    setSelectedPlanId(nextPlanId);
                    if (data) {
                      setPlanForm(buildPlanForm(data.features, nextPlanId));
                    }
                    setSaveError(null);
                    setSaveSuccess(null);
                  }}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-teal-700"
                >
                  {data?.plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} ({plan.code})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleSaveEntitlements}
                  disabled={!selectedPlanId || !dirtyCount || isSaving}
                  className="rounded-full bg-teal-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : dirtyCount ? `Save ${dirtyCount} change${dirtyCount === 1 ? '' : 's'}` : 'Saved'}
                </button>
              </div>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="pb-3 pr-4 font-medium">Feature</th>
                    <th className="pb-3 pr-4 font-medium">Defaults</th>
                    <th className="pb-3 pr-4 font-medium">Plan enabled</th>
                    <th className="pb-3 pr-4 font-medium">Limit</th>
                    <th className="pb-3 pr-4 font-medium">Overrides</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {overviewQuery.isLoading ? (
                    <tr>
                      <td colSpan={5} className="py-4 text-slate-600">Loading feature catalog...</td>
                    </tr>
                  ) : (data?.features.length ?? 0) === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-4 text-slate-600">No platform features are registered yet.</td>
                    </tr>
                  ) : (
                    paginatedFeatures.map((feature) => (
                      <tr key={feature.key}>
                        <td className="py-4 pr-4 align-top">
                          <p className="font-semibold text-slate-900">{feature.name ?? feature.key}</p>
                          <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">{feature.key}</p>
                          <p className="mt-2 max-w-md text-slate-600">{feature.description ?? 'No description yet.'}</p>
                        </td>
                        <td className="py-4 pr-4 align-top">
                          <div className="flex flex-wrap gap-2">
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${boolTone(feature.globalEnabled)}`}>
                              Global {feature.globalEnabled ? 'on' : 'off'}
                            </span>
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${boolTone(feature.defaultEnabled)}`}>
                              Default {feature.defaultEnabled ? 'on' : 'off'}
                            </span>
                          </div>
                          <p className="mt-2 text-xs uppercase tracking-wide text-slate-500">
                            {scopeTypeLabel(feature.scopeType)} · {rolloutStageLabel(feature.rolloutStage)}
                          </p>
                        </td>
                        <td className="py-4 pr-4 align-top whitespace-nowrap">
                          <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                            <input
                              type="checkbox"
                              checked={planForm[feature.key]?.enabled ?? false}
                              onChange={(event) =>
                                setPlanForm((current) => ({
                                  ...current,
                                  [feature.key]: {
                                    ...(current[feature.key] ?? { enabled: false, limitValue: '' }),
                                    enabled: event.target.checked,
                                  },
                                }))
                              }
                            />
                            Enabled for this plan
                          </label>
                        </td>
                        <td className="py-4 pr-4 align-top">
                          <input
                            value={planForm[feature.key]?.limitValue ?? ''}
                            onChange={(event) =>
                              setPlanForm((current) => ({
                                ...current,
                                [feature.key]: {
                                  ...(current[feature.key] ?? { enabled: false, limitValue: '' }),
                                  limitValue: event.target.value,
                                },
                              }))
                            }
                            placeholder={feature.scopeType === 'LIMIT' ? 'e.g. 10' : 'Optional'}
                            className="w-36 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 outline-none focus:border-teal-700"
                          />
                        </td>
                        <td className="py-4 pr-4 align-top text-slate-600">
                          <p>{feature.overrideCount} hotel override{feature.overrideCount === 1 ? '' : 's'}</p>
                          {feature.planAssignments.length === 0 ? (
                            <p className="mt-2 text-xs text-slate-500">No plan mapping yet.</p>
                          ) : (
                            <p className="mt-2 text-xs text-slate-500">
                              {feature.planAssignments
                                .filter((assignment) => assignment.enabled)
                                .map((assignment) => assignment.planCode)
                                .join(', ') || 'Disabled on all mapped plans'}
                            </p>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              {data && data.features.length > FEATURE_PAGE_SIZE ? (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
                  <p className="text-sm text-slate-500">
                    Showing {(featurePage - 1) * FEATURE_PAGE_SIZE + 1}-
                    {Math.min(featurePage * FEATURE_PAGE_SIZE, data.features.length)} of {data.features.length} features
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setFeaturePage((current) => Math.max(1, current - 1))}
                      disabled={featurePage === 1}
                      className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-slate-500">
                      Page {featurePage} of {totalFeaturePages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setFeaturePage((current) => Math.min(totalFeaturePages, current + 1))}
                      disabled={featurePage >= totalFeaturePages}
                      className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-800">Change history</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">Recent entitlement activity</h2>
            <div className="mt-5 space-y-3">
              {overviewQuery.isLoading ? (
                <p className="text-sm text-slate-600">Loading recent changes...</p>
              ) : (data?.recentChanges.length ?? 0) === 0 ? (
                <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  No feature control changes have been recorded yet.
                </p>
              ) : (
                data?.recentChanges.map((entry) => (
                  <div key={entry.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900">{entry.summary}</p>
                      <span className="text-xs uppercase tracking-wide text-slate-500">{formatDate(entry.createdAt)}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">Actor: {entry.actorName}</p>
                    {entry.hotel ? <p className="mt-1 text-sm text-slate-600">Hotel: {entry.hotel.name}</p> : null}
                    <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">{entry.action}</p>
                  </div>
                ))
              )}
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
