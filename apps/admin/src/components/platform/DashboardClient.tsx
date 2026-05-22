'use client';

import Link from 'next/link';
import { AuthNotice } from '@/components/platform/AuthNotice';
import { OnboardingStatusBadge } from '@/components/platform/OnboardingStatusBadge';
import { PlatformClientError } from '@/lib/platform-client';
import { usePlatformActivityFeed, usePlatformHotels, usePlatformStats } from '@/hooks/usePlatform';

const tracks = [
  {
    title: 'Hotel management',
    description: 'Create, review, suspend, restore, and monitor tenant hotels without touching tenant UI.',
  },
  {
    title: 'Tenant onboarding',
    description: 'Provision a hotel, create the first admin, seed defaults, and track setup progress.',
  },
  {
    title: 'Platform support',
    description: 'Cross-tenant lookup, audited impersonation, activity feed, and health diagnostics.',
  },
];

function formatCount(value: number) {
  return new Intl.NumberFormat('en-US').format(value);
}

function formatDate(value: string | null) {
  if (!value) return 'No recent activity';
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
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

export function DashboardClient() {
  const statsQuery = usePlatformStats();
  const hotelsQuery = usePlatformHotels(1, 8);
  const activityQuery = usePlatformActivityFeed(6);

  const authMessage =
    statsQuery.error instanceof PlatformClientError
      ? statsQuery.error.message
      : hotelsQuery.error instanceof PlatformClientError
        ? hotelsQuery.error.message
        : activityQuery.error instanceof PlatformClientError
          ? activityQuery.error.message
          : null;

  const quickStats = statsQuery.data
    ? [
        { label: 'Hotels', value: formatCount(statsQuery.data.totals.hotels), note: 'Total tenants on the platform' },
        {
          label: 'Active users',
          value: formatCount(statsQuery.data.totals.activeUsers),
          note: 'Accounts currently enabled',
        },
        {
          label: 'Stale hotels',
          value: formatCount(statsQuery.data.totals.staleHotels30d),
          note: 'No recent staff login in the last 30 days',
        },
        {
          label: 'Suspended hotels',
          value: formatCount(statsQuery.data.totals.suspendedHotels),
          note: 'Tenants currently blocked at platform level',
        },
      ]
    : [
        { label: 'Hotels', value: '—', note: 'Waiting for platform auth' },
        { label: 'Active users', value: '—', note: 'Waiting for platform auth' },
        { label: 'Stale hotels', value: '—', note: 'Waiting for platform auth' },
        { label: 'Suspended hotels', value: '—', note: 'Waiting for platform auth' },
      ];

  const hotels = hotelsQuery.data?.hotels ?? [];
  const incompleteOnboardings = hotels.filter((hotel) => hotel.onboardingStatus !== 'ACTIVE');
  const activity = activityQuery.data?.events ?? [];

  return (
    <main className="min-h-screen px-6 py-10 text-slate-900 md:px-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-8 px-8 py-10 md:grid-cols-2 md:px-10">
            <div className="space-y-6">
              <span className="inline-flex rounded-full bg-teal-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-teal-50">
                HotelOS Platform
              </span>
              <div className="space-y-3">
                <h1 className="max-w-3xl text-4xl font-semibold tracking-tight md:text-5xl">
                  Standalone super admin control plane for HotelOS.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
                  This app is the platform boundary: tenant lifecycle, cross-hotel support, platform visibility, and
                  super-admin operations live here, separate from the tenant-facing product.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/login"
                  className="inline-flex items-center rounded-full bg-teal-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-700"
                >
                  Open admin login
                </Link>
                <Link
                  href="/hotels"
                  className="inline-flex items-center rounded-full border border-slate-300 bg-white/70 px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-white"
                >
                  Open hotel management
                </Link>
                <Link
                  href="/hotels/new"
                  className="inline-flex items-center rounded-full border border-slate-300 bg-white/70 px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-white"
                >
                  Create hotel tenant
                </Link>
                <Link
                  href="/users"
                  className="inline-flex items-center rounded-full border border-slate-300 bg-white/70 px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-white"
                >
                  Open user lookup
                </Link>
              </div>
            </div>

            <div className="grid gap-4">
              {quickStats.map((item) => (
                <div key={item.label} className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
                  <p className="text-sm font-medium text-slate-500">{item.label}</p>
                  <p className="mt-3 text-4xl font-semibold tracking-tight">{item.value}</p>
                  <p className="mt-2 text-sm text-slate-600">{item.note}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-3">
          {tracks.map((track) => (
            <article key={track.title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold tracking-tight">{track.title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">{track.description}</p>
            </article>
          ))}
        </section>

        {authMessage ? <AuthNotice message={authMessage} /> : null}

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-800">Recent hotels</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">Latest tenant activity</h2>
              </div>
              <Link href="/hotels" className="text-sm font-semibold text-teal-900">
                View all
              </Link>
            </div>

            <div className="mt-6 space-y-4">
              {hotelsQuery.isLoading ? (
                <p className="text-sm text-slate-600">Loading hotels...</p>
              ) : hotels.length === 0 ? (
                <p className="text-sm text-slate-600">Hotel data will appear here once admin auth is connected.</p>
              ) : (
                hotels.map((hotel) => (
                  <div key={hotel.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">{hotel.name}</h3>
                        <p className="mt-1 text-sm text-slate-600">
                          {hotel.city}, {hotel.country}
                          {hotel.domain ? ` • ${hotel.domain}` : ''}
                        </p>
                      </div>
                      <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                        {hotel.status}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${healthClasses(hotel.health.status)}`}>
                        {hotel.health.label} · {hotel.health.score}
                      </span>
                      <span className="text-xs text-slate-500">
                        Reservations: {formatDate(hotel.health.lastReservationCreatedAt)}
                      </span>
                    </div>
                    <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-3">
                      <p>Rooms: {hotel.counts.rooms}</p>
                      <p>Staff: {hotel.counts.staff}</p>
                      <p>Reservations: {hotel.counts.reservations}</p>
                    </div>
                    <div className="mt-3">
                      <OnboardingStatusBadge status={hotel.onboardingStatus} />
                    </div>
                    <p className="mt-3 text-sm text-slate-500">
                      Latest staff login: {formatDate(hotel.latestStaffLoginAt)}
                    </p>
                    <p className="mt-2 text-sm text-slate-500">{hotel.health.signals[0]}</p>
                  </div>
                ))
              )}
            </div>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-800">Activity feed</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">Platform actions</h2>

            <div className="mt-6 space-y-4">
              {activityQuery.isLoading ? (
                <p className="text-sm text-slate-600">Loading activity feed...</p>
              ) : activity.length === 0 ? (
                <p className="text-sm text-slate-600">Recent platform activity will show up here.</p>
              ) : (
                activity.map((event) => (
                  <div key={event.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-900">{event.action}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {event.actor.name} • {event.actor.role}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {event.hotel ? event.hotel.name : 'Platform-wide'} • {formatDate(event.createdAt)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </article>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-800">Health watch</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">Tenants that need attention</h2>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {hotelsQuery.isLoading ? (
              <p className="text-sm text-slate-600">Loading health indicators...</p>
            ) : hotels.filter((hotel) => hotel.health.status !== 'healthy').length === 0 ? (
              <p className="text-sm text-slate-600">The latest platform hotels look healthy right now.</p>
            ) : (
              hotels
                .filter((hotel) => hotel.health.status !== 'healthy')
                .map((hotel) => (
                  <div key={hotel.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">{hotel.name}</h3>
                        <p className="mt-1 text-sm text-slate-600">
                          {hotel.city}, {hotel.country}
                        </p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${healthClasses(hotel.health.status)}`}>
                        {hotel.health.label} · {hotel.health.score}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-3 text-sm text-slate-600 md:grid-cols-3">
                      <p>Last login: {formatDate(hotel.health.lastStaffLoginAt)}</p>
                      <p>Last reservation: {formatDate(hotel.health.lastReservationCreatedAt)}</p>
                      <p>Overdue invoices: {hotel.health.overdueInvoices}</p>
                    </div>
                    <p className="mt-3 text-sm text-slate-500">{hotel.health.signals[0]}</p>
                  </div>
                ))
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-800">Onboarding watch</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">Hotels that still need setup work</h2>
            </div>
            <Link href="/hotels" className="text-sm font-semibold text-teal-900">
              Manage hotels
            </Link>
          </div>

          <div className="mt-6 space-y-4">
            {hotelsQuery.isLoading ? (
              <p className="text-sm text-slate-600">Loading onboarding progress...</p>
            ) : incompleteOnboardings.length === 0 ? (
              <p className="text-sm text-slate-600">The latest platform hotels all have rooms and staff in place.</p>
            ) : (
              incompleteOnboardings.map((hotel) => (
                <div key={hotel.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">{hotel.name}</h3>
                      <p className="mt-1 text-sm text-slate-600">
                        {hotel.city}, {hotel.country}
                      </p>
                    </div>
                    <OnboardingStatusBadge status={hotel.onboardingStatus} />
                  </div>
                  <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-3">
                    <p>Rooms: {hotel.counts.rooms}</p>
                    <p>Staff: {hotel.counts.staff}</p>
                    <p>Reservations: {hotel.counts.reservations}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
