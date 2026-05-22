'use client';

import { useEffect, useMemo, useState } from 'react';
import { adminGetTenantImpersonationStatusAction, adminStopTenantImpersonationAction } from '@/actions/admin-auth.actions';

function formatRemaining(expiresAt: string | null) {
  if (!expiresAt) return 'Expires soon';

  const remainingMs = new Date(expiresAt).getTime() - Date.now();
  if (remainingMs <= 0) return 'Expired';

  const totalSeconds = Math.floor(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const hours = Math.floor(minutes / 60);
  const displayMinutes = minutes % 60;

  if (hours > 0) {
    return `${hours}h ${displayMinutes}m left`;
  }

  return `${displayMinutes}m ${seconds}s left`;
}

export function ImpersonationBanner() {
  const [status, setStatus] = useState<null | {
    active: boolean;
    user?: {
      id: string;
      name: string;
      email: string;
      role: string;
      hotelName: string | null;
      impersonationExpiresAt: string | null;
    };
  }>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isStopping, setIsStopping] = useState(false);

  useEffect(() => {
    adminGetTenantImpersonationStatusAction().then((result) => {
      if (!result.success) {
        setMessage(result.message);
        return;
      }

      setStatus(result.active ? { active: true, user: result.user } : { active: false });
    });
  }, []);

  useEffect(() => {
    if (!status?.active || !status.user?.impersonationExpiresAt) return;

    const timer = window.setInterval(() => {
      setStatus((current) => (current ? { ...current } : current));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [status?.active, status?.user?.impersonationExpiresAt]);

  const remaining = useMemo(
    () => (status?.active ? formatRemaining(status.user?.impersonationExpiresAt ?? null) : null),
    [status],
  );

  if (!status?.active) {
    return message ? (
      <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        {message}
      </div>
    ) : null;
  }

  const handleStop = async () => {
    setIsStopping(true);
    setMessage(null);
    const result = await adminStopTenantImpersonationAction();
    if (!result.success) {
      setMessage(result.message);
    } else {
      setMessage(result.message);
      setStatus({ active: false });
    }
    setIsStopping(false);
  };

  return (
    <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="font-semibold uppercase tracking-[0.18em] text-amber-900">Active impersonation</p>
          <p className="mt-1">
            Browsing as <span className="font-semibold">{status.user?.name}</span> ({status.user?.email})
            {status.user?.hotelName ? ` at ${status.user.hotelName}` : ''}. {remaining}
          </p>
          {message ? <p className="mt-1 text-xs text-amber-900/80">{message}</p> : null}
        </div>
        <div className="flex gap-3">
          <a
            href={`${(process.env.NEXT_PUBLIC_WEB_APP_URL || 'http://localhost:3000').replace(/\/$/, '')}/`}
            className="inline-flex items-center rounded-full border border-amber-500 bg-white px-4 py-2 font-semibold text-amber-950"
          >
            Open tenant app
          </a>
          <button
            type="button"
            onClick={handleStop}
            disabled={isStopping}
            className="inline-flex items-center rounded-full bg-amber-900 px-4 py-2 font-semibold text-white disabled:opacity-50"
          >
            {isStopping ? 'Stopping...' : 'Stop impersonation'}
          </button>
        </div>
      </div>
    </div>
  );
}
