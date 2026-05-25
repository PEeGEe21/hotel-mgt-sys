'use client';

import { useState } from 'react';
import { usePlatformSuperAdmins } from '@/hooks/usePlatform';
import { platformClientFetch, PlatformClientError } from '@/lib/platform-client';
import { AuthNotice } from '@/components/platform/AuthNotice';
import openToast from '@/components/ToastComponent';

export function SuperAdminsPageClient() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [search, setSearch] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const adminsQuery = usePlatformSuperAdmins(search);
  const admins = adminsQuery.data?.superAdmins ?? [];
  const authMessage = adminsQuery.error instanceof PlatformClientError ? adminsQuery.error.message : null;

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      await platformClientFetch('/super-admins', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
        }),
      });

      setSuccess(`Super admin invite sent to ${email.trim().toLowerCase()}.`);
      openToast('success', `Super admin invite sent to ${email.trim().toLowerCase()}.`);
      setName('');
      setEmail('');
      await adminsQuery.refetch();
    } catch (error) {
      const message =
        error instanceof PlatformClientError ? error.message : 'Could not create super admin.';
      setFormError(message);
      openToast('error', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen px-6 py-10 md:px-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-800">Platform identity</p>
          <h1 className="text-3xl font-semibold tracking-tight">Super admins</h1>
          <p className="max-w-3xl text-sm leading-6 text-slate-600">
            Create and review platform-only admin accounts. New super admins receive their temporary credentials by email.
          </p>
        </div>

        {authMessage ? <AuthNotice message={authMessage} /> : null}
        {formError ? <AuthNotice title="Could not create super admin" message={formError} /> : null}
        {success ? <AuthNotice title="Invite sent" message={success} /> : null}

        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <form onSubmit={handleCreate} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold tracking-tight">Create super admin</h2>
            <div className="mt-5 grid gap-4">
              <label className="text-sm text-slate-700">
                <span className="mb-1.5 block font-medium">Display name</span>
                <input
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-teal-700"
                />
              </label>
              <label className="text-sm text-slate-700">
                <span className="mb-1.5 block font-medium">Email</span>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-teal-700"
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-6 inline-flex items-center rounded-full bg-teal-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? 'Sending invite...' : 'Create super admin'}
            </button>
          </form>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold tracking-tight">Existing super admins</h2>
                <p className="mt-1 text-sm text-slate-500">Platform-only operators with MFA-backed sign-in.</p>
              </div>
              <label className="text-sm text-slate-700">
                <span className="mb-1.5 block font-medium">Search</span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Email or display name"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-teal-700 sm:w-64"
                />
              </label>
            </div>

            <div className="mt-5 space-y-3">
              {adminsQuery.isLoading ? (
                <p className="text-sm text-slate-500">Loading super admins...</p>
              ) : admins.length === 0 ? (
                <p className="text-sm text-slate-500">No super admins matched this search.</p>
              ) : (
                admins.map((admin) => (
                  <article key={admin.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-900">{admin.name}</p>
                        <p className="text-sm text-slate-600">{admin.email}</p>
                      </div>
                      <div className="text-right text-xs text-slate-500">
                        <p>{admin.mfaEnabled ? 'MFA enabled' : 'MFA pending setup'}</p>
                        <p>{admin.isActive ? 'Active' : 'Inactive'}</p>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
