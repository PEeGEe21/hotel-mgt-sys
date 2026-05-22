'use client';

import Link from 'next/link';
import { useState } from 'react';
import { adminStartTenantImpersonationAction } from '@/actions/admin-auth.actions';
import { AuthNotice } from '@/components/platform/AuthNotice';
import { usePlatformUserDetail } from '@/hooks/usePlatform';
import type { PlatformUserDetailResponse } from '@/lib/platform-types';
import { PlatformClientError } from '@/lib/platform-client';

function formatDate(value: string | null) {
  if (!value) return 'No activity';
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export function UserDetailClient({ id }: { id: string }) {
  const detailQuery = usePlatformUserDetail(id);
  const user = detailQuery.data as PlatformUserDetailResponse | undefined;
  const authMessage = detailQuery.error instanceof PlatformClientError ? detailQuery.error.message : null;
  const [impersonationError, setImpersonationError] = useState<string | null>(null);
  const [isStartingImpersonation, setIsStartingImpersonation] = useState(false);

  const handleStartImpersonation = async () => {
    setIsStartingImpersonation(true);
    setImpersonationError(null);
    const result = await adminStartTenantImpersonationAction(id);
    if (!result.success) {
      setImpersonationError(result.message);
      setIsStartingImpersonation(false);
      return;
    }

    const popup = window.open(result.launchUrl, '_blank', 'noopener,noreferrer');
    if (!popup) {
      window.location.href = result.launchUrl;
    }
  };

  return (
    <main className="min-h-screen px-6 py-10 md:px-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-800">User detail</p>
          <h1 className="text-3xl font-semibold tracking-tight">{user?.staff?.name ?? user?.email ?? 'User detail'}</h1>
          <p className="max-w-3xl text-sm leading-6 text-slate-600">
            Platform-level user detail, including staff profile, hotel assignment, and recent sessions.
          </p>
        </div>

        {authMessage ? <AuthNotice message={authMessage} /> : null}
        {impersonationError ? <AuthNotice title="Impersonation failed" message={impersonationError} /> : null}

        {detailQuery.isLoading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">Loading user details...</div>
        ) : user ? (
          <>
            <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold tracking-tight">Account</h2>
                <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
                  <p>Email: {user.email}</p>
                  <p>Role: {user.role}</p>
                  <p>Status: {user.isActive ? 'Active' : 'Inactive'}</p>
                  <p>Last login: {formatDate(user.lastLoginAt)}</p>
                  <p>Password reset: {user.mustChangePassword ? 'Required' : 'Not required'}</p>
                </div>
                {user.hotel && user.role !== 'SUPER_ADMIN' ? (
                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleStartImpersonation}
                      disabled={isStartingImpersonation}
                      className="rounded-full bg-teal-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {isStartingImpersonation ? 'Opening tenant workspace...' : 'Impersonate in web app'}
                    </button>
                    <p className="text-sm text-slate-500">
                      Launches the tenant-facing app in a separate impersonation session with a hard expiry.
                    </p>
                  </div>
                ) : null}
              </article>

              <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold tracking-tight">Assignment</h2>
                <div className="mt-4 grid gap-3 text-sm text-slate-600">
                  <p>Hotel: {user.hotel?.name ?? 'No hotel linked'}</p>
                  <p>Department: {user.staff?.department ?? '—'}</p>
                  <p>Position: {user.staff?.position ?? '—'}</p>
                  <p>Employee code: {user.staff?.employeeCode ?? '—'}</p>
                </div>
              </article>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold tracking-tight">Recent sessions</h2>
              <div className="mt-4 space-y-3">
                {user.recentSessions.length === 0 ? (
                  <p className="text-sm text-slate-600">No recent sessions.</p>
                ) : (
                  user.recentSessions.map((session) => (
                    <div key={session.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                      <p className="font-medium text-slate-900">Session {session.id.slice(0, 8)}</p>
                      <p>Created: {formatDate(session.createdAt)}</p>
                      <p>Expires: {formatDate(session.expiresAt)}</p>
                      <p>Impersonation: {session.isImpersonation ? 'Yes' : 'No'}</p>
                    </div>
                  ))
                )}
              </div>
            </section>
          </>
        ) : (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">User not found.</div>
        )}

        <div className="text-sm text-slate-500">
          <Link href="/users" className="font-semibold text-teal-900">
            Back to users
          </Link>
        </div>
      </div>
    </main>
  );
}
