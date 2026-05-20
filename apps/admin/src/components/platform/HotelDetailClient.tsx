'use client';

import Link from 'next/link';
import { AuthNotice } from '@/components/platform/AuthNotice';
import { usePlatformHotelDetail } from '@/hooks/usePlatform';
import type { PlatformHotelDetailResponse } from '@/lib/platform-types';
import { PlatformClientError } from '@/lib/platform-client';

function formatDate(value: string | null) {
  if (!value) return 'No activity';
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export function HotelDetailClient({ id, fallbackName }: { id: string; fallbackName?: string }) {
  const detailQuery = usePlatformHotelDetail(id);
  const hotel = detailQuery.data as PlatformHotelDetailResponse | undefined;
  const authMessage = detailQuery.error instanceof PlatformClientError ? detailQuery.error.message : null;

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

        {detailQuery.isLoading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">Loading hotel details...</div>
        ) : hotel ? (
          <>
            <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold tracking-tight">Profile</h2>
                <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
                  <p>Email: {hotel.email}</p>
                  <p>Phone: {hotel.phone}</p>
                  <p>City: {hotel.city}</p>
                  <p>Country: {hotel.country}</p>
                  <p>Currency: {hotel.currency}</p>
                  <p>Timezone: {hotel.timezone}</p>
                </div>
                <p className="mt-4 text-sm text-slate-600">{hotel.address}</p>
              </article>

              <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold tracking-tight">Counts</h2>
                <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
                  <p>Rooms: {hotel._count.rooms}</p>
                  <p>Staff: {hotel._count.staff}</p>
                  <p>Guests: {hotel._count.guests}</p>
                  <p>Reservations: {hotel._count.reservations}</p>
                  <p>Facilities: {hotel._count.facilities}</p>
                  <p>Invoices: {hotel._count.invoices}</p>
                </div>
              </article>
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
