'use client';

import { useEffect, useMemo, useState } from 'react';
import { Clock, ShieldCheck, Timer, UserCheck, RefreshCw } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { usePermissions } from '@/hooks/usePermissions';
import { useAppStore } from '@/store/app.store';

const API_METHOD = 'SELF';

type AttendanceRecord = {
  id: string;
  type: 'CLOCK_IN' | 'CLOCK_OUT';
  timestamp: string;
};

type TodayStatus = {
  isClockedIn: boolean;
  records: AttendanceRecord[];
  totalMinutes: number;
  lastClockInAt: string | null;
  lastClockOutAt: string | null;
};

function formatTime(value?: string | null) {
  if (!value) return '—';
  const dt = new Date(value);
  return dt.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  const dt = new Date(value);
  return dt.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function PersonalClockPage() {
  const user = useAuthStore((s) => s.user);
  const { can } = usePermissions();
  const hotel = useAppStore((s) => s.hotel);
  const [status, setStatus] = useState<TodayStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const personalEnabled = hotel?.attendancePersonalEnabled ?? true;

  const totalLabel = useMemo(() => {
    const minutes = status?.totalMinutes ?? 0;
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  }, [status?.totalMinutes]);

  const loadStatus = async () => {
    setError('');
    setLoading(true);
    try {
      const { data } = await api.get<TodayStatus>('/attendance/today');
      setStatus(data);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Unable to load your attendance status.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleClockAction = async () => {
    if (!status) return;
    setError('');
    setWorking(true);
    try {
      const path = status.isClockedIn ? '/attendance/clock-out' : '/attendance/clock-in';
      await api.post(path, {
        method: API_METHOD,
        note: note.trim() || undefined,
      });
      if (!status.isClockedIn) setNote('');
      await loadStatus();
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Unable to clock in/out.';
      setError(msg);
    } finally {
      setWorking(false);
    }
  };

  if (!can('clock:self')) {
    return (
      <div className="max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold text-white tracking-tight">Clock In / Out</h1>
        <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5 text-slate-300">
          You do not have permission to clock in/out. Please contact an admin.
        </div>
      </div>
    );
  }

  if (!personalEnabled) {
    return (
      <div className="max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold text-white tracking-tight">Clock In / Out</h1>
        <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5 text-slate-300">
          Personal device clocking is currently disabled. Please use the kiosk or contact HR.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Clock In / Out</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {user?.name ?? 'Staff'} · {user?.department ?? 'Hotel Staff'}
          </p>
        </div>
        <button
          onClick={loadStatus}
          disabled={loading}
          className="flex items-center gap-2 bg-[#161b27] border border-[#1e2536] hover:border-slate-500 text-slate-300 px-3 py-2 rounded-lg text-sm font-medium transition-all"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5 space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Current status</p>
              <p className="text-lg font-semibold text-white">
                {loading ? 'Checking…' : status?.isClockedIn ? 'Clocked in' : 'Clocked out'}
              </p>
            </div>
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                status?.isClockedIn ? 'bg-emerald-500/15' : 'bg-slate-500/10'
              }`}
            >
              <UserCheck
                size={22}
                className={status?.isClockedIn ? 'text-emerald-400' : 'text-slate-500'}
              />
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5">
              <p className="text-xs text-slate-500">Last Clock In</p>
              <p className="text-sm text-slate-200 mt-1">
                {formatTime(status?.lastClockInAt)} · {formatDate(status?.lastClockInAt)}
              </p>
            </div>
            <div className="bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5">
              <p className="text-xs text-slate-500">Last Clock Out</p>
              <p className="text-sm text-slate-200 mt-1">
                {formatTime(status?.lastClockOutAt)} · {formatDate(status?.lastClockOutAt)}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5">
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <Timer size={14} /> Total today
            </div>
            <p className="text-sm font-semibold text-white">{totalLabel}</p>
          </div>

          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
              Note (optional)
            </label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Starting early shift"
              className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <button
            onClick={handleClockAction}
            disabled={loading || working || !status}
            className={`w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-colors ${
              status?.isClockedIn
                ? 'bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            } ${loading || working ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            <Clock size={14} /> {status?.isClockedIn ? 'Clock Out' : 'Clock In'}
          </button>
        </div>

        <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-slate-300">
            <ShieldCheck size={14} />
            <p className="text-sm font-semibold">Clocking tips</p>
          </div>
          <ul className="text-sm text-slate-500 space-y-2">
            <li>Only one active session is allowed per day.</li>
            <li>Use the kiosk if your account is disabled.</li>
            <li>Contact HR if your status looks incorrect.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
