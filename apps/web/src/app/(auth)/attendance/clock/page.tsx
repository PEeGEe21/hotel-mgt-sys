'use client';

import { useEffect, useMemo, useState } from 'react';
import { Hotel, MapPin, ShieldCheck, Timer, UserCheck } from 'lucide-react';
import { useHotelBranding } from '@/hooks/hotel/useHotelBranding';

type KioskStaff = {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  department: string;
  position: string;
};

type KioskStatus = {
  staff: KioskStaff;
  isClockedIn: boolean;
  totalMinutes: number;
  lastClockInAt: string | null;
  lastClockOutAt: string | null;
};

type KioskResponse = KioskStatus & {
  record?: { id: string; type: 'CLOCK_IN' | 'CLOCK_OUT'; timestamp: string };
};

const API_BASE = process.env.API_URL || 'http://localhost:4000/api/v1';

async function postJson<T>(path: string, body: unknown): Promise<T> {
  console.log(API_BASE, 'API_BASE');
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.message ?? 'Something went wrong';
    throw new Error(msg);
  }
  return data as T;
}

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

async function getLocation(): Promise<{ latitude: number; longitude: number } | null> {
  if (!navigator.geolocation) return null;
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  });
}

export default function AttendanceClockPage() {
  const hotel = useHotelBranding();
  const kioskEnabled = hotel?.attendanceKioskEnabled ?? true;
  const [employeeCode, setEmployeeCode] = useState('');
  const [pin, setPin] = useState('');
  const [status, setStatus] = useState<KioskStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [justClockedOut, setJustClockedOut] = useState(false);

  useEffect(() => {
    if (!justClockedOut) return;
    const t = setTimeout(() => setJustClockedOut(false), 12000);
    return () => clearTimeout(t);
  }, [justClockedOut]);

  const staffName = useMemo(() => {
    if (!status?.staff) return 'Staff Member';
    return `${status.staff.firstName} ${status.staff.lastName}`;
  }, [status]);

  const handleCheckStatus = async () => {
    if (!employeeCode.trim()) {
      setError('Enter your employee code.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const data = await postJson<KioskStatus>('/attendance/kiosk/status', {
        employeeCode: employeeCode.trim(),
      });
      setStatus(data);
      setJustClockedOut(false);
    } catch (err: any) {
      setError(err.message ?? 'Unable to fetch status.');
    } finally {
      setLoading(false);
    }
  };

  const handleClockAction = async () => {
    if (!employeeCode.trim()) {
      setError('Enter your employee code.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const currentStatus =
        status ??
        (await postJson<KioskStatus>('/attendance/kiosk/status', {
          employeeCode: employeeCode.trim(),
        }));
      const location = await getLocation();

      const payload = {
        employeeCode: employeeCode.trim(),
        pin: pin.trim() || undefined,
        latitude: location?.latitude,
        longitude: location?.longitude,
      };

      const path = currentStatus.isClockedIn
        ? '/attendance/kiosk/clock-out'
        : '/attendance/kiosk/clock-in';

      const data = await postJson<KioskResponse>(path, payload);
      setStatus(data);
      setJustClockedOut(currentStatus.isClockedIn);
      if (!currentStatus.isClockedIn) setPin('');
    } catch (err: any) {
      setError(err.message ?? 'Unable to clock in/out.');
    } finally {
      setLoading(false);
    }
  };

  if (!kioskEnabled) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#161b27] border border-[#1e2536] rounded-2xl p-6 text-center">
          <h1 className="text-xl font-bold text-white">Kiosk Clock Disabled</h1>
          <p className="text-slate-500 text-sm mt-2">
            This location has disabled kiosk clocking. Please use the personal clock page or contact
            HR.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[680px] h-[680px] bg-blue-600/10 rounded-full blur-[130px]" />
        <div className="absolute bottom-1/4 right-1/3 w-[520px] h-[520px] bg-emerald-500/10 rounded-full blur-[140px]" />
      </div>

      <div className="w-full max-w-md relative">
        <div className="flex flex-col items-center mb-8">
          {hotel?.logo ? (
            <img
              src={hotel.logo}
              alt={hotel.name}
              className="w-14 h-14 rounded-2xl object-cover mb-4 shadow-xl"
            />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center mb-4 shadow-xl shadow-blue-500/25">
              <Hotel size={26} className="text-white" />
            </div>
          )}
          <h1 className="text-2xl font-bold text-white">{hotel?.name ?? 'HotelOS'}</h1>
          {hotel?.city && (
            <p className="text-slate-500 text-xs mt-1 flex items-center gap-1">
              <MapPin size={11} />
              {hotel.city}, {hotel.country}
            </p>
          )}
          <p className="text-slate-500 text-sm mt-2">Staff attendance clock</p>
        </div>

        <div className="bg-[#161b27] border border-[#1e2536] rounded-2xl p-6 shadow-xl space-y-4">
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5 block">
                Employee Code
              </label>
              <input
                value={employeeCode}
                onChange={(e) => setEmployeeCode(e.target.value)}
                placeholder="EMP001"
                className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5 block">
                PIN (if required)
              </label>
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••"
                className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-blue-500 transition-colors"
              />
              {hotel?.attendancePinRequired && (
                <p className="text-xs text-slate-500 mt-1">PIN required for clock in/out.</p>
              )}
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleCheckStatus}
              disabled={loading}
              className="bg-white/5 hover:bg-white/10 text-slate-300 border border-[#1e2536] rounded-lg py-2.5 text-sm font-medium transition-colors"
            >
              Check Status
            </button>
            <button
              onClick={handleClockAction}
              disabled={loading}
              className={`rounded-lg py-2.5 text-sm font-semibold transition-colors ${
                status?.isClockedIn
                  ? 'bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              {status?.isClockedIn ? 'Clock Out' : 'Clock In'}
            </button>
          </div>
        </div>

        {status && (
          <div className="mt-4 bg-[#111722] border border-[#1e2536] rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Status for</p>
                <p className="text-base font-semibold text-white">{staffName}</p>
                <p className="text-xs text-slate-500">
                  {status.staff.position} · {status.staff.department}
                </p>
              </div>
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  status.isClockedIn ? 'bg-emerald-500/15' : 'bg-slate-500/10'
                }`}
              >
                <UserCheck
                  size={22}
                  className={status.isClockedIn ? 'text-emerald-400' : 'text-slate-500'}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5">
                <p className="text-xs text-slate-500">Last Clock In</p>
                <p className="text-sm text-slate-200 mt-1">
                  {formatTime(status.lastClockInAt)} · {formatDate(status.lastClockInAt)}
                </p>
              </div>
              <div className="bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5">
                <p className="text-xs text-slate-500">Last Clock Out</p>
                <p className="text-sm text-slate-200 mt-1">
                  {formatTime(status.lastClockOutAt)} · {formatDate(status.lastClockOutAt)}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5">
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                <Timer size={14} /> Total today
              </div>
              <p className="text-sm font-semibold text-white">
                {Math.floor(status.totalMinutes / 60)}h {status.totalMinutes % 60}m
              </p>
            </div>

            {justClockedOut && (
              <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2.5">
                <div className="flex items-center gap-2 text-emerald-300 text-sm">
                  <ShieldCheck size={14} /> Clock-out recorded
                </div>
                <p className="text-xs text-emerald-300">Have a good rest!</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
