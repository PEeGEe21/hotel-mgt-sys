'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthNotice } from '@/components/platform/AuthNotice';
import { PaginationControls } from '@/components/platform/PaginationControls';
import { usePlatformHotels } from '@/hooks/usePlatform';
import { PlatformClientError } from '@/lib/platform-client';

function formatDate(value: string | null) {
  if (!value) return 'No recent login';
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function HotelsPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const page = Math.max(1, Number(searchParams?.get('page') ?? '1'));
  const limit = 20;
  const hotelsQuery = usePlatformHotels(page, limit);
  const hotels = hotelsQuery.data?.hotels ?? [];
  const authMessage = hotelsQuery.error instanceof PlatformClientError ? hotelsQuery.error.message : null;

  const changePage = (nextPage: number) => {
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    params.set('page', String(nextPage));
    router.push(`/hotels?${params.toString()}`);
  };

  return (
    <main className="min-h-screen px-6 py-10 md:px-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-800">Hotel management</p>
          <h1 className="text-3xl font-semibold tracking-tight">Platform hotels</h1>
          <p className="max-w-3xl text-sm leading-6 text-slate-600">
            This page is wired to the live platform hotel listing endpoint. It will grow into the main lifecycle,
            onboarding, suspension, and diagnostics surface.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/hotels/new"
            className="inline-flex items-center rounded-full bg-teal-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-700"
          >
            Create hotel
          </Link>
        </div>

        {authMessage ? <AuthNotice message={authMessage} /> : null}

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-left">
            <thead className="bg-slate-50/80">
              <tr className="text-sm text-slate-500">
                <th className="px-5 py-4 font-medium">Hotel</th>
                <th className="px-5 py-4 font-medium">Status</th>
                <th className="px-5 py-4 font-medium">Primary admin</th>
                <th className="px-5 py-4 font-medium">Counts</th>
                <th className="px-5 py-4 font-medium">Last login</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {hotelsQuery.isLoading ? (
                <tr>
                  <td className="px-5 py-8 text-sm text-slate-500" colSpan={5}>
                    Loading hotels...
                  </td>
                </tr>
              ) : hotels.length === 0 ? (
                <tr>
                  <td className="px-5 py-8 text-sm text-slate-500" colSpan={5}>
                    No hotel data available yet.
                  </td>
                </tr>
              ) : (
                hotels.map((hotel) => (
                  <tr key={hotel.id} className="text-sm text-slate-700">
                    <td className="px-5 py-4">
                      <Link href={`/hotels/${hotel.id}`} className="font-medium text-slate-900 hover:text-teal-900">
                        {hotel.name}
                      </Link>
                      <p className="mt-1 text-xs text-slate-500">
                        {hotel.city}, {hotel.country}
                        {hotel.domain ? ` • ${hotel.domain}` : ''}
                      </p>
                    </td>
                    <td className="px-5 py-4 uppercase tracking-wide">{hotel.status}</td>
                    <td className="px-5 py-4">
                      {hotel.primaryAdmin ? (
                        <>
                          <p className="font-medium text-slate-900">{hotel.primaryAdmin.name}</p>
                          <p className="text-xs text-slate-500">{hotel.primaryAdmin.email}</p>
                        </>
                      ) : (
                        <span className="text-slate-500">No admin assigned</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-600">
                      <p>Rooms: {hotel.counts.rooms}</p>
                      <p>Staff: {hotel.counts.staff}</p>
                      <p>Reservations: {hotel.counts.reservations}</p>
                    </td>
                    <td className="px-5 py-4 text-slate-500">{formatDate(hotel.latestStaffLoginAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <PaginationControls
          page={hotelsQuery.data?.page ?? page}
          totalPages={hotelsQuery.data?.totalPages ?? 1}
          onPageChange={changePage}
        />

        <div className="text-sm text-slate-500">
          <Link href="/" className="font-semibold text-teal-900">
            Back to dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
