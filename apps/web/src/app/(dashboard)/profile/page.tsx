'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  User,
  Lock,
  Bell,
  Monitor,
  Save,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Shield,
  LogOut,
  Smartphone,
  Globe,
  Clock,
  Pencil,
  Camera,
  Check,
  X,
  Copy,
} from 'lucide-react';
import { useMe, useResetAttendancePin, useUpdateMe } from '@/hooks/useMe';
import { useAuthStore } from '@/store/auth.store';
import openToast from '@/components/ToastComponent';

// ─── Types ─────────────────────────────────────────────────────────────────────
type Tab = 'profile' | 'password' | 'notifications' | 'sessions';

const activeSessions = [
  {
    id: 's1',
    device: 'Chrome on Windows 11',
    location: 'Lagos, Nigeria',
    ip: '102.89.45.12',
    lastActive: '2026-03-12 08:02',
    current: true,
  },
  {
    id: 's2',
    device: 'Safari on iPhone 15',
    location: 'Lagos, Nigeria',
    ip: '102.89.45.13',
    lastActive: '2026-03-11 22:14',
    current: false,
  },
  {
    id: 's3',
    device: 'Chrome on MacBook Pro',
    location: 'Abuja, Nigeria',
    ip: '197.210.54.88',
    lastActive: '2026-03-10 14:30',
    current: false,
  },
];

const roleColors: Record<string, string> = {
  SUPER_ADMIN: 'text-red-400 bg-red-500/15 border-red-500/30',
  ADMIN: 'text-violet-400 bg-violet-500/15 border-violet-500/30',
  MANAGER: 'text-blue-400 bg-blue-500/15 border-blue-500/30',
  RECEPTIONIST: 'text-sky-400 bg-sky-500/15 border-sky-500/30',
  HOUSEKEEPING: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
  CASHIER: 'text-amber-400 bg-amber-500/15 border-amber-500/30',
  BARTENDER: 'text-orange-400 bg-orange-500/15 border-orange-500/30',
  STAFF: 'text-slate-400 bg-slate-500/15 border-slate-500/30',
};

type LiveUser = {
  id: string;
  name: string;
  username: string;
  email: string;
  phone: string;
  role: string;
  department: string;
  position: string;
  employeeCode: string;
  attendancePinSet: boolean;
  joinDate: string;
  lastLogin: string;
  avatar: string | null;
};

const emptyUser: LiveUser = {
  id: '',
  name: '—',
  username: '—',
  email: '—',
  phone: '',
  role: 'STAFF',
  department: '—',
  position: '—',
  employeeCode: '—',
  attendancePinSet: false,
  joinDate: '—',
  lastLogin: '—',
  avatar: null,
};

const formatDate = (value?: string | Date | null) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' });
};

const formatDateTime = (value?: string | Date | null) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// ─── Shared input ──────────────────────────────────────────────────────────────
function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-slate-600 mt-1">{hint}</p>}
    </div>
  );
}

const inputCls =
  'w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-blue-500 transition-colors';
const disabledCls =
  'w-full bg-[#0a0d14] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-500 cursor-not-allowed';

// ─── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ msg, type }: { msg: string; type: 'success' | 'error' }) {
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium animate-fade-in ${type === 'success' ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300' : 'bg-red-500/20 border-red-500/30 text-red-300'}`}
    >
      {type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
      {msg}
    </div>
  );
}

// ─── Tab button ────────────────────────────────────────────────────────────────
function TabBtn({
  id,
  label,
  icon: Icon,
  active,
  onClick,
}: {
  id: Tab;
  label: string;
  icon: any;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all border ${active ? 'bg-blue-600/20 text-blue-400 border-blue-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border-transparent'}`}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}

// ─── Profile Tab ──────────────────────────────────────────────────────────────
function ProfileTab({ user }: { user: LiveUser }) {
  const [form, setForm] = useState({
    name: user.name,
    email: user.email,
    phone: user.phone,
  });
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user.avatar ?? null);
  const [pinReveal, setPinReveal] = useState<string | null>(null);
  const [pinCopied, setPinCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const updateMe = useUpdateMe();
  const resetPin = useResetAttendancePin();

  useEffect(() => {
    setForm({
      name: user.name,
      email: user.email,
      phone: user.phone,
    });
    setAvatarPreview(user.avatar ?? null);
  }, [user.name, user.email, user.phone, user.avatar]);

  const initials = form.name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('');

  const handleSave = async () => {
    try {
      await updateMe.mutateAsync({
        name: form.name,
        email: form.email,
        phone: form.phone,
        avatar: avatarPreview,
      });
      setToast({ msg: 'Profile updated successfully', type: 'success' });
      openToast('success', 'Profile updated successfully');
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Update failed';
      setToast({ msg, type: 'error' });
      openToast('error', msg);
    } finally {
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setToast({ msg: 'Please select an image file', type: 'error' });
      openToast('error', 'Please select an image file');
      setTimeout(() => setToast(null), 3000);
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setToast({ msg: 'Avatar must be under 2MB', type: 'error' });
      openToast('error', 'Avatar must be under 2MB');
      setTimeout(() => setToast(null), 3000);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAvatarPreview(String(reader.result));
    };
    reader.readAsDataURL(file);
  };

  const handleResetPin = async () => {
    try {
      const res = await resetPin.mutateAsync();
      setPinReveal(res?.pin ?? null);
      setPinCopied(false);
      setToast({ msg: 'New PIN generated', type: 'success' });
      openToast('success', 'New PIN generated');
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Failed to reset PIN';
      setToast({ msg, type: 'error' });
      openToast('error', msg);
    } finally {
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handleCopyPin = async () => {
    if (!pinReveal) return;
    try {
      await navigator.clipboard.writeText(pinReveal);
      setPinCopied(true);
      setTimeout(() => setPinCopied(false), 2000);
    } catch {
      setToast({ msg: 'Copy failed', type: 'error' });
      openToast('error', 'Failed to copy PIN');
      setTimeout(() => setToast(null), 3000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Avatar */}
      <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-6">
        <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-4">
          Profile Photo
        </p>
        <div className="flex items-center gap-5">
          <div className="relative shrink-0">
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt="Profile avatar"
                className="w-20 h-20 rounded-full border-2 border-white/10 object-cover"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500/40 to-violet-500/40 border-2 border-white/10 flex items-center justify-center text-2xl font-bold text-white">
                {initials}
              </div>
            )}
            <button
              onClick={handleAvatarClick}
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-blue-600 border-2 border-[#161b27] flex items-center justify-center hover:bg-blue-500 transition-colors"
            >
              <Camera size={12} className="text-white" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{form.name}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {user.position} · {user.department}
            </p>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-medium border mt-2 inline-block ${roleColors[user.role] ?? roleColors.STAFF}`}
            >
              {user.role}
            </span>
          </div>
        </div>
      </div>

      {/* Personal info */}
      <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-6">
        <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-4">
          Personal Information
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Full Name">
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className={inputCls}
            />
          </Field>
          <Field label="Username" hint="Username cannot be changed">
            <div className={disabledCls}>{user.username}</div>
          </Field>
          <Field label="Email Address">
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className={inputCls}
            />
          </Field>
          <Field label="Phone Number">
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className={inputCls}
            />
          </Field>
        </div>
      </div>

      {/* Read-only employment info */}
      <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-6">
        <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-4">
          Employment Details <span className="text-slate-700 normal-case">(managed by Admin)</span>
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Role', value: user.role },
            { label: 'Department', value: user.department },
            { label: 'Position', value: user.position },
            { label: 'Joined', value: user.joinDate },
            { label: 'Employee Code', value: user.employeeCode },
            { label: 'Attendance PIN', value: user.attendancePinSet ? 'PIN set' : 'Not set' },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs text-slate-600 mb-1">{label}</p>
              <div className={disabledCls}>{value}</div>
            </div>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            onClick={handleResetPin}
            disabled={resetPin.isPending}
            className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg border border-[#1e2536] bg-[#0f1117] hover:bg-white/5 text-slate-300 transition-colors disabled:opacity-70"
          >
            {resetPin.isPending ? (
              <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Pencil size={12} />
            )}
            Reset Attendance PIN
          </button>
          <p className="text-xs text-slate-600">
            This will generate a new PIN. You can only view it once.
          </p>
        </div>

        {pinReveal && (
          <div className="mt-4 bg-[#0f1117] border border-emerald-500/20 rounded-lg p-3 flex items-center gap-3">
            <div className="text-xs text-emerald-300 font-semibold">New PIN</div>
            <div className="text-lg font-mono text-emerald-200 tracking-widest">{pinReveal}</div>
            <button
              onClick={handleCopyPin}
              className="ml-auto flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md border border-emerald-500/30 text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors"
            >
              <Copy size={12} /> {pinCopied ? 'Copied' : 'Copy'}
            </button>
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={updateMe.isPending}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-70 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
        >
          {updateMe.isPending ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Save size={14} />
          )}
          Save Changes
        </button>
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} />}
    </div>
  );
}

// ─── Password Tab ─────────────────────────────────────────────────────────────
function PasswordTab() {
  const [form, setForm] = useState({ current: '', newPw: '', confirm: '' });
  const [show, setShow] = useState({ current: false, newPw: false, confirm: false });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const strength = (() => {
    const p = form.newPw;
    if (!p) return 0;
    let s = 0;
    if (p.length >= 8) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  })();

  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColor = ['', 'bg-red-500', 'bg-amber-500', 'bg-blue-500', 'bg-emerald-500'];
  const strengthText = ['', 'text-red-400', 'text-amber-400', 'text-blue-400', 'text-emerald-400'];

  const handleSave = async () => {
    if (!form.current) return setToast({ msg: 'Enter your current password', type: 'error' });
    if (form.newPw.length < 8) {
      openToast('error', 'Password must be at least 8 characters');
      return setToast({ msg: 'Password must be at least 8 characters', type: 'error' });
    }
    if (form.newPw !== form.confirm) {
      openToast('error', 'Passwords do not match');
      return setToast({ msg: 'Passwords do not match', type: 'error' });
    }
    setSaving(true);
    await new Promise((r) => setTimeout(r, 700));
    setSaving(false);
    setForm({ current: '', newPw: '', confirm: '' });
    setToast({ msg: 'Password changed successfully', type: 'success' });
    openToast('success', 'Password changed successfully');
    setTimeout(() => setToast(null), 3000);
  };

  const PwField = ({
    label,
    key2,
    placeholder,
  }: {
    label: string;
    key2: 'current' | 'newPw' | 'confirm';
    placeholder: string;
  }) => (
    <Field label={label}>
      <div className="relative">
        <input
          type={show[key2] ? 'text' : 'password'}
          value={form[key2]}
          onChange={(e) => setForm((f) => ({ ...f, [key2]: e.target.value }))}
          placeholder={placeholder}
          className={`${inputCls} pr-10`}
        />
        <button
          type="button"
          onClick={() => setShow((s) => ({ ...s, [key2]: !s[key2] }))}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
        >
          {show[key2] ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
    </Field>
  );

  return (
    <div className="space-y-5">
      <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-6 space-y-4 max-w-lg">
        <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-2">
          Change Password
        </p>

        <PwField label="Current Password" key2="current" placeholder="Enter current password" />
        <PwField label="New Password" key2="newPw" placeholder="Min 8 characters" />

        {/* Strength meter */}
        {form.newPw && (
          <div className="space-y-1.5">
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={`flex-1 h-1 rounded-full transition-all ${i <= strength ? strengthColor[strength] : 'bg-[#1e2536]'}`}
                />
              ))}
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex gap-3 text-slate-600">
                {[
                  { label: '8+ chars', ok: form.newPw.length >= 8 },
                  { label: 'Uppercase', ok: /[A-Z]/.test(form.newPw) },
                  { label: 'Number', ok: /[0-9]/.test(form.newPw) },
                  { label: 'Symbol', ok: /[^A-Za-z0-9]/.test(form.newPw) },
                ].map(({ label, ok }) => (
                  <span
                    key={label}
                    className={`flex items-center gap-0.5 ${ok ? 'text-emerald-400' : 'text-slate-600'}`}
                  >
                    {ok ? <Check size={10} /> : <X size={10} />}
                    {label}
                  </span>
                ))}
              </div>
              <span className={`font-semibold ${strengthText[strength]}`}>
                {strengthLabel[strength]}
              </span>
            </div>
          </div>
        )}

        <PwField label="Confirm New Password" key2="confirm" placeholder="Re-enter new password" />

        {form.confirm && form.newPw && (
          <p
            className={`text-xs flex items-center gap-1 ${form.newPw === form.confirm ? 'text-emerald-400' : 'text-red-400'}`}
          >
            {form.newPw === form.confirm ? (
              <>
                <CheckCircle2 size={12} /> Passwords match
              </>
            ) : (
              <>
                <AlertCircle size={12} /> Passwords do not match
              </>
            )}
          </p>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-70 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors mt-2"
        >
          {saving ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Lock size={14} />
          )}
          Update Password
        </button>
      </div>

      {/* Password tips */}
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 max-w-lg flex items-start gap-3">
        <Shield size={16} className="text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-300 mb-1">Password tips</p>
          <p className="text-xs text-amber-400/80">
            Use a mix of letters, numbers and symbols. Don't reuse passwords from other accounts.
            You'll be logged out of all other sessions after changing your password.
          </p>
        </div>
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} />}
    </div>
  );
}

// ─── Notifications Tab ────────────────────────────────────────────────────────
function NotificationsTab() {
  const [prefs, setPrefs] = useState({
    newReservation: { email: true, inApp: true, push: false },
    checkIn: { email: false, inApp: true, push: true },
    checkOut: { email: false, inApp: true, push: false },
    paymentReceived: { email: true, inApp: true, push: false },
    lowInventory: { email: true, inApp: true, push: false },
    maintenanceAlert: { email: false, inApp: true, push: true },
    attendanceAlert: { email: false, inApp: false, push: false },
    systemAlerts: { email: true, inApp: true, push: true },
  });

  const [saved, setSaved] = useState(false);

  const toggle = (key: keyof typeof prefs, channel: 'email' | 'inApp' | 'push') => {
    setPrefs((p) => ({ ...p, [key]: { ...p[key], [channel]: !p[key][channel] } }));
    setSaved(false);
  };

  const handleSave = async () => {
    await new Promise((r) => setTimeout(r, 300));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const labels: Record<keyof typeof prefs, { label: string; sub: string }> = {
    newReservation: { label: 'New Reservation', sub: 'When a reservation is created' },
    checkIn: { label: 'Guest Check-in', sub: 'When a guest checks in' },
    checkOut: { label: 'Guest Check-out', sub: 'When a guest checks out' },
    paymentReceived: { label: 'Payment Received', sub: 'When a payment is recorded' },
    lowInventory: { label: 'Low Inventory', sub: 'When stock falls below par' },
    maintenanceAlert: { label: 'Maintenance Alert', sub: 'Urgent maintenance requests' },
    attendanceAlert: { label: 'Attendance Issues', sub: 'Late or absent staff' },
    systemAlerts: { label: 'System Alerts', sub: 'Security and system events' },
  };

  const Toggle = ({ on, onClick }: { on: boolean; onClick: () => void }) => (
    <button
      onClick={onClick}
      className={`relative w-9 h-5 rounded-full transition-all shrink-0 ${on ? 'bg-blue-600' : 'bg-[#0f1117] border border-[#1e2536]'}`}
    >
      <span
        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${on ? 'left-4' : 'left-0.5'}`}
      />
    </button>
  );

  return (
    <div className="space-y-5">
      <div className="bg-[#161b27] border border-[#1e2536] rounded-xl overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-0 border-b border-[#1e2536] px-5 py-3 bg-[#0f1117]/50">
          <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">Event</span>
          <span className="text-xs text-slate-500 uppercase tracking-wider font-medium text-center w-16">
            Email
          </span>
          <span className="text-xs text-slate-500 uppercase tracking-wider font-medium text-center w-16">
            In-App
          </span>
          <span className="text-xs text-slate-500 uppercase tracking-wider font-medium text-center w-16">
            Push
          </span>
        </div>
        {(Object.keys(prefs) as (keyof typeof prefs)[]).map((key, i, arr) => {
          const { label, sub } = labels[key];
          const p = prefs[key];
          return (
            <div
              key={key}
              className={`grid grid-cols-[1fr_auto_auto_auto] items-center px-5 py-4 gap-0 ${i < arr.length - 1 ? 'border-b border-[#1e2536]' : ''} hover:bg-white/[0.01] transition-colors`}
            >
              <div>
                <p className="text-sm font-medium text-slate-200">{label}</p>
                <p className="text-xs text-slate-600 mt-0.5">{sub}</p>
              </div>
              <div className="flex justify-center w-16">
                <Toggle on={p.email} onClick={() => toggle(key, 'email')} />
              </div>
              <div className="flex justify-center w-16">
                <Toggle on={p.inApp} onClick={() => toggle(key, 'inApp')} />
              </div>
              <div className="flex justify-center w-16">
                <Toggle on={p.push} onClick={() => toggle(key, 'push')} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${saved ? 'bg-emerald-600 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
        >
          {saved ? (
            <>
              <CheckCircle2 size={14} /> Saved!
            </>
          ) : (
            <>
              <Bell size={14} /> Save Preferences
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Sessions Tab ─────────────────────────────────────────────────────────────
function SessionsTab({ lastLogin }: { lastLogin: string }) {
  const [sessions, setSessions] = useState(activeSessions);

  const revokeSession = (id: string) =>
    setSessions((s) => s.filter((x) => x.id === 's1' || x.id !== id));
  const revokeAll = () => setSessions((s) => s.filter((x) => x.current));

  const deviceIcon = (device: string) => {
    if (device.toLowerCase().includes('iphone') || device.toLowerCase().includes('android'))
      return Smartphone;
    return Monitor;
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-white">Active Sessions</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {sessions.length} device{sessions.length !== 1 ? 's' : ''} signed in
          </p>
        </div>
        {sessions.length > 1 && (
          <button
            onClick={revokeAll}
            className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 px-3 py-1.5 rounded-lg font-medium transition-colors"
          >
            <LogOut size={12} /> Sign out all other sessions
          </button>
        )}
      </div>

      <div className="space-y-3">
        {sessions.map((s) => {
          const DevIcon = deviceIcon(s.device);
          return (
            <div
              key={s.id}
              className={`bg-[#161b27] border rounded-xl p-4 flex items-center gap-4 ${s.current ? 'border-blue-500/30 bg-blue-500/5' : 'border-[#1e2536]'}`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${s.current ? 'bg-blue-500/20 border border-blue-500/30' : 'bg-[#0f1117] border border-[#1e2536]'}`}
              >
                <DevIcon size={18} className={s.current ? 'text-blue-400' : 'text-slate-500'} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-slate-200">{s.device}</p>
                  {s.current && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-400 font-semibold">
                      Current Session
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Globe size={10} />
                    {s.location}
                  </span>
                  <span className="text-xs text-slate-600 font-mono">{s.ip}</span>
                  <span className="text-xs text-slate-600 flex items-center gap-1">
                    <Clock size={10} />
                    {s.lastActive}
                  </span>
                </div>
              </div>
              {!s.current && (
                <button
                  onClick={() => revokeSession(s.id)}
                  className="text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap flex items-center gap-1 shrink-0"
                >
                  <X size={11} /> Revoke
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Last login info */}
      <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
          <CheckCircle2 size={15} className="text-emerald-400" />
        </div>
        <div>
          <p className="text-xs text-slate-500">Last successful login</p>
          <p className="text-sm font-medium text-slate-200">{lastLogin} · Lagos, Nigeria</p>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function MyAccountPage() {
  const [tab, setTab] = useState<Tab>('profile');
  const { user: storeUser } = useAuthStore();
  const { data, isLoading } = useMe();

  const currentUser = useMemo<LiveUser>(() => {
    const u = data?.user ?? storeUser;
    if (!u) return emptyUser;

    return {
      id: u.id ?? '',
      name: u.name ?? '—',
      username: u.username ?? (u.email?.includes('@') ? u.email.split('@')[0] : (u.email ?? '—')),
      email: u.email ?? '—',
      phone: u.phone ?? '',
      role: u.role ?? 'STAFF',
      department: u.department ?? '—',
      position: u.position ?? '—',
      employeeCode: u.employeeCode ?? '—',
      attendancePinSet: u.attendancePinSet ?? false,
      joinDate: formatDate(u.joinDate),
      lastLogin: formatDateTime(u.lastLoginAt),
      avatar: u.avatar ?? null,
    };
  }, [data?.user, storeUser]);

  const initials = currentUser.name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('');

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        {currentUser?.avatar ? (
          <img
            src={currentUser.avatar}
            alt="User Avatar"
            className="w-14 h-14 rounded-full object-cover"
          />
        ) : (
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/40 to-violet-500/40 border border-white/10 flex items-center justify-center text-xl font-bold text-white shrink-0">
            {initials}
          </div>
        )}

        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">{currentUser.name}</h1>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <p className="text-slate-500 text-sm">{currentUser.position}</p>
            <span className="text-slate-700">·</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium border ${roleColors[currentUser.role] ?? roleColors.STAFF}`}
            >
              {currentUser.role}
            </span>
            {isLoading && <span className="text-xs text-slate-600">Loading...</span>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#161b27] border border-[#1e2536] rounded-xl p-1 w-fit flex-wrap">
        <TabBtn
          id="profile"
          label="Profile"
          icon={User}
          active={tab === 'profile'}
          onClick={() => setTab('profile')}
        />
        <TabBtn
          id="password"
          label="Password"
          icon={Lock}
          active={tab === 'password'}
          onClick={() => setTab('password')}
        />
        <TabBtn
          id="notifications"
          label="Notifications"
          icon={Bell}
          active={tab === 'notifications'}
          onClick={() => setTab('notifications')}
        />
        <TabBtn
          id="sessions"
          label="Sessions"
          icon={Monitor}
          active={tab === 'sessions'}
          onClick={() => setTab('sessions')}
        />
      </div>

      {/* Tab content */}
      {tab === 'profile' && <ProfileTab user={currentUser} />}
      {tab === 'password' && <PasswordTab />}
      {tab === 'notifications' && <NotificationsTab />}
      {tab === 'sessions' && <SessionsTab lastLogin={currentUser.lastLogin} />}
    </div>
  );
}
