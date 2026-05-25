'use client';

import { useEffect, useState } from 'react';
import { adminChangePasswordAction, updateAdminProfileAction } from '@/actions/admin-auth.actions';
import { AuthNotice } from '@/components/platform/AuthNotice';
import openToast from '@/components/ToastComponent';
import { useAdminAuthStore } from '@/store/admin-auth.store';

export function ProfilePageClient() {
  const user = useAdminAuthStore((state) => state.user);
  const setUser = useAdminAuthStore((state) => state.setUser);
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    setName(user?.name ?? '');
    setEmail(user?.email ?? '');
  }, [user?.name, user?.email]);

  const handleProfileSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setProfileMessage(null);
    setIsSavingProfile(true);

    const result = await updateAdminProfileAction({ name, email });
    if (!result.success) {
      setError(result.message);
      openToast('error', result.message);
      setIsSavingProfile(false);
      return;
    }

    setUser(result.user);
    setProfileMessage('Your super admin profile has been updated.');
    openToast('success', 'Your super admin profile has been updated.');
    setIsSavingProfile(false);
  };

  const handlePasswordChange = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setPasswordMessage(null);
    setIsChangingPassword(true);

    const result = await adminChangePasswordAction({ currentPassword, newPassword });
    if (!result.success) {
      setError(result.message);
      openToast('error', result.message);
      setIsChangingPassword(false);
      return;
    }

    setPasswordMessage(result.message);
    openToast('success', result.message);
    setCurrentPassword('');
    setNewPassword('');
    setIsChangingPassword(false);
  };

  return (
    <main className="min-h-screen px-6 py-10 md:px-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-800">Account settings</p>
          <h1 className="text-3xl font-semibold tracking-tight">My super admin profile</h1>
          <p className="max-w-3xl text-sm leading-6 text-slate-600">
            Update how your platform identity appears in the console and rotate your password when needed.
          </p>
        </div>

        {error ? <AuthNotice title="Update failed" message={error} /> : null}
        {profileMessage ? <AuthNotice title="Profile updated" message={profileMessage} /> : null}
        {passwordMessage ? <AuthNotice title="Password updated" message={passwordMessage} /> : null}

        <section className="grid gap-6 lg:grid-cols-2">
          <form onSubmit={handleProfileSave} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold tracking-tight">Profile</h2>
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
              disabled={isSavingProfile}
              className="mt-6 inline-flex items-center rounded-full bg-teal-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSavingProfile ? 'Saving...' : 'Save profile'}
            </button>
          </form>

          <form onSubmit={handlePasswordChange} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold tracking-tight">Password</h2>
            <div className="mt-5 grid gap-4">
              <label className="text-sm text-slate-700">
                <span className="mb-1.5 block font-medium">Current password</span>
                <input
                  required
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-teal-700"
                />
              </label>
              <label className="text-sm text-slate-700">
                <span className="mb-1.5 block font-medium">New password</span>
                <input
                  required
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-teal-700"
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={isChangingPassword}
              className="mt-6 inline-flex items-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isChangingPassword ? 'Updating...' : 'Change password'}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
