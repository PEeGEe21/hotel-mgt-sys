'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AuthNotice } from '@/components/platform/AuthNotice';
import { usePlatformSubscriptionsOverview } from '@/hooks/usePlatform';
import { PlatformClientError, platformClientFetch } from '@/lib/platform-client';
import type { PlatformSubscriptionsOverviewResponse } from '@/lib/platform-types';

type PlanFormState = {
  code: string;
  name: string;
  description: string;
  priceMonthly: string;
  priceYearly: string;
  billingIntervalOptions: string;
  isActive: boolean;
  isPublic: boolean;
  sortOrder: string;
};

const emptyPlanForm: PlanFormState = {
  code: '',
  name: '',
  description: '',
  priceMonthly: '',
  priceYearly: '',
  billingIntervalOptions: 'MONTHLY, YEARLY',
  isActive: true,
  isPublic: false,
  sortOrder: '0',
};

function formatMoney(value: number | null) {
  if (value === null) return 'Not set';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function statusTone(status: string) {
  switch (status) {
    case 'ACTIVE':
      return 'bg-emerald-100 text-emerald-800';
    case 'TRIAL':
      return 'bg-sky-100 text-sky-900';
    case 'GRACE':
      return 'bg-amber-100 text-amber-900';
    case 'SUSPENDED':
    case 'EXPIRED':
    case 'CANCELLED':
      return 'bg-rose-100 text-rose-900';
    default:
      return 'bg-slate-200 text-slate-700';
  }
}

export function SubscriptionsPageClient() {
  const overviewQuery = usePlatformSubscriptionsOverview();
  const data = overviewQuery.data;
  const authMessage = overviewQuery.error instanceof PlatformClientError ? overviewQuery.error.message : null;
  const [createForm, setCreateForm] = useState<PlanFormState>(emptyPlanForm);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [editingForm, setEditingForm] = useState<PlanFormState>(emptyPlanForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const buildPayload = (form: PlanFormState) => ({
    code: form.code.trim(),
    name: form.name.trim(),
    description: form.description.trim() || undefined,
    priceMonthly: form.priceMonthly.trim() ? Number(form.priceMonthly) : undefined,
    priceYearly: form.priceYearly.trim() ? Number(form.priceYearly) : undefined,
    billingIntervalOptions: form.billingIntervalOptions
      .split(',')
      .map((entry) => entry.trim().toUpperCase())
      .filter(Boolean),
    isActive: form.isActive,
    isPublic: form.isPublic,
    sortOrder: Number(form.sortOrder || '0'),
  });

  const startEditing = (plan: PlatformSubscriptionsOverviewResponse['plans'][number]) => {
    setEditingPlanId(plan.id);
    setEditingForm({
      code: plan.code,
      name: plan.name,
      description: plan.description ?? '',
      priceMonthly: plan.priceMonthly !== null ? String(plan.priceMonthly) : '',
      priceYearly: plan.priceYearly !== null ? String(plan.priceYearly) : '',
      billingIntervalOptions: plan.billingIntervalOptions.join(', '),
      isActive: plan.isActive,
      isPublic: plan.isPublic,
      sortOrder: String(plan.sortOrder),
    });
    setFormError(null);
    setFormSuccess(null);
  };

  const handleCreatePlan = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setFormError(null);
    setFormSuccess(null);
    try {
      await platformClientFetch('/subscriptions/plans', {
        method: 'POST',
        body: JSON.stringify(buildPayload(createForm)),
      });
      setCreateForm(emptyPlanForm);
      setFormSuccess('Subscription plan created.');
      await overviewQuery.refetch();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not create subscription plan.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdatePlan = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingPlanId) return;
    setIsSaving(true);
    setFormError(null);
    setFormSuccess(null);
    try {
      await platformClientFetch(`/subscriptions/plans/${editingPlanId}`, {
        method: 'PATCH',
        body: JSON.stringify(buildPayload(editingForm)),
      });
      setEditingPlanId(null);
      setFormSuccess('Subscription plan updated.');
      await overviewQuery.refetch();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not update subscription plan.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="min-h-screen px-6 py-10 md:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-800">Subscriptions</p>
          <h1 className="text-3xl font-semibold tracking-tight">Plans and hotel assignments</h1>
          <p className="max-w-3xl text-sm leading-6 text-slate-600">
            Create plans, update commercial posture, and manage hotel subscription assignments from one platform
            workspace.
          </p>
        </div>

        {authMessage ? <AuthNotice message={authMessage} /> : null}
        {formError ? <AuthNotice title="Subscription change failed" message={formError} /> : null}
        {formSuccess ? <AuthNotice title="Subscription updated" message={formSuccess} /> : null}

        <section className="grid gap-4 md:grid-cols-4">
          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Plans</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight">{data?.plans.length ?? '—'}</p>
          </article>
          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Active hotels</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight">{data?.statusCounts.ACTIVE ?? 0}</p>
          </article>
          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Trial hotels</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight">{data?.statusCounts.TRIAL ?? 0}</p>
          </article>
          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Unassigned</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight">{data?.statusCounts.NONE ?? 0}</p>
          </article>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <form onSubmit={handleCreatePlan} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-800">Create plan</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">New subscription plan</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="text-sm text-slate-700">
                <span className="mb-1.5 block font-medium">Code</span>
                <input value={createForm.code} onChange={(e) => setCreateForm((current) => ({ ...current, code: e.target.value }))} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-teal-700" />
              </label>
              <label className="text-sm text-slate-700">
                <span className="mb-1.5 block font-medium">Name</span>
                <input value={createForm.name} onChange={(e) => setCreateForm((current) => ({ ...current, name: e.target.value }))} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-teal-700" />
              </label>
              <label className="text-sm text-slate-700 md:col-span-2">
                <span className="mb-1.5 block font-medium">Description</span>
                <textarea value={createForm.description} onChange={(e) => setCreateForm((current) => ({ ...current, description: e.target.value }))} rows={3} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-teal-700" />
              </label>
              <label className="text-sm text-slate-700">
                <span className="mb-1.5 block font-medium">Monthly price</span>
                <input value={createForm.priceMonthly} onChange={(e) => setCreateForm((current) => ({ ...current, priceMonthly: e.target.value }))} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-teal-700" />
              </label>
              <label className="text-sm text-slate-700">
                <span className="mb-1.5 block font-medium">Yearly price</span>
                <input value={createForm.priceYearly} onChange={(e) => setCreateForm((current) => ({ ...current, priceYearly: e.target.value }))} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-teal-700" />
              </label>
              <label className="text-sm text-slate-700">
                <span className="mb-1.5 block font-medium">Billing intervals</span>
                <input value={createForm.billingIntervalOptions} onChange={(e) => setCreateForm((current) => ({ ...current, billingIntervalOptions: e.target.value }))} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-teal-700" />
              </label>
              <label className="text-sm text-slate-700">
                <span className="mb-1.5 block font-medium">Sort order</span>
                <input value={createForm.sortOrder} onChange={(e) => setCreateForm((current) => ({ ...current, sortOrder: e.target.value }))} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-teal-700" />
              </label>
            </div>
            <div className="mt-4 flex flex-wrap gap-5 text-sm text-slate-700">
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={createForm.isActive} onChange={(e) => setCreateForm((current) => ({ ...current, isActive: e.target.checked }))} />
                Active
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={createForm.isPublic} onChange={(e) => setCreateForm((current) => ({ ...current, isPublic: e.target.checked }))} />
                Public
              </label>
            </div>
            <button type="submit" disabled={isSaving} className="mt-5 rounded-full bg-teal-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">
              {isSaving ? 'Saving...' : 'Create plan'}
            </button>
          </form>

          <form onSubmit={handleUpdatePlan} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-800">Edit plan</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              {editingPlanId ? 'Update selected plan' : 'Select a plan below'}
            </h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="text-sm text-slate-700">
                <span className="mb-1.5 block font-medium">Code</span>
                <input disabled={!editingPlanId} value={editingForm.code} onChange={(e) => setEditingForm((current) => ({ ...current, code: e.target.value }))} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-teal-700 disabled:opacity-50" />
              </label>
              <label className="text-sm text-slate-700">
                <span className="mb-1.5 block font-medium">Name</span>
                <input disabled={!editingPlanId} value={editingForm.name} onChange={(e) => setEditingForm((current) => ({ ...current, name: e.target.value }))} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-teal-700 disabled:opacity-50" />
              </label>
              <label className="text-sm text-slate-700 md:col-span-2">
                <span className="mb-1.5 block font-medium">Description</span>
                <textarea disabled={!editingPlanId} value={editingForm.description} onChange={(e) => setEditingForm((current) => ({ ...current, description: e.target.value }))} rows={3} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-teal-700 disabled:opacity-50" />
              </label>
              <label className="text-sm text-slate-700">
                <span className="mb-1.5 block font-medium">Monthly price</span>
                <input disabled={!editingPlanId} value={editingForm.priceMonthly} onChange={(e) => setEditingForm((current) => ({ ...current, priceMonthly: e.target.value }))} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-teal-700 disabled:opacity-50" />
              </label>
              <label className="text-sm text-slate-700">
                <span className="mb-1.5 block font-medium">Yearly price</span>
                <input disabled={!editingPlanId} value={editingForm.priceYearly} onChange={(e) => setEditingForm((current) => ({ ...current, priceYearly: e.target.value }))} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-teal-700 disabled:opacity-50" />
              </label>
              <label className="text-sm text-slate-700">
                <span className="mb-1.5 block font-medium">Billing intervals</span>
                <input disabled={!editingPlanId} value={editingForm.billingIntervalOptions} onChange={(e) => setEditingForm((current) => ({ ...current, billingIntervalOptions: e.target.value }))} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-teal-700 disabled:opacity-50" />
              </label>
              <label className="text-sm text-slate-700">
                <span className="mb-1.5 block font-medium">Sort order</span>
                <input disabled={!editingPlanId} value={editingForm.sortOrder} onChange={(e) => setEditingForm((current) => ({ ...current, sortOrder: e.target.value }))} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-teal-700 disabled:opacity-50" />
              </label>
            </div>
            <div className="mt-4 flex flex-wrap gap-5 text-sm text-slate-700">
              <label className="inline-flex items-center gap-2">
                <input disabled={!editingPlanId} type="checkbox" checked={editingForm.isActive} onChange={(e) => setEditingForm((current) => ({ ...current, isActive: e.target.checked }))} />
                Active
              </label>
              <label className="inline-flex items-center gap-2">
                <input disabled={!editingPlanId} type="checkbox" checked={editingForm.isPublic} onChange={(e) => setEditingForm((current) => ({ ...current, isPublic: e.target.checked }))} />
                Public
              </label>
            </div>
            <div className="mt-5 flex gap-3">
              <button type="submit" disabled={!editingPlanId || isSaving} className="rounded-full bg-teal-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">
                {isSaving ? 'Saving...' : 'Save changes'}
              </button>
              {editingPlanId ? (
                <button type="button" onClick={() => setEditingPlanId(null)} className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900">
                  Cancel edit
                </button>
              ) : null}
            </div>
          </form>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-800">Plan catalog</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">Current commercial setup</h2>
            </div>
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {overviewQuery.isLoading ? (
              <p className="text-sm text-slate-600">Loading plans...</p>
            ) : (data?.plans.length ?? 0) === 0 ? (
              <p className="text-sm text-slate-600">No subscription plans have been created yet.</p>
            ) : (
              data?.plans.map((plan) => (
                <article key={plan.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{plan.code}</p>
                      <h3 className="mt-2 text-xl font-semibold tracking-tight">{plan.name}</h3>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${plan.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
                      {plan.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {plan.description ?? 'No description yet.'}
                  </p>
                  <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
                    <p>Monthly: {formatMoney(plan.priceMonthly)}</p>
                    <p>Yearly: {formatMoney(plan.priceYearly)}</p>
                    <p>Hotels assigned: {plan.hotelCount}</p>
                    <p>Hotels live: {plan.activeHotelCount}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => startEditing(plan)}
                    className="mt-4 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900"
                  >
                    Edit plan
                  </button>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-800">Assignments</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">Hotel subscription coverage</h2>
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="pb-3 pr-4 font-medium">Hotel</th>
                  <th className="pb-3 pr-4 font-medium">Plan</th>
                  <th className="pb-3 pr-4 font-medium">Status</th>
                  <th className="pb-3 pr-4 font-medium">Billing</th>
                  <th className="pb-3 pr-4 font-medium">Dates</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {overviewQuery.isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-4 text-slate-600">Loading hotel assignments...</td>
                  </tr>
                ) : (data?.assignments.length ?? 0) === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-4 text-slate-600">No hotels available yet.</td>
                  </tr>
                ) : (
                  data?.assignments.map((assignment) => (
                    <tr key={assignment.id}>
                      <td className="py-4 pr-4">
                        <Link href={`/hotels/${assignment.hotelId}`} className="font-semibold text-slate-900 hover:text-teal-900">
                          {assignment.hotelName}
                        </Link>
                      </td>
                      <td className="py-4 pr-4 text-slate-600">
                        {assignment.planName ?? 'No plan assigned'}
                      </td>
                      <td className="py-4 pr-4">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusTone(assignment.status)}`}>
                          {assignment.status}
                        </span>
                      </td>
                      <td className="py-4 pr-4 text-slate-600">
                        {assignment.billingContactName ?? assignment.billingEmail ?? 'Not set'}
                      </td>
                      <td className="py-4 pr-4 text-slate-600">
                        {assignment.endsAt ?? assignment.trialEndsAt ?? assignment.graceEndsAt ?? '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
