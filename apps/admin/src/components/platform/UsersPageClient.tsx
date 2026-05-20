'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthNotice } from '@/components/platform/AuthNotice';
import { PaginationControls } from '@/components/platform/PaginationControls';
import { usePlatformUsers } from '@/hooks/usePlatform';
import { PlatformClientError } from '@/lib/platform-client';

function formatDate(value: string | null) {
  if (!value) return 'Never';
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function UsersPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const page = Math.max(1, Number(searchParams?.get('page') ?? '1'));
  const limit = 20;
  const usersQuery = usePlatformUsers(page, limit);
  const users = usersQuery.data?.users ?? [];
  const authMessage = usersQuery.error instanceof PlatformClientError ? usersQuery.error.message : null;

  const changePage = (nextPage: number) => {
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    params.set('page', String(nextPage));
    router.push(`/users?${params.toString()}`);
  };

  return (
    <main className="min-h-screen px-6 py-10 md:px-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-800">User lookup</p>
          <h1 className="text-3xl font-semibold tracking-tight">Cross-tenant users</h1>
          <p className="max-w-3xl text-sm leading-6 text-slate-600">
            This page is wired to the live platform user listing endpoint and gives the admin app its first support
            workflow surface.
          </p>
        </div>

        {authMessage ? <AuthNotice message={authMessage} /> : null}

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-left">
            <thead className="bg-slate-50/80">
              <tr className="text-sm text-slate-500">
                <th className="px-5 py-4 font-medium">User</th>
                <th className="px-5 py-4 font-medium">Role</th>
                <th className="px-5 py-4 font-medium">Hotel</th>
                <th className="px-5 py-4 font-medium">Status</th>
                <th className="px-5 py-4 font-medium">Last login</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {usersQuery.isLoading ? (
                <tr>
                  <td className="px-5 py-8 text-sm text-slate-500" colSpan={5}>
                    Loading users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td className="px-5 py-8 text-sm text-slate-500" colSpan={5}>
                    No user data available yet.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="text-sm text-slate-700">
                    <td className="px-5 py-4">
                      <Link href={`/users/${user.id}`} className="font-medium text-slate-900 hover:text-teal-900">
                        {user.staff?.name ?? user.email}
                      </Link>
                      <p className="mt-1 text-xs text-slate-500">{user.email}</p>
                      {user.staff ? <p className="mt-1 text-xs text-slate-500">{user.staff.employeeCode}</p> : null}
                    </td>
                    <td className="px-5 py-4 uppercase tracking-wide">{user.role}</td>
                    <td className="px-5 py-4">
                      {user.hotel ? (
                        <>
                          <p className="font-medium text-slate-900">{user.hotel.name}</p>
                          <p className="text-xs text-slate-500">
                            {user.hotel.city}, {user.hotel.country}
                          </p>
                        </>
                      ) : (
                        <span className="text-slate-500">No hotel linked</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-600">
                      <p>{user.isActive ? 'Active' : 'Inactive'}</p>
                      <p>{user.mustChangePassword ? 'Password reset required' : 'Password current'}</p>
                    </td>
                    <td className="px-5 py-4 text-slate-500">{formatDate(user.lastLoginAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <PaginationControls
          page={usersQuery.data?.page ?? page}
          totalPages={usersQuery.data?.totalPages ?? 1}
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
