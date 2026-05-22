'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AuthNotice } from '@/components/platform/AuthNotice';
import { OnboardingStatusBadge } from '@/components/platform/OnboardingStatusBadge';
import { usePlatformHotelDetail } from '@/hooks/usePlatform';
import { platformClientFetch } from '@/lib/platform-client';
import type { PlatformHotelDetailResponse } from '@/lib/platform-types';
import { PlatformClientError } from '@/lib/platform-client';

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

export function HotelDetailClient({ id, fallbackName }: { id: string; fallbackName?: string }) {
  const detailQuery = usePlatformHotelDetail(id);
  const hotel = detailQuery.data as PlatformHotelDetailResponse | undefined;
  const authMessage = detailQuery.error instanceof PlatformClientError ? detailQuery.error.message : null;
  const [actionError, setActionError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
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
    setConfirmationName('');
  }, [hotel]);

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
                    <input value={form.state} onChange={(e) => updateField('state', e.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-teal-700" />
                  </label>
                  <label className="text-sm text-slate-700">
                    <span className="mb-1.5 block font-medium">Country</span>
                    <input value={form.country} onChange={(e) => updateField('country', e.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-teal-700" />
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
                    <input value={form.currency} onChange={(e) => updateField('currency', e.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 uppercase outline-none focus:border-teal-700" />
                  </label>
                  <label className="text-sm text-slate-700">
                    <span className="mb-1.5 block font-medium">Timezone</span>
                    <input value={form.timezone} onChange={(e) => updateField('timezone', e.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-teal-700" />
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
