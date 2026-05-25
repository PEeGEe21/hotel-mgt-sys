'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AuthNotice } from '@/components/platform/AuthNotice';
import { OnboardingStatusBadge } from '@/components/platform/OnboardingStatusBadge';
import {
  usePlatformHotelDetail,
  usePlatformHotelEntitlements,
  usePlatformHotelObservability,
  usePlatformSupportCases,
  usePlatformSubscriptionsOverview,
} from '@/hooks/usePlatform';
import { platformClientFetch } from '@/lib/platform-client';
import type { PlatformHotelDetailResponse } from '@/lib/platform-types';
import { PlatformClientError } from '@/lib/platform-client';
import { COUNTRY_OPTIONS, getCountryOption } from '@/lib/country-metadata';

type HotelEditFormState = {
  name: string;
  domain: string;
  address: string;
  city: string;
  state: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  description: string;
  currency: string;
  timezone: string;
};

type SubscriptionFormState = {
  planId: string;
  status: string;
  startsAt: string;
  endsAt: string;
  trialEndsAt: string;
  graceEndsAt: string;
  billingEmail: string;
  billingContactName: string;
  notes: string;
};

type OverrideFormEntry = {
  mode: 'inherit' | 'override';
  enabled: boolean;
  limitValue: string;
  reason: string;
};

function formatDate(value: string | null) {
  if (!value) return 'No activity';
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function healthClasses(status: 'healthy' | 'warning' | 'critical' | 'setup') {
  switch (status) {
    case 'healthy':
      return 'bg-emerald-100 text-emerald-800';
    case 'warning':
      return 'bg-amber-100 text-amber-900';
    case 'critical':
      return 'bg-rose-100 text-rose-900';
    case 'setup':
      return 'bg-sky-100 text-sky-900';
  }
}

function accessResultLabel(result: string) {
  return result.replaceAll('_', ' ').toLowerCase();
}

function incidentClasses(diagnosis: 'configuration' | 'lifecycle' | 'unknown') {
  switch (diagnosis) {
    case 'configuration':
      return 'bg-amber-100 text-amber-900';
    case 'lifecycle':
      return 'bg-sky-100 text-sky-900';
    case 'unknown':
      return 'bg-slate-200 text-slate-700';
  }
}

function observabilityClasses(status: 'alerting' | 'stale' | 'healthy') {
  switch (status) {
    case 'alerting':
      return 'bg-rose-100 text-rose-900';
    case 'stale':
      return 'bg-amber-100 text-amber-900';
    case 'healthy':
      return 'bg-emerald-100 text-emerald-800';
  }
}

export function HotelDetailClient({ id, fallbackName }: { id: string; fallbackName?: string }) {
  const detailQuery = usePlatformHotelDetail(id);
  const hotel = detailQuery.data as PlatformHotelDetailResponse | undefined;
  const entitlementsQuery = usePlatformHotelEntitlements(id);
  const observabilityQuery = usePlatformHotelObservability(id);
  const supportQuery = usePlatformSupportCases(1, 5, { hotelId: id });
  const subscriptionsOverviewQuery = usePlatformSubscriptionsOverview();
  const authMessage = detailQuery.error instanceof PlatformClientError ? detailQuery.error.message : null;
  const [actionError, setActionError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null);
  const [subscriptionSuccess, setSubscriptionSuccess] = useState<string | null>(null);
  const [isSavingSubscription, setIsSavingSubscription] = useState(false);
  const [overrideForms, setOverrideForms] = useState<Record<string, OverrideFormEntry>>({});
  const [overrideError, setOverrideError] = useState<string | null>(null);
  const [overrideSuccess, setOverrideSuccess] = useState<string | null>(null);
  const [savingOverrideKey, setSavingOverrideKey] = useState<string | null>(null);
  const [lifecycleReason, setLifecycleReason] = useState('');
  const [confirmationName, setConfirmationName] = useState('');
  const [form, setForm] = useState<HotelEditFormState>({
    name: '',
    domain: '',
    address: '',
    city: '',
    state: '',
    country: '',
    phone: '',
    email: '',
    website: '',
    description: '',
    currency: '',
    timezone: '',
  });
  const [subscriptionForm, setSubscriptionForm] = useState<SubscriptionFormState>({
    planId: '',
    status: 'TRIAL',
    startsAt: '',
    endsAt: '',
    trialEndsAt: '',
    graceEndsAt: '',
    billingEmail: '',
    billingContactName: '',
    notes: '',
  });

  useEffect(() => {
    if (!hotel) return;
    setForm({
      name: hotel.name ?? '',
      domain: hotel.domain ?? '',
      address: hotel.address ?? '',
      city: hotel.city ?? '',
      state: hotel.state ?? '',
      country: hotel.country ?? '',
      phone: hotel.phone ?? '',
      email: hotel.email ?? '',
      website: hotel.website ?? '',
      description: hotel.description ?? '',
      currency: hotel.currency ?? '',
      timezone: hotel.timezone ?? '',
    });
    setSubscriptionForm({
      planId: hotel.subscription?.planId ?? '',
      status: hotel.subscription?.status ?? 'TRIAL',
      startsAt: hotel.subscription?.startsAt ? hotel.subscription.startsAt.slice(0, 10) : '',
      endsAt: hotel.subscription?.endsAt ? hotel.subscription.endsAt.slice(0, 10) : '',
      trialEndsAt: hotel.subscription?.trialEndsAt ? hotel.subscription.trialEndsAt.slice(0, 10) : '',
      graceEndsAt: hotel.subscription?.graceEndsAt ? hotel.subscription.graceEndsAt.slice(0, 10) : '',
      billingEmail: hotel.subscription?.billingEmail ?? '',
      billingContactName: hotel.subscription?.billingContactName ?? '',
      notes: hotel.subscription?.notes ?? '',
    });
    setConfirmationName('');
  }, [hotel]);

  useEffect(() => {
    if (!entitlementsQuery.data) return;
    setOverrideForms(
      Object.fromEntries(
        entitlementsQuery.data.items.map((item) => [
          item.key,
          {
            mode: item.overrideEnabled === null ? 'inherit' : 'override',
            enabled: item.overrideEnabled ?? item.effectiveEnabled,
            limitValue: item.overrideLimitValue ?? '',
            reason: item.overrideReason ?? '',
          },
        ]),
      ),
    );
  }, [entitlementsQuery.data]);

  const selectedCountry = getCountryOption(form.country || 'Nigeria');
  const availableCurrencies = Array.from(
    new Set([
      ...COUNTRY_OPTIONS.map((country) => country.currency),
      form.currency || selectedCountry.currency,
    ].filter(Boolean)),
  );
  const availableTimezones = Array.from(
    new Set([
      ...COUNTRY_OPTIONS.map((country) => country.timezone),
      form.timezone || selectedCountry.timezone,
    ].filter(Boolean)),
  );

  const handleLifecycleAction = async (action: 'suspend' | 'reactivate' | 'soft-delete' | 'restore') => {
    setIsUpdating(true);
    setActionError(null);
    try {
      await platformClientFetch(`/hotels/${id}/${action}`, {
        method: 'POST',
        body: JSON.stringify({
          confirmationName,
          reason: lifecycleReason,
        }),
      });
      setLifecycleReason('');
      setConfirmationName('');
      await detailQuery.refetch();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not update hotel lifecycle state.');
    } finally {
      setIsUpdating(false);
    }
  };

  const updateField = (field: keyof HotelEditFormState, value: string) => {
    setEditSuccess(null);
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleCountryChange = (countryName: string) => {
    const nextCountry = getCountryOption(countryName);
    setEditSuccess(null);
    setForm((current) => ({
      ...current,
      country: nextCountry.name,
      state: nextCountry.states.includes(current.state) ? current.state : nextCountry.states[0] ?? '',
      currency:
        current.currency && current.currency !== selectedCountry.currency
          ? current.currency
          : nextCountry.currency,
      timezone:
        current.timezone && current.timezone !== selectedCountry.timezone
          ? current.timezone
          : nextCountry.timezone,
    }));
  };

  const handleSaveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSavingProfile(true);
    setEditError(null);
    setEditSuccess(null);

    try {
      await platformClientFetch(`/hotels/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(form),
      });
      await detailQuery.refetch();
      setEditSuccess('Hotel profile updated successfully.');
    } catch (error) {
      setEditError(error instanceof Error ? error.message : 'Could not save hotel profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSaveSubscription = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSavingSubscription(true);
    setSubscriptionError(null);
    setSubscriptionSuccess(null);

    try {
      await platformClientFetch(`/hotels/${id}/subscription`, {
        method: 'PATCH',
        body: JSON.stringify({
          planId: subscriptionForm.planId || null,
          status: subscriptionForm.status,
          startsAt: subscriptionForm.startsAt || null,
          endsAt: subscriptionForm.endsAt || null,
          trialEndsAt: subscriptionForm.trialEndsAt || null,
          graceEndsAt: subscriptionForm.graceEndsAt || null,
          billingEmail: subscriptionForm.billingEmail || null,
          billingContactName: subscriptionForm.billingContactName || null,
          notes: subscriptionForm.notes || null,
        }),
      });
      await Promise.all([detailQuery.refetch(), entitlementsQuery.refetch(), subscriptionsOverviewQuery.refetch()]);
      setSubscriptionSuccess('Hotel subscription updated successfully.');
    } catch (error) {
      setSubscriptionError(error instanceof Error ? error.message : 'Could not update hotel subscription.');
    } finally {
      setIsSavingSubscription(false);
    }
  };

  const handleSaveOverride = async (featureKey: string) => {
    const form = overrideForms[featureKey];
    if (!form) return;
    setSavingOverrideKey(featureKey);
    setOverrideError(null);
    setOverrideSuccess(null);

    try {
      await platformClientFetch(`/hotels/${id}/feature-flags/${featureKey}`, {
        method: 'PATCH',
        body: JSON.stringify({
          mode: form.mode,
          enabled: form.mode === 'override' ? form.enabled : undefined,
          limitValue: form.mode === 'override' ? form.limitValue || null : null,
          reason: form.mode === 'override' ? form.reason || null : null,
        }),
      });
      await Promise.all([entitlementsQuery.refetch(), detailQuery.refetch()]);
      setOverrideSuccess(`Feature override saved for ${featureKey}.`);
    } catch (error) {
      setOverrideError(error instanceof Error ? error.message : 'Could not save the feature override.');
    } finally {
      setSavingOverrideKey(null);
    }
  };

  return (
    <main className="min-h-screen px-6 py-10 md:px-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-800">Hotel detail</p>
          <h1 className="text-3xl font-semibold tracking-tight">{hotel?.name ?? fallbackName ?? 'Hotel detail'}</h1>
          <p className="max-w-3xl text-sm leading-6 text-slate-600">
            Platform-level tenant detail, including hotel profile, admin accounts, counts, and recent activity.
          </p>
        </div>

        {authMessage ? <AuthNotice message={authMessage} /> : null}
        {actionError ? <AuthNotice title="Lifecycle update failed" message={actionError} /> : null}
        {editError ? <AuthNotice title="Profile update failed" message={editError} /> : null}
        {editSuccess ? <AuthNotice title="Profile saved" message={editSuccess} /> : null}
        {subscriptionError ? <AuthNotice title="Subscription update failed" message={subscriptionError} /> : null}
        {subscriptionSuccess ? <AuthNotice title="Subscription saved" message={subscriptionSuccess} /> : null}
        {overrideError ? <AuthNotice title="Feature override failed" message={overrideError} /> : null}
        {overrideSuccess ? <AuthNotice title="Feature override saved" message={overrideSuccess} /> : null}

        {detailQuery.isLoading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">Loading hotel details...</div>
        ) : hotel ? (
          <>
            <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <form onSubmit={handleSaveProfile} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold tracking-tight">Profile</h2>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="text-sm text-slate-700">
                    <span className="mb-1.5 block font-medium">Hotel name</span>
                    <input value={form.name} onChange={(e) => updateField('name', e.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-teal-700" />
                  </label>
                  <label className="text-sm text-slate-700">
                    <span className="mb-1.5 block font-medium">Domain</span>
                    <input value={form.domain} onChange={(e) => updateField('domain', e.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-teal-700" />
                  </label>
                  <label className="text-sm text-slate-700 md:col-span-2">
                    <span className="mb-1.5 block font-medium">Address</span>
                    <input value={form.address} onChange={(e) => updateField('address', e.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-teal-700" />
                  </label>
                  <label className="text-sm text-slate-700">
                    <span className="mb-1.5 block font-medium">City</span>
                    <input value={form.city} onChange={(e) => updateField('city', e.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-teal-700" />
                  </label>
                  <label className="text-sm text-slate-700">
                    <span className="mb-1.5 block font-medium">State</span>
                    <select value={form.state} onChange={(e) => updateField('state', e.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-teal-700">
                      <option value="">Select state or province</option>
                      {selectedCountry.states.map((state) => (
                        <option key={state} value={state}>
                          {state}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm text-slate-700">
                    <span className="mb-1.5 block font-medium">Country</span>
                    <select value={form.country} onChange={(e) => handleCountryChange(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-teal-700">
                      {COUNTRY_OPTIONS.map((country) => (
                        <option key={country.code} value={country.name}>
                          {country.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm text-slate-700">
                    <span className="mb-1.5 block font-medium">Phone</span>
                    <input value={form.phone} onChange={(e) => updateField('phone', e.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-teal-700" />
                  </label>
                  <label className="text-sm text-slate-700">
                    <span className="mb-1.5 block font-medium">Email</span>
                    <input value={form.email} onChange={(e) => updateField('email', e.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-teal-700" />
                  </label>
                  <label className="text-sm text-slate-700">
                    <span className="mb-1.5 block font-medium">Website</span>
                    <input value={form.website} onChange={(e) => updateField('website', e.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-teal-700" />
                  </label>
                  <label className="text-sm text-slate-700">
                    <span className="mb-1.5 block font-medium">Currency</span>
                    <select value={form.currency} onChange={(e) => updateField('currency', e.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 uppercase outline-none focus:border-teal-700">
                      {availableCurrencies.map((currency) => (
                        <option key={currency} value={currency}>
                          {currency}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm text-slate-700">
                    <span className="mb-1.5 block font-medium">Timezone</span>
                    <select value={form.timezone} onChange={(e) => updateField('timezone', e.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-teal-700">
                      {availableTimezones.map((timezone) => (
                        <option key={timezone} value={timezone}>
                          {timezone}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm text-slate-700 md:col-span-2">
                    <span className="mb-1.5 block font-medium">Description</span>
                    <textarea value={form.description} onChange={(e) => updateField('description', e.target.value)} rows={4} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-teal-700" />
                  </label>
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="rounded-full bg-teal-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {isSavingProfile ? 'Saving...' : 'Save hotel profile'}
                  </button>
                  <div className="text-sm text-slate-600">
                    <p>
                      Status:{' '}
                      {hotel.deletedAt ? 'Soft-deleted' : hotel.suspendedAt ? 'Suspended' : 'Active'}
                    </p>
                    <div className="mt-2">
                      <OnboardingStatusBadge status={hotel.onboardingStatus} showDescription />
                    </div>
                  </div>
                </div>
              </form>

              <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold tracking-tight">Counts</h2>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${healthClasses(hotel.health.status)}`}>
                    {hotel.health.label} · {hotel.health.score}
                  </span>
                  <p className="text-sm text-slate-500">{hotel.health.signals[0]}</p>
                </div>
                <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
                  <p>Rooms: {hotel._count.rooms}</p>
                  <p>Staff: {hotel._count.staff}</p>
                  <p>Guests: {hotel._count.guests}</p>
                  <p>Reservations: {hotel._count.reservations}</p>
                  <p>Facilities: {hotel._count.facilities}</p>
                  <p>Invoices: {hotel._count.invoices}</p>
                  <p>Overdue invoices: {hotel.health.overdueInvoices}</p>
                  <p>Recent staff login: {formatDate(hotel.health.lastStaffLoginAt)}</p>
                  <p>Recent reservations: {formatDate(hotel.health.lastReservationCreatedAt)}</p>
                </div>
                <div className="mt-4 space-y-2">
                  {hotel.health.signals.map((signal) => (
                    <p key={signal} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                      {signal}
                    </p>
                  ))}
                </div>
              </article>
            </section>

            <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <form onSubmit={handleSaveSubscription} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-800">Subscription</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">Commercial posture</h2>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <label className="text-sm text-slate-700">
                    <span className="mb-1.5 block font-medium">Plan</span>
                    <select
                      value={subscriptionForm.planId}
                      onChange={(e) => setSubscriptionForm((current) => ({ ...current, planId: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-teal-700"
                    >
                      <option value="">No plan assigned</option>
                      {subscriptionsOverviewQuery.data?.plans.map((plan) => (
                        <option key={plan.id} value={plan.id}>
                          {plan.name} ({plan.code})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm text-slate-700">
                    <span className="mb-1.5 block font-medium">Status</span>
                    <select
                      value={subscriptionForm.status}
                      onChange={(e) => setSubscriptionForm((current) => ({ ...current, status: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-teal-700"
                    >
                      {['TRIAL', 'ACTIVE', 'GRACE', 'SUSPENDED', 'EXPIRED', 'CANCELLED'].map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm text-slate-700">
                    <span className="mb-1.5 block font-medium">Starts at</span>
                    <input type="date" value={subscriptionForm.startsAt} onChange={(e) => setSubscriptionForm((current) => ({ ...current, startsAt: e.target.value }))} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-teal-700" />
                  </label>
                  <label className="text-sm text-slate-700">
                    <span className="mb-1.5 block font-medium">Ends at</span>
                    <input type="date" value={subscriptionForm.endsAt} onChange={(e) => setSubscriptionForm((current) => ({ ...current, endsAt: e.target.value }))} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-teal-700" />
                  </label>
                  <label className="text-sm text-slate-700">
                    <span className="mb-1.5 block font-medium">Trial ends at</span>
                    <input type="date" value={subscriptionForm.trialEndsAt} onChange={(e) => setSubscriptionForm((current) => ({ ...current, trialEndsAt: e.target.value }))} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-teal-700" />
                  </label>
                  <label className="text-sm text-slate-700">
                    <span className="mb-1.5 block font-medium">Grace ends at</span>
                    <input type="date" value={subscriptionForm.graceEndsAt} onChange={(e) => setSubscriptionForm((current) => ({ ...current, graceEndsAt: e.target.value }))} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-teal-700" />
                  </label>
                  <label className="text-sm text-slate-700">
                    <span className="mb-1.5 block font-medium">Billing email</span>
                    <input value={subscriptionForm.billingEmail} onChange={(e) => setSubscriptionForm((current) => ({ ...current, billingEmail: e.target.value }))} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-teal-700" />
                  </label>
                  <label className="text-sm text-slate-700">
                    <span className="mb-1.5 block font-medium">Billing contact</span>
                    <input value={subscriptionForm.billingContactName} onChange={(e) => setSubscriptionForm((current) => ({ ...current, billingContactName: e.target.value }))} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-teal-700" />
                  </label>
                  <label className="text-sm text-slate-700 md:col-span-2">
                    <span className="mb-1.5 block font-medium">Notes</span>
                    <textarea value={subscriptionForm.notes} onChange={(e) => setSubscriptionForm((current) => ({ ...current, notes: e.target.value }))} rows={3} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-teal-700" />
                  </label>
                </div>
                <div className="mt-5 space-y-2">
                  {entitlementsQuery.isLoading ? (
                    <p className="text-sm text-slate-600">Loading entitlement snapshot...</p>
                  ) : (entitlementsQuery.data?.warnings.length ?? 0) === 0 ? (
                    <p className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                      No subscription warnings right now.
                    </p>
                  ) : (
                    entitlementsQuery.data?.warnings.map((warning) => (
                      <p key={warning} className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                        {warning}
                      </p>
                    ))
                  )}
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <button type="submit" disabled={isSavingSubscription} className="rounded-full bg-teal-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">
                    {isSavingSubscription ? 'Saving...' : 'Save subscription'}
                  </button>
                  <Link href="/subscriptions" className="inline-flex items-center text-sm font-semibold text-teal-900">
                    Open platform subscriptions
                  </Link>
                </div>
              </form>

              <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-800">Entitlements</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">Feature access summary</h2>
                <div className="mt-5 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
                  <p>Enabled features: {entitlementsQuery.data ? Object.values(entitlementsQuery.data.features).filter(Boolean).length : '—'}</p>
                  <p>Total flags: {entitlementsQuery.data ? Object.keys(entitlementsQuery.data.features).length : '—'}</p>
                </div>
                <div className="mt-4 grid gap-3 text-sm text-slate-600">
                  <p>Subscription state: {entitlementsQuery.data?.subscriptionStatus ?? '—'}</p>
                  <p>Hotel overrides: {entitlementsQuery.data?.items.filter((item) => item.overrideEnabled !== null).length ?? '—'}</p>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  {entitlementsQuery.data
                    ? Object.entries(entitlementsQuery.data.features)
                        .slice(0, 8)
                        .map(([key, enabled]) => (
                          <span
                            key={key}
                            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                              enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {key}
                          </span>
                        ))
                    : null}
                </div>
                <div className="mt-5">
                  <Link href="/feature-controls" className="text-sm font-semibold text-teal-900">
                    Open feature controls
                  </Link>
                </div>
              </article>
            </section>

            <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-800">Hotel feature overrides</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">Local exceptions to plan policy</h2>
                <div className="mt-5 space-y-4">
                  {entitlementsQuery.isLoading ? (
                    <p className="text-sm text-slate-600">Loading feature controls...</p>
                  ) : (
                    entitlementsQuery.data?.items.map((item) => {
                      const form = overrideForms[item.key];
                      return (
                        <div key={item.key} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-semibold text-slate-900">{item.name ?? item.key}</p>
                                <span
                                  className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                                    item.effectiveEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                                  }`}
                                >
                                  Effective {item.effectiveEnabled ? 'on' : 'off'}
                                </span>
                              </div>
                              <p className="text-xs uppercase tracking-wide text-slate-500">{item.key}</p>
                              <p className="text-sm text-slate-600">{item.description ?? 'No description yet.'}</p>
                              <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                                <span>Global: {item.globalEnabled ? 'on' : 'off'}</span>
                                <span>Plan: {item.planEnabled === null ? 'inherit default' : item.planEnabled ? 'on' : 'off'}</span>
                                {item.hotelRolloutEnabled !== null ? (
                                  <span>Hotel rollout: {item.hotelRolloutEnabled ? 'on' : 'off'}</span>
                                ) : null}
                              </div>
                            </div>
                            <div className="w-full max-w-sm space-y-3">
                              <label className="block text-sm text-slate-700">
                                <span className="mb-1.5 block font-medium">Override mode</span>
                                <select
                                  value={form?.mode ?? 'inherit'}
                                  onChange={(event) =>
                                    setOverrideForms((current) => ({
                                      ...current,
                                      [item.key]: {
                                        ...(current[item.key] ?? {
                                          mode: 'inherit',
                                          enabled: item.effectiveEnabled,
                                          limitValue: '',
                                          reason: '',
                                        }),
                                        mode: event.target.value as OverrideFormEntry['mode'],
                                      },
                                    }))
                                  }
                                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-teal-700"
                                >
                                  <option value="inherit">Inherit plan/default</option>
                                  <option value="override">Set hotel override</option>
                                </select>
                              </label>
                              <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                                <input
                                  type="checkbox"
                                  checked={form?.enabled ?? false}
                                  disabled={form?.mode !== 'override'}
                                  onChange={(event) =>
                                    setOverrideForms((current) => ({
                                      ...current,
                                      [item.key]: {
                                        ...(current[item.key] ?? {
                                          mode: 'override',
                                          enabled: false,
                                          limitValue: '',
                                          reason: '',
                                        }),
                                        enabled: event.target.checked,
                                      },
                                    }))
                                  }
                                />
                                Override enabled state
                              </label>
                              <div className="grid gap-3 md:grid-cols-2">
                                <label className="text-sm text-slate-700">
                                  <span className="mb-1.5 block font-medium">Limit override</span>
                                  <input
                                    value={form?.limitValue ?? ''}
                                    disabled={form?.mode !== 'override'}
                                    onChange={(event) =>
                                      setOverrideForms((current) => ({
                                        ...current,
                                        [item.key]: {
                                          ...(current[item.key] ?? {
                                            mode: 'override',
                                            enabled: item.effectiveEnabled,
                                            limitValue: '',
                                            reason: '',
                                          }),
                                          limitValue: event.target.value,
                                        },
                                      }))
                                    }
                                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-teal-700 disabled:opacity-50"
                                    placeholder={item.scopeType === 'LIMIT' ? 'e.g. 25' : 'Optional'}
                                  />
                                </label>
                                <label className="text-sm text-slate-700">
                                  <span className="mb-1.5 block font-medium">Reason</span>
                                  <input
                                    value={form?.reason ?? ''}
                                    disabled={form?.mode !== 'override'}
                                    onChange={(event) =>
                                      setOverrideForms((current) => ({
                                        ...current,
                                        [item.key]: {
                                          ...(current[item.key] ?? {
                                            mode: 'override',
                                            enabled: item.effectiveEnabled,
                                            limitValue: '',
                                            reason: '',
                                          }),
                                          reason: event.target.value,
                                        },
                                      }))
                                    }
                                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-teal-700 disabled:opacity-50"
                                    placeholder="Why this hotel differs"
                                  />
                                </label>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleSaveOverride(item.key)}
                                disabled={savingOverrideKey === item.key}
                                className="rounded-full bg-teal-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                              >
                                {savingOverrideKey === item.key ? 'Saving...' : 'Save override'}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </article>

              <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-800">Override history</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">Recent hotel-level changes</h2>
                <div className="mt-5 space-y-3">
                  {entitlementsQuery.isLoading ? (
                    <p className="text-sm text-slate-600">Loading history...</p>
                  ) : (entitlementsQuery.data?.recentChanges.length ?? 0) === 0 ? (
                    <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      No hotel feature override changes have been recorded yet.
                    </p>
                  ) : (
                    entitlementsQuery.data?.recentChanges.map((entry) => (
                      <div key={entry.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-900">{entry.actorName}</p>
                          <span className="text-xs uppercase tracking-wide text-slate-500">{formatDate(entry.createdAt)}</span>
                        </div>
                        <p className="mt-2 text-sm text-slate-600">{entry.action}</p>
                      </div>
                    ))
                  )}
                </div>
              </article>
            </section>

            <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-800">Keycard oversight</p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-tight">Rollout and lock posture</h2>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                      hotel.keycards.enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {hotel.keycards.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="mt-5 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
                  <p>Hotel lock vendor: {hotel.keycards.hotelLockVendor ?? 'Not configured'}</p>
                  <p>Provider mode: {hotel.keycards.providerMode === 'mock' ? 'Mock provider' : 'Live provider'}</p>
                  <p>Lock API configured: {hotel.keycards.lockApiConfigured ? 'Yes' : 'No'}</p>
                  <p>Missing room lock mappings: {hotel.keycards.missingRoomLockMappings}</p>
                  <p>Rooms with lock mapping: {hotel.keycards.roomsWithLockMapping} / {hotel.keycards.totalRooms}</p>
                  <p>Denied events in last 24h: {hotel.keycards.accessSummary.denied24h}</p>
                </div>
                <div className="mt-5 space-y-3">
                  <p className="text-sm font-medium text-slate-700">Vendor coverage</p>
                  {hotel.keycards.roomVendors.length === 0 ? (
                    <p className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                      No room-specific vendor overrides yet.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {hotel.keycards.roomVendors.map((vendor) => (
                        <span
                          key={vendor.vendor}
                          className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700"
                        >
                          {vendor.vendor} · {vendor.rooms} rooms
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  <p className="font-medium text-slate-900">Configuration completeness</p>
                  <p className="mt-2">
                    {hotel.keycards.missingRoomLockMappings === 0
                      ? 'All rooms currently have lock mappings.'
                      : `${hotel.keycards.missingRoomLockMappings} room${hotel.keycards.missingRoomLockMappings === 1 ? '' : 's'} still need a lock device mapping.`}
                  </p>
                  <p className="mt-1">
                    Platform can use this panel to confirm whether the hotel is still on mock credentials or has moved to a live vendor.
                  </p>
                </div>
              </article>

              <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-800">Support signals</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">Recent keycard health</h2>
                <div className="mt-5 grid gap-3 text-sm text-slate-600">
                  <p>Granted in last 24h: {hotel.keycards.accessSummary.granted24h}</p>
                  <p>Denied in last 24h: {hotel.keycards.accessSummary.denied24h}</p>
                  <p>Expired in last 24h: {hotel.keycards.accessSummary.expired24h}</p>
                  <p>Revoked in last 24h: {hotel.keycards.accessSummary.revoked24h}</p>
                  <p>Unknown in last 24h: {hotel.keycards.accessSummary.unknown24h}</p>
                </div>
                <div className="mt-5 space-y-3">
                  <div>
                    <p className="text-sm font-medium text-slate-700">Configuration issues</p>
                    {hotel.keycards.supportSignals.configurationIssues.length === 0 ? (
                      <p className="mt-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                        No obvious configuration issues detected.
                      </p>
                    ) : (
                      <div className="mt-2 space-y-2">
                        {hotel.keycards.supportSignals.configurationIssues.map((issue) => (
                          <p key={issue} className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                            {issue}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700">Guest lifecycle issues</p>
                    {hotel.keycards.supportSignals.lifecycleIssues.length === 0 ? (
                      <p className="mt-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                        No current lifecycle warnings detected.
                      </p>
                    ) : (
                      <div className="mt-2 space-y-2">
                        {hotel.keycards.supportSignals.lifecycleIssues.map((issue) => (
                          <p key={issue} className="rounded-2xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900">
                            {issue}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </article>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-800">Observability</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight">Runtime issues and failed jobs</h2>
                </div>
                <Link href="/support" className="text-sm font-semibold text-teal-900">
                  Correlate with support
                </Link>
              </div>
              {observabilityQuery.isLoading ? (
                <p className="mt-5 text-sm text-slate-600">Loading observability summary...</p>
              ) : observabilityQuery.data ? (
                <>
                  <div className="mt-5 grid gap-4 md:grid-cols-4">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-medium text-slate-500">Failed jobs</p>
                      <p className="mt-2 text-2xl font-semibold tracking-tight">{observabilityQuery.data.summary.openFailedJobs}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-medium text-slate-500">Module alerts</p>
                      <p className="mt-2 text-2xl font-semibold tracking-tight">{observabilityQuery.data.summary.activeModuleAlerts}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-medium text-slate-500">Degraded events 24h</p>
                      <p className="mt-2 text-2xl font-semibold tracking-tight">{observabilityQuery.data.summary.degradedEvents24h}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-medium text-slate-500">Open support cases</p>
                      <p className="mt-2 text-2xl font-semibold tracking-tight">{observabilityQuery.data.summary.openSupportCases}</p>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-6 xl:grid-cols-2">
                    <div>
                      <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Failed jobs</h3>
                      <div className="mt-3 space-y-3">
                        {observabilityQuery.data.failedJobs.length === 0 ? (
                          <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                            No failed hotel automation jobs are currently recorded.
                          </p>
                        ) : (
                          observabilityQuery.data.failedJobs.map((job) => (
                            <div key={`${job.jobType}:${job.lastFailedAt ?? 'never'}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-semibold text-slate-900">{job.label}</p>
                                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-amber-900">
                                  {job.enabled ? 'Needs review' : 'Disabled'}
                                </span>
                              </div>
                              <p className="mt-2">Failed: {formatDate(job.lastFailedAt)}</p>
                              <p className="mt-1">Last success: {formatDate(job.lastSucceededAt)}</p>
                              <p className="mt-1">Error: {job.lastError ?? 'No error body recorded.'}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Module health</h3>
                      <div className="mt-3 space-y-3">
                        {observabilityQuery.data.moduleAlerts.length === 0 ? (
                          <p className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                            No realtime module telemetry has been recorded for this hotel yet.
                          </p>
                        ) : (
                          observabilityQuery.data.moduleAlerts.map((module) => (
                            <div key={module.moduleKey} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-semibold text-slate-900">{module.label}</p>
                                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${observabilityClasses(module.status)}`}>
                                  {module.status}
                                </span>
                              </div>
                              <p className="mt-2">Last event: {formatDate(module.lastEventAt)}</p>
                              <p className="mt-1">Type: {module.lastEventType ?? 'No signal yet'}</p>
                              <p className="mt-1">Summary: {module.lastSummary ?? 'No summary recorded.'}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Recent incidents</h3>
                    <div className="mt-3 space-y-3">
                      {observabilityQuery.data.recentIncidents.length === 0 ? (
                        <p className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                          No recent incidents are recorded for this hotel.
                        </p>
                      ) : (
                        observabilityQuery.data.recentIncidents.map((incident) => (
                          <div key={incident.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-slate-900">{incident.title}</p>
                              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${
                                incident.severity === 'warning' ? 'bg-amber-100 text-amber-900' : 'bg-sky-100 text-sky-900'
                              }`}>
                                {incident.source}
                              </span>
                            </div>
                            <p className="mt-2">{formatDate(incident.createdAt)}</p>
                            <p className="mt-1">{incident.summary}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <p className="mt-5 text-sm text-slate-600">No observability data is available for this hotel yet.</p>
              )}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-800">Support history</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight">Recent platform cases</h2>
                </div>
                <Link href="/support" className="text-sm font-semibold text-teal-900">
                  Open support inbox
                </Link>
              </div>
              <div className="mt-5 space-y-3">
                {supportQuery.isLoading ? (
                  <p className="text-sm text-slate-600">Loading recent support cases...</p>
                ) : (supportQuery.data?.cases.length ?? 0) === 0 ? (
                  <p className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                    No support cases are linked to this hotel yet.
                  </p>
                ) : (
                  supportQuery.data?.cases.map((supportCase) => (
                    <Link key={supportCase.id} href={`/support/${supportCase.id}`} className="block rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold text-slate-900">{supportCase.subject}</p>
                          <p className="mt-1 text-sm text-slate-600">
                            {supportCase.category} · {supportCase.priority} · {supportCase.status}
                          </p>
                        </div>
                        <p className="text-xs text-slate-500">{formatDate(supportCase.updatedAt)}</p>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold tracking-tight">Lifecycle controls</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Suspend, soft-delete, restore, and reactivate actions require explicit confirmation so we do not disrupt a tenant accidentally.
              </p>
              {hotel.suspensionReason ? (
                <p className="mt-4 text-sm text-amber-700">Current suspension note: {hotel.suspensionReason}</p>
              ) : null}
              {hotel.deletedAt ? (
                <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
                  <p className="font-semibold">Hotel is soft-deleted</p>
                  <p className="mt-1">Deleted at: {formatDate(hotel.deletedAt)}</p>
                  <p>Purge after: {formatDate(hotel.purgeAfterAt)}</p>
                  <p className="mt-1">Restore removes the delete marker, but you can reactivate separately if the hotel should go live again.</p>
                </div>
              ) : null}
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="text-sm text-slate-700">
                  <span className="mb-1.5 block font-medium">Reason</span>
                  <textarea
                    value={lifecycleReason}
                    onChange={(e) => setLifecycleReason(e.target.value)}
                    rows={3}
                    placeholder={hotel.suspendedAt ? 'Why is this tenant being reactivated?' : 'Why is this tenant being suspended?'}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-teal-700"
                  />
                </label>
                <label className="text-sm text-slate-700">
                  <span className="mb-1.5 block font-medium">Type hotel name to confirm</span>
                  <input
                    value={confirmationName}
                    onChange={(e) => setConfirmationName(e.target.value)}
                    placeholder={hotel.name}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-teal-700"
                  />
                  <p className="mt-2 text-xs text-slate-500">Confirmation must exactly match `{hotel.name}`.</p>
                </label>
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                {hotel.deletedAt ? (
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => handleLifecycleAction('restore')}
                    className="rounded-full bg-sky-800 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {isUpdating ? 'Updating...' : 'Restore hotel'}
                  </button>
                ) : hotel.suspendedAt ? (
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => handleLifecycleAction('reactivate')}
                    className="rounded-full bg-emerald-700 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {isUpdating ? 'Updating...' : 'Reactivate hotel'}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => handleLifecycleAction('suspend')}
                    className="rounded-full bg-amber-700 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {isUpdating ? 'Updating...' : 'Suspend hotel'}
                    </button>
                )}
                {!hotel.deletedAt ? (
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => handleLifecycleAction('soft-delete')}
                    className="rounded-full bg-rose-700 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {isUpdating ? 'Updating...' : 'Soft-delete hotel'}
                  </button>
                ) : null}
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Soft-delete applies a 30-day purge window and keeps the tenant suspended until you explicitly reactivate it later.
              </p>
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold tracking-tight">Admin accounts</h2>
                <div className="mt-4 space-y-3">
                  {hotel.admins.length === 0 ? (
                    <p className="text-sm text-slate-600">No admins assigned.</p>
                  ) : (
                    hotel.admins.map((admin) => (
                      <div key={admin.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                        <p className="font-medium text-slate-900">{admin.name}</p>
                        <p>{admin.email}</p>
                        <p>Last login: {formatDate(admin.lastLoginAt)}</p>
                      </div>
                    ))
                  )}
                </div>
              </article>

              <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold tracking-tight">Recent staff logins</h2>
                <div className="mt-4 space-y-3">
                  {hotel.recentStaffLogins.length === 0 ? (
                    <p className="text-sm text-slate-600">No staff login activity yet.</p>
                  ) : (
                    hotel.recentStaffLogins.map((staff) => (
                      <div key={staff.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                        <p className="font-medium text-slate-900">{staff.name}</p>
                        <p>{staff.email}</p>
                        <p>Last login: {formatDate(staff.lastLoginAt)}</p>
                      </div>
                    ))
                  )}
                </div>
              </article>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-800">Incident history</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight">Recent keycard events</h2>
                </div>
                <Link href={`/audit-logs?hotel=${encodeURIComponent(hotel.name)}&action=keycard`} className="text-sm font-semibold text-teal-900">
                  Open audit logs
                </Link>
              </div>
              <div className="mt-6 space-y-3">
                {hotel.keycards.accessSummary.recentEvents.length === 0 ? (
                  <p className="text-sm text-slate-600">No recent keycard access events recorded for this hotel.</p>
                ) : (
                  hotel.keycards.accessSummary.recentEvents.map((event) => (
                    <div key={event.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold uppercase tracking-wide text-slate-900">
                          {accessResultLabel(event.result)}
                        </span>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${incidentClasses(event.diagnosis)}`}>
                          {event.diagnosis}
                        </span>
                      </div>
                      <p className="mt-2">
                        {formatDate(event.createdAt)}
                        {event.roomNumber ? ` · Room ${event.roomNumber}` : ''}
                        {event.deviceId ? ` · Device ${event.deviceId}` : ''}
                      </p>
                      <p className="mt-1">
                        Reason: {event.reason ?? 'No explicit reason provided'}
                        {event.accessTokenPreview ? ` · Token ${event.accessTokenPreview}` : ''}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </section>
          </>
        ) : (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">Hotel not found.</div>
        )}

        <div className="text-sm text-slate-500">
          <Link href="/hotels" className="font-semibold text-teal-900">
            Back to hotels
          </Link>
        </div>
      </div>
    </main>
  );
}
