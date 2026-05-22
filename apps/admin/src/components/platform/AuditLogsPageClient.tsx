'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthNotice } from '@/components/platform/AuthNotice';
import { PaginationControls } from '@/components/platform/PaginationControls';
import { usePlatformAuditLogs } from '@/hooks/usePlatform';
import { PlatformClientError } from '@/lib/platform-client';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function AuditLogsPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const page = Math.max(1, Number(searchParams?.get('page') ?? '1'));
  const limit = 20;
  const filters = {
    action: searchParams?.get('action') ?? '',
    actor: searchParams?.get('actor') ?? '',
    hotel: searchParams?.get('hotel') ?? '',
    targetUser: searchParams?.get('targetUser') ?? '',
    search: searchParams?.get('search') ?? '',
  };
  const logsQuery = usePlatformAuditLogs(page, limit, filters);
  const logs = logsQuery.data?.logs ?? [];
  const authMessage = logsQuery.error instanceof PlatformClientError ? logsQuery.error.message : null;

  const changePage = (nextPage: number) => {
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    params.set('page', String(nextPage));
    router.push(`/audit-logs?${params.toString()}`);
  };

  const applyFilters = (formData: FormData) => {
    const params = new URLSearchParams();
    for (const key of ['action', 'actor', 'hotel', 'targetUser', 'search']) {
      const value = String(formData.get(key) ?? '').trim();
      if (value) params.set(key, value);
    }
    router.push(`/audit-logs?${params.toString()}`);
  };

  return (
    <main className="min-h-screen px-6 py-10 md:px-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-800">Audit logs</p>
          <h1 className="text-3xl font-semibold tracking-tight">Platform audit trail</h1>
          <p className="max-w-3xl text-sm leading-6 text-slate-600">
            Review recent platform-wide actions, super-admin auth events, and hotel lifecycle changes from one place.
          </p>
        </div>

        {authMessage ? <AuthNotice message={authMessage} /> : null}

        <form
          action={applyFilters}
          className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2 xl:grid-cols-5"
        >
          <label className="text-sm text-slate-700">
            <span className="mb-1.5 block font-medium">Action</span>
            <input
              name="action"
              defaultValue={filters.action}
              placeholder="platform.hotel"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-teal-700"
            />
          </label>
          <label className="text-sm text-slate-700">
            <span className="mb-1.5 block font-medium">Actor email</span>
            <input
              name="actor"
              defaultValue={filters.actor}
              placeholder="admin@hotelos.com"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-teal-700"
            />
          </label>
          <label className="text-sm text-slate-700">
            <span className="mb-1.5 block font-medium">Hotel</span>
            <input
              name="hotel"
              defaultValue={filters.hotel}
              placeholder="Hotel name"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-teal-700"
            />
          </label>
          <label className="text-sm text-slate-700">
            <span className="mb-1.5 block font-medium">Target user</span>
            <input
              name="targetUser"
              defaultValue={filters.targetUser}
              placeholder="target@hotel.com"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-teal-700"
            />
          </label>
          <label className="text-sm text-slate-700">
            <span className="mb-1.5 block font-medium">Free search</span>
            <input
              name="search"
              defaultValue={filters.search}
              placeholder="action, actor, hotel"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-teal-700"
            />
          </label>
          <div className="flex flex-wrap gap-3 md:col-span-2 xl:col-span-5">
            <button
              type="submit"
              className="inline-flex items-center rounded-full bg-teal-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-700"
            >
              Apply filters
            </button>
            <Link
              href="/audit-logs"
              className="inline-flex items-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
            >
              Clear
            </Link>
          </div>
        </form>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-left">
            <thead className="bg-slate-50/80">
              <tr className="text-sm text-slate-500">
                <th className="px-5 py-4 font-medium">Action</th>
                <th className="px-5 py-4 font-medium">Actor</th>
                <th className="px-5 py-4 font-medium">Hotel</th>
                <th className="px-5 py-4 font-medium">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logsQuery.isLoading ? (
                <tr>
                  <td className="px-5 py-8 text-sm text-slate-500" colSpan={4}>
                    Loading audit logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td className="px-5 py-8 text-sm text-slate-500" colSpan={4}>
                    No platform audit events yet.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="text-sm text-slate-700">
                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-900">{log.action}</p>
                      {log.targetUser ? <p className="mt-1 text-xs text-slate-500">Target: {log.targetUser.email}</p> : null}
                      {log.metadata ? (
                        <p className="mt-1 line-clamp-2 text-xs text-slate-500">{JSON.stringify(log.metadata)}</p>
                      ) : null}
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-900">{log.actor.name}</p>
                      <p className="text-xs text-slate-500">{log.actor.email}</p>
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-600">
                      {log.hotel ? log.hotel.name : 'Platform-wide'}
                    </td>
                    <td className="px-5 py-4 text-slate-500">{formatDate(log.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <PaginationControls
          page={logsQuery.data?.page ?? page}
          totalPages={logsQuery.data?.totalPages ?? 1}
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
