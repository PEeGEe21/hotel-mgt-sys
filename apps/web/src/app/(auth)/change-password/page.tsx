'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, Eye, EyeOff, Check, Loader2, ShieldAlert } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import api from '@/lib/api';
import openToast from '@/components/ToastComponent';

export default function ChangePasswordPage() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();

  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.currentPassword) return setError('Current password is required.');
    if (!form.newPassword) return setError('New password is required.');
    if (form.newPassword.length < 8) return setError('Password must be at least 8 characters.');
    if (form.newPassword !== form.confirmPassword) return setError('Passwords do not match.');
    if (form.newPassword === form.currentPassword)
      return setError('New password must be different from current password.');

    setError('');
    setLoading(true);

    try {
      await api.patch('/auth/change-password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });

      // Update the local user state so mustChangePassword is cleared
      if (user) {
        setUser({ ...user, mustChangePassword: false });
      }

      openToast('success', 'Password changed successfully');
      router.push('/dashboard');
    } catch (e: any) {
      setError(
        e?.response?.data?.message ?? 'Could not change password. Check your current password.',
      );
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    'w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-3 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-blue-500 transition-colors pr-10';

  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center p-4">
      {/* Subtle background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-amber-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-[#161b27] border border-[#1e2536] rounded-2xl p-8 shadow-2xl space-y-6">
          {/* Icon + heading */}
          <div className="text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto">
              <ShieldAlert size={24} className="text-amber-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Change Your Password</h1>
              <p className="text-sm text-slate-500 mt-1">
                Your account requires a password change before you can continue.
              </p>
            </div>
          </div>

          {user && (
            <div className="bg-[#0f1117] border border-[#1e2536] rounded-lg px-4 py-3 text-center">
              <p className="text-xs text-slate-500">Logged in as</p>
              <p className="text-sm font-medium text-slate-200 mt-0.5">{user.name}</p>
              <p className="text-xs text-slate-600">{user.email}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Current password */}
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  value={form.currentPassword}
                  onChange={(e) => setForm((f) => ({ ...f, currentPassword: e.target.value }))}
                  placeholder="Your current password"
                  className={inputCls}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* New password */}
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  value={form.newPassword}
                  onChange={(e) => setForm((f) => ({ ...f, newPassword: e.target.value }))}
                  placeholder="Min. 8 characters"
                  className={inputCls}
                />
                <button
                  type="button"
                  onClick={() => setShowNew((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {/* Strength hint */}
              {form.newPassword.length > 0 && (
                <div className="flex gap-1 mt-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        form.newPassword.length >= i * 3
                          ? i <= 1
                            ? 'bg-red-500'
                            : i <= 2
                              ? 'bg-amber-500'
                              : i <= 3
                                ? 'bg-blue-500'
                                : 'bg-emerald-500'
                          : 'bg-[#1e2536]'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Confirm */}
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
                Confirm New Password
              </label>
              <input
                type="password"
                value={form.confirmPassword}
                onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                placeholder="Repeat new password"
                className={`${inputCls} ${
                  form.confirmPassword && form.confirmPassword !== form.newPassword
                    ? 'border-red-500/50 focus:border-red-500'
                    : form.confirmPassword && form.confirmPassword === form.newPassword
                      ? 'border-emerald-500/50 focus:border-emerald-500'
                      : ''
                }`}
              />
            </div>

            {error && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <div className='flex items-center gap-2'>
              <button
                type="button"
                onClick={()=>router.push('/dashboard')}
                className="w-4/12 items-center justify-center gap-2 bg-white hover:bg-white disabled:opacity-50 text-blue-500 rounded-lg py-3 text-sm font-semibold transition-colors"
              >
                Skip
              </button>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg py-3 text-sm font-semibold transition-colors"
              >
                {loading ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                Change Password & Continue
              </button>
            </div>
          </form>
        </div>

        <p className="text-center text-xs text-slate-600 mt-4">
          Need help? Contact your hotel administrator.
        </p>
      </div>
    </div>
  );
}
