'use client';

import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Eye, EyeOff, Lock, Mail, Shield } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAdminAuthStore } from '@/store/admin-auth.store';

export function AdminLoginForm() {
  const { login, verifyMfa, isLoading, error, clearError } = useAdminAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const [mfaChallenge, setMfaChallenge] = useState<{
    challengeToken: string;
    message: string;
    mfaSetupRequired: boolean;
    secret?: string;
    otpAuthUrl?: string;
  } | null>(null);

  useEffect(() => {
    return () => clearError();
  }, [clearError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await login(email, password);
    if (!result.success) {
      if (result.mfaChallenge) {
        setMfaChallenge(result.mfaChallenge);
      }
      return;
    }
    const from = searchParams?.get('from') ?? '/';
    router.push(from);
  };

  const copySetupKey = async () => {
    if (!mfaChallenge?.secret) return;
    try {
      await navigator.clipboard.writeText(mfaChallenge.secret);
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    }
  };

  const handleVerifyMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaChallenge) return;
    const result = await verifyMfa(mfaChallenge.challengeToken, code);
    if (!result.success) return;
    const from = searchParams?.get('from') ?? '/';
    router.push(from);
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-10">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-800">Platform access</p>
          <h1 className="text-3xl font-semibold tracking-tight">Super Admin Login</h1>
          <p className="text-sm leading-6 text-slate-600">
            Sign in with a super-admin account to access tenant operations, support tools, and platform visibility.
          </p>
        </div>

        {mfaChallenge ? (
          <form onSubmit={handleVerifyMfa} className="mt-8 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">
                {mfaChallenge.mfaSetupRequired ? 'Set up authenticator app' : 'Enter MFA code'}
              </p>
              <p className="mt-2 leading-6">{mfaChallenge.message}</p>
              {mfaChallenge.otpAuthUrl ? (
                <div className="mt-4 flex justify-center rounded-2xl border border-slate-200 bg-white p-4">
                  <QRCodeSVG value={mfaChallenge.otpAuthUrl} size={180} includeMargin />
                </div>
              ) : null}
              {mfaChallenge.secret ? (
                <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs uppercase tracking-wider text-slate-500">Manual setup key</p>
                    <button
                      type="button"
                      onClick={copySetupKey}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-teal-900"
                    >
                      <Copy size={12} />
                      Copy key
                    </button>
                  </div>
                  <p className="mt-2 break-all font-mono text-sm text-slate-900">{mfaChallenge.secret}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    {copyState === 'copied'
                      ? 'Setup key copied.'
                      : copyState === 'failed'
                        ? 'Copy failed. Select and copy the key manually.'
                        : 'Copy this key into your authenticator app if you prefer manual entry.'}
                  </p>
                </div>
              ) : null}
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500">
                6-digit code
              </label>
              <input
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-teal-700"
              />
            </div>

            {error ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            ) : null}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isLoading}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-teal-900 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Shield size={15} />
                {isLoading ? 'Verifying...' : 'Verify and sign in'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMfaChallenge(null);
                  setCode('');
                  setCopyState('idle');
                  clearError();
                }}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700"
              >
                Back
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500">Email</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="superadmin@hotelos.com"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-sm text-slate-800 outline-none focus:border-teal-700"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-10 text-sm text-slate-800 outline-none focus:border-teal-700"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            ) : null}

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-900 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Shield size={15} />
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
