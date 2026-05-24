'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { LifeBuoy, MessageSquareText } from 'lucide-react';
import { useCreateTenantSupportCase, useTenantSupportCaseDetail, useTenantSupportCases } from '@/hooks/support/useTenantSupportCases';
import { useHotelEntitlements } from '@/hooks/hotel/useHotelEntitlements';

const REQUEST_TYPES = ['GENERAL', 'PLAN_UPGRADE', 'BILLING_CONTACT_CHANGE', 'FEATURE_ACTIVATION'] as const;
type TenantRequestType = (typeof REQUEST_TYPES)[number];

function requestTypeLabel(value: string | null | undefined) {
  if (!value) return 'General support';
  return value.replaceAll('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function SupportSettingsPage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [search, setSearch] = useState('');
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [form, setForm] = useState<{
    requestType: TenantRequestType;
    category: string;
    priority: string;
    subject: string;
    description: string;
    requestedPlanCode: string;
    billingContactName: string;
    billingEmail: string;
    featureKey: string;
    businessNeed: string;
    note: string;
  }>({
    requestType: 'GENERAL',
    category: '',
    priority: 'MEDIUM',
    subject: '',
    description: '',
    requestedPlanCode: '',
    billingContactName: '',
    billingEmail: '',
    featureKey: '',
    businessNeed: '',
    note: '',
  });

  const entitlements = useHotelEntitlements();
  const casesQuery = useTenantSupportCases({ status, priority, search });
  const detailQuery = useTenantSupportCaseDetail(selectedCaseId);
  const createCase = useCreateTenantSupportCase();

  useEffect(() => {
    const requestType = searchParams.get('requestType') as TenantRequestType | null;
    if (!requestType) return;

    const currentPlanCode = entitlements.data?.subscription.plan?.code ?? '';
    const requestedPlanCode = searchParams.get('requestedPlanCode') ?? '';
    const billingEmail = searchParams.get('billingEmail') ?? '';
    const featureKey = searchParams.get('featureKey') ?? '';

    if (requestType === 'PLAN_UPGRADE') {
      setForm((current) => ({
        ...current,
        requestType,
        category: 'BILLING',
        subject: 'Plan upgrade request',
        description:
          current.description || 'We need a plan review to unlock additional capabilities for our hotel operations.',
        requestedPlanCode,
        businessNeed: current.businessNeed || 'We need broader operational access and subscription coverage.',
      }));
    } else if (requestType === 'BILLING_CONTACT_CHANGE') {
      setForm((current) => ({
        ...current,
        requestType,
        category: 'BILLING',
        subject: 'Billing contact change request',
        description:
          current.description || 'Please update the billing contact details for this hotel account.',
        billingEmail,
      }));
    } else if (requestType === 'FEATURE_ACTIVATION') {
      setForm((current) => ({
        ...current,
        requestType,
        category: 'FEATURE_ACCESS',
        subject: 'Feature activation review request',
        description:
          current.description || 'Please review feature access for our hotel and advise on activation requirements.',
        featureKey,
        businessNeed: current.businessNeed || 'This feature is needed for day-to-day hotel operations.',
      }));
    }

    if (currentPlanCode && requestType === 'PLAN_UPGRADE' && !requestedPlanCode) {
      setForm((current) => ({
        ...current,
        requestedPlanCode: currentPlanCode === 'STARTER' ? 'GROWTH' : 'ENTERPRISE',
      }));
    }
  }, [entitlements.data?.subscription.plan?.code, searchParams]);

  return (
    <div className="space-y-6 max-w-full">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Support</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Ask for help, review open issues, and track recent support updates.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-[#1e2536] bg-[#161b27] p-5">
          <div className="flex items-center gap-3 text-slate-200">
            <LifeBuoy size={18} className="text-amber-400" />
            <h2 className="text-sm font-semibold">Support Tier</h2>
          </div>
          <p className="mt-4 text-xl font-semibold text-white">{entitlements.data?.support.supportTier ?? 'STANDARD'}</p>
          <p className="mt-1 text-sm text-slate-500">{entitlements.data?.support.contactMode ?? 'IN_APP_CASES'}</p>
        </div>

        <div className="rounded-xl border border-[#1e2536] bg-[#161b27] p-5">
          <div className="flex items-center gap-3 text-slate-200">
            <MessageSquareText size={18} className="text-blue-400" />
            <h2 className="text-sm font-semibold">Open Cases</h2>
          </div>
          <p className="mt-4 text-xl font-semibold text-white">{entitlements.data?.support.openCasesCount ?? 0}</p>
          <p className="mt-1 text-sm text-slate-500">active support requests for this hotel</p>
        </div>

        <div className="rounded-xl border border-[#1e2536] bg-[#161b27] p-5">
          <h2 className="text-sm font-semibold text-slate-200">Queue Scope</h2>
          <p className="mt-4 text-xl font-semibold text-white">
            {casesQuery.data?.canViewHotelWide ? 'Hotel-wide' : 'My requests'}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Managers see hotel-wide support history. Other staff see their own requests.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[0.9fr_1.1fr] gap-4">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const requestType = form.requestType === 'GENERAL' ? undefined : form.requestType;
            const requestPayload =
              requestType === 'PLAN_UPGRADE'
                ? {
                    requestedPlanCode: form.requestedPlanCode,
                    currentPlanCode: entitlements.data?.subscription.plan?.code ?? '',
                    businessNeed: form.businessNeed,
                  }
                : requestType === 'BILLING_CONTACT_CHANGE'
                  ? {
                      billingContactName: form.billingContactName,
                      billingEmail: form.billingEmail,
                      note: form.note,
                    }
                  : requestType === 'FEATURE_ACTIVATION'
                    ? {
                        featureKey: form.featureKey,
                        businessNeed: form.businessNeed,
                        featureName:
                          entitlements.data?.items.find((item) => item.key === form.featureKey)?.name ??
                          null,
                      }
                    : undefined;

            createCase.mutate({
              category: form.category,
              priority: form.priority,
              subject: form.subject,
              description: form.description,
              requestType,
              requestPayload,
            }, {
              onSuccess: (created) => {
                setSelectedCaseId(created.id);
                setForm({
                  requestType: 'GENERAL',
                  category: '',
                  priority: 'MEDIUM',
                  subject: '',
                  description: '',
                  requestedPlanCode: '',
                  billingContactName: '',
                  billingEmail: '',
                  featureKey: '',
                  businessNeed: '',
                  note: '',
                });
              },
            });
          }}
          className="rounded-xl border border-[#1e2536] bg-[#161b27] p-5"
        >
          <h2 className="text-sm font-semibold text-slate-200">Create Support Request</h2>
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="text-sm text-slate-400">
                <span className="mb-1.5 block">Request type</span>
                <select
                  value={form.requestType}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      requestType: event.target.value as TenantRequestType,
                    }))
                  }
                  className="w-full rounded-lg border border-[#1e2536] bg-[#111623] px-3 py-2.5 text-slate-200 outline-none focus:border-blue-500"
                >
                  {REQUEST_TYPES.map((option) => (
                    <option key={option} value={option}>
                      {requestTypeLabel(option)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm text-slate-400">
                <span className="mb-1.5 block">Category</span>
                <input
                  value={form.category}
                  onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                  className="w-full rounded-lg border border-[#1e2536] bg-[#111623] px-3 py-2.5 text-slate-200 outline-none focus:border-blue-500"
                  placeholder="Billing, POS, Rooms..."
                />
              </label>
            </div>
            {form.requestType === 'PLAN_UPGRADE' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="text-sm text-slate-400">
                  <span className="mb-1.5 block">Requested plan</span>
                  <select
                    value={form.requestedPlanCode}
                    onChange={(event) => setForm((current) => ({ ...current, requestedPlanCode: event.target.value }))}
                    className="w-full rounded-lg border border-[#1e2536] bg-[#111623] px-3 py-2.5 text-slate-200 outline-none focus:border-blue-500"
                  >
                    <option value="">Select plan</option>
                    {(entitlements.data?.requestablePlans ?? []).map((option) => (
                      <option key={option.id} value={option.code}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm text-slate-400">
                  <span className="mb-1.5 block">Business need</span>
                  <input
                    value={form.businessNeed}
                    onChange={(event) => setForm((current) => ({ ...current, businessNeed: event.target.value }))}
                    className="w-full rounded-lg border border-[#1e2536] bg-[#111623] px-3 py-2.5 text-slate-200 outline-none focus:border-blue-500"
                    placeholder="Why the hotel needs this upgrade"
                  />
                </label>
              </div>
            ) : null}
            {form.requestType === 'BILLING_CONTACT_CHANGE' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="text-sm text-slate-400">
                  <span className="mb-1.5 block">New billing contact name</span>
                  <input
                    value={form.billingContactName}
                    onChange={(event) => setForm((current) => ({ ...current, billingContactName: event.target.value }))}
                    className="w-full rounded-lg border border-[#1e2536] bg-[#111623] px-3 py-2.5 text-slate-200 outline-none focus:border-blue-500"
                  />
                </label>
                <label className="text-sm text-slate-400">
                  <span className="mb-1.5 block">New billing email</span>
                  <input
                    value={form.billingEmail}
                    onChange={(event) => setForm((current) => ({ ...current, billingEmail: event.target.value }))}
                    className="w-full rounded-lg border border-[#1e2536] bg-[#111623] px-3 py-2.5 text-slate-200 outline-none focus:border-blue-500"
                  />
                </label>
              </div>
            ) : null}
            {form.requestType === 'FEATURE_ACTIVATION' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="text-sm text-slate-400">
                  <span className="mb-1.5 block">Feature</span>
                  <select
                    value={form.featureKey}
                    onChange={(event) => setForm((current) => ({ ...current, featureKey: event.target.value }))}
                    className="w-full rounded-lg border border-[#1e2536] bg-[#111623] px-3 py-2.5 text-slate-200 outline-none focus:border-blue-500"
                  >
                    <option value="">Select feature</option>
                    {(entitlements.data?.items ?? []).map((item) => (
                      <option key={item.key} value={item.key}>
                        {item.name ?? requestTypeLabel(item.key)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm text-slate-400">
                  <span className="mb-1.5 block">Business need</span>
                  <input
                    value={form.businessNeed}
                    onChange={(event) => setForm((current) => ({ ...current, businessNeed: event.target.value }))}
                    className="w-full rounded-lg border border-[#1e2536] bg-[#111623] px-3 py-2.5 text-slate-200 outline-none focus:border-blue-500"
                    placeholder="Why this feature matters"
                  />
                </label>
              </div>
            ) : null}
            {form.requestType === 'BILLING_CONTACT_CHANGE' ? (
              <label className="text-sm text-slate-400">
                <span className="mb-1.5 block">Additional note</span>
                <input
                  value={form.note}
                  onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
                  className="w-full rounded-lg border border-[#1e2536] bg-[#111623] px-3 py-2.5 text-slate-200 outline-none focus:border-blue-500"
                  placeholder="Optional rollout or approval note"
                />
              </label>
            ) : null}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="text-sm text-slate-400">
                <span className="mb-1.5 block">Priority</span>
                <select
                  value={form.priority}
                  onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value }))}
                  className="w-full rounded-lg border border-[#1e2536] bg-[#111623] px-3 py-2.5 text-slate-200 outline-none focus:border-blue-500"
                >
                  {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="text-sm text-slate-400">
              <span className="mb-1.5 block">Subject</span>
              <input
                value={form.subject}
                onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))}
                className="w-full rounded-lg border border-[#1e2536] bg-[#111623] px-3 py-2.5 text-slate-200 outline-none focus:border-blue-500"
              />
            </label>
            <label className="text-sm text-slate-400">
              <span className="mb-1.5 block">Description</span>
              <textarea
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                rows={6}
                className="w-full rounded-lg border border-[#1e2536] bg-[#111623] px-3 py-2.5 text-slate-200 outline-none focus:border-blue-500"
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={createCase.isPending}
            className="mt-5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {createCase.isPending ? 'Submitting...' : 'Submit support request'}
          </button>
        </form>

        <div className="rounded-xl border border-[#1e2536] bg-[#161b27] p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="text-sm text-slate-400">
              <span className="mb-1.5 block">Status</span>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="w-full rounded-lg border border-[#1e2536] bg-[#111623] px-3 py-2.5 text-slate-200 outline-none focus:border-blue-500"
              >
                {['', 'OPEN', 'TRIAGED', 'IN_PROGRESS', 'WAITING_ON_HOTEL', 'RESOLVED', 'CLOSED'].map((option) => (
                  <option key={option || 'all'} value={option}>
                    {option || 'All statuses'}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-slate-400">
              <span className="mb-1.5 block">Priority</span>
              <select
                value={priority}
                onChange={(event) => setPriority(event.target.value)}
                className="w-full rounded-lg border border-[#1e2536] bg-[#111623] px-3 py-2.5 text-slate-200 outline-none focus:border-blue-500"
              >
                {['', 'LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((option) => (
                  <option key={option || 'all'} value={option}>
                    {option || 'All priorities'}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-slate-400">
              <span className="mb-1.5 block">Search</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full rounded-lg border border-[#1e2536] bg-[#111623] px-3 py-2.5 text-slate-200 outline-none focus:border-blue-500"
                placeholder="Subject or category"
              />
            </label>
          </div>

          <div className="mt-5 grid grid-cols-1 xl:grid-cols-[0.9fr_1.1fr] gap-4">
            <div className="space-y-3">
              {(casesQuery.data?.cases ?? []).map((supportCase) => (
                <button
                  type="button"
                  key={supportCase.id}
                  onClick={() => setSelectedCaseId(supportCase.id)}
                  className={`w-full rounded-lg border p-4 text-left transition-colors ${
                    selectedCaseId === supportCase.id
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-[#1e2536] bg-[#111623] hover:border-slate-600'
                  }`}
                >
                  <p className="text-sm font-semibold text-slate-200">{supportCase.subject}</p>
                  <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">
                    {supportCase.category} · {supportCase.requestType ? `${requestTypeLabel(supportCase.requestType)} · ` : ''}{supportCase.priority} · {supportCase.status}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    {new Date(supportCase.updatedAt).toLocaleString()}
                  </p>
                </button>
              ))}
              {!casesQuery.isLoading && (casesQuery.data?.cases.length ?? 0) === 0 ? (
                <div className="rounded-lg border border-[#1e2536] bg-[#111623] p-4 text-sm text-slate-400">
                  No support requests match this filter.
                </div>
              ) : null}
            </div>

            <div className="rounded-lg border border-[#1e2536] bg-[#111623] p-4">
              {!selectedCaseId ? (
                <p className="text-sm text-slate-400">Select a support case to review its details and status history.</p>
              ) : detailQuery.isLoading ? (
                <p className="text-sm text-slate-400">Loading support case...</p>
              ) : detailQuery.data ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-base font-semibold text-white">{detailQuery.data.subject}</h3>
                    <p className="mt-1 text-sm text-slate-400">
                      {detailQuery.data.category} · {detailQuery.data.requestType ? `${requestTypeLabel(detailQuery.data.requestType)} · ` : ''}{detailQuery.data.priority} · {detailQuery.data.status}
                    </p>
                  </div>
                  {detailQuery.data.requestType ? (
                    <div className="rounded-lg border border-[#1e2536] bg-[#161b27] p-3">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Structured request</p>
                      <p className="mt-1 text-sm font-medium text-slate-200">
                        {requestTypeLabel(detailQuery.data.requestType)}
                      </p>
                      {detailQuery.data.requestPayload ? (
                        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs text-slate-400">
                          {JSON.stringify(detailQuery.data.requestPayload, null, 2)}
                        </pre>
                      ) : null}
                    </div>
                  ) : null}
                  <p className="text-sm leading-6 text-slate-300">{detailQuery.data.description}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-400">
                    <p>Assigned: {detailQuery.data.assignedAdminName ?? 'Unassigned'}</p>
                    <p>Created by: {detailQuery.data.createdByName ?? 'Unknown'}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-200">Status Timeline</h4>
                    <div className="mt-3 space-y-2">
                      {detailQuery.data.events.map((event) => (
                        <div key={event.id} className="rounded-lg border border-[#1e2536] bg-[#161b27] p-3">
                          <p className="text-sm font-medium text-slate-200">{event.type.replaceAll('_', ' ')}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {event.actorName} · {new Date(event.createdAt).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-400">Support case not found.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
