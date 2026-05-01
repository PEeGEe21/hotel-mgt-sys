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
import { useChangePassword, useMe, useResetAttendancePin, useUpdateMe } from '@/hooks/useMe';
import { useAuthStore } from '@/store/auth.store';
import openToast from '@/components/ToastComponent';
import { usePermissions } from '@/hooks/usePermissions';
import { Switch } from '@/components/ui/switch';
import {
  type NotificationEvent,
  useNotificationPreferences,
  useSendTestNotification,
  useUpdateNotificationPreferences,
} from '@/hooks/useNotificationPreferences';
import {
  useDisablePushNotifications,
  useEnablePushNotifications,
  usePushSettings,
  usePushStatus,
} from '@/hooks/usePushNotifications';
import {
  isInAppNotificationSoundEnabled,
  setInAppNotificationSoundEnabled,
} from '@/lib/notification-sound-settings';
import { useSearchParams } from 'next/navigation';
import { type Permission } from '@/lib/permissions';
import { validateImageFile } from '@/utils/image-file';

// ─── Types ─────────────────────────────────────────────────────────────────────
type Tab = 'profile' | 'password' | 'notifications' | 'sessions' | 'permissions';

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

type PasswordFormKey = 'current' | 'newPw' | 'confirm';

function PasswordField({
  label,
  fieldKey,
  placeholder,
  value,
  visible,
  onChange,
  onToggleVisibility,
}: {
  label: string;
  fieldKey: PasswordFormKey;
  placeholder: string;
  value: string;
  visible: boolean;
  onChange: (field: PasswordFormKey, value: string) => void;
  onToggleVisibility: (field: PasswordFormKey) => void;
}) {
  return (
    <Field label={label}>
      <div className="relative">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(fieldKey, e.target.value)}
          placeholder={placeholder}
          className={`${inputCls} pr-10`}
        />
        <button
          type="button"
          onClick={() => onToggleVisibility(fieldKey)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
        >
          {visible ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
    </Field>
  );
}

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
    .map((n: string) => n[0])
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
    const result = validateImageFile(file, { label: 'Avatar' });
    if (!result.ok) {
      setToast({ msg: result.message, type: 'error' });
      openToast('error', result.message);
      if (fileInputRef.current) fileInputRef.current.value = '';
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
              accept="image/png,image/jpeg,image/webp"
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
  const changePassword = useChangePassword();

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
    if (form.current === form.newPw) {
      openToast('error', 'New password must be different');
      return setToast({ msg: 'New password must be different', type: 'error' });
    }
    setSaving(true);
    try {
      await changePassword.mutateAsync({
        currentPassword: form.current,
        newPassword: form.newPw,
      });
      setForm({ current: '', newPw: '', confirm: '' });
      setToast({ msg: 'Password changed successfully', type: 'success' });
      openToast('success', 'Password changed successfully');
      setTimeout(() => setToast(null), 3000);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Could not change password';
      setToast({ msg, type: 'error' });
      openToast('error', msg);
      setTimeout(() => setToast(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  const updatePasswordField = (field: PasswordFormKey, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const togglePasswordVisibility = (field: PasswordFormKey) => {
    setShow((current) => ({ ...current, [field]: !current[field] }));
  };

  return (
    <div className="space-y-5">
      <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-6 space-y-4 max-w-lg">
        <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-2">
          Change Password
        </p>

        <PasswordField
          label="Current Password"
          fieldKey="current"
          placeholder="Enter current password"
          value={form.current}
          visible={show.current}
          onChange={updatePasswordField}
          onToggleVisibility={togglePasswordVisibility}
        />
        <PasswordField
          label="New Password"
          fieldKey="newPw"
          placeholder="Min 8 characters"
          value={form.newPw}
          visible={show.newPw}
          onChange={updatePasswordField}
          onToggleVisibility={togglePasswordVisibility}
        />

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

        <PasswordField
          label="Confirm New Password"
          fieldKey="confirm"
          placeholder="Re-enter new password"
          value={form.confirm}
          visible={show.confirm}
          onChange={updatePasswordField}
          onToggleVisibility={togglePasswordVisibility}
        />

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
  const defaultPrefs: Record<NotificationEvent, { email: boolean; inApp: boolean; push: boolean }> =
    {
      newReservation: { email: true, inApp: true, push: false },
      checkIn: { email: false, inApp: true, push: true },
      checkOut: { email: false, inApp: true, push: false },
      upcomingArrival: { email: true, inApp: true, push: true },
      checkOutDue: { email: true, inApp: true, push: true },
      paymentOverdue: { email: true, inApp: true, push: true },
      paymentReceived: { email: true, inApp: true, push: false },
      lowInventory: { email: true, inApp: true, push: false },
      housekeepingAlert: { email: true, inApp: true, push: true },
      noShowFollowUp: { email: true, inApp: true, push: true },
      maintenanceAlert: { email: false, inApp: true, push: true },
      maintenanceEscalation: { email: true, inApp: true, push: true },
      attendanceAlert: { email: false, inApp: false, push: false },
      dailyDigest: { email: true, inApp: true, push: false },
      systemAlerts: { email: true, inApp: true, push: true },
    };
  const labels: Record<NotificationEvent, { label: string; sub: string }> = {
    newReservation: { label: 'New Reservation', sub: 'When a reservation is created' },
    checkIn: { label: 'Guest Check-in', sub: 'When a guest checks in' },
    checkOut: { label: 'Guest Check-out', sub: 'When a guest checks out' },
    upcomingArrival: {
      label: 'Upcoming Arrivals',
      sub: 'A prep summary for reservations arriving on the next hotel-local day',
    },
    checkOutDue: { label: 'Checkout Due', sub: 'Due-today and overdue checkout alerts' },
    paymentOverdue: {
      label: 'Overdue Payments',
      sub: 'Reservations with balances still outstanding after checkout',
    },
    paymentReceived: { label: 'Payment Received', sub: 'When a payment is recorded' },
    lowInventory: { label: 'Low Inventory', sub: 'When stock falls below par' },
    housekeepingAlert: {
      label: 'Housekeeping Alert',
      sub: 'Checkout prep tasks needing follow-up',
    },
    noShowFollowUp: {
      label: 'No-show Follow-up',
      sub: 'Reservations that still need arrival review or no-show action',
    },
    maintenanceAlert: { label: 'Maintenance Alert', sub: 'Urgent maintenance requests' },
    maintenanceEscalation: {
      label: 'Maintenance Escalation',
      sub: 'Open high-priority maintenance requests needing escalation',
    },
    attendanceAlert: { label: 'Attendance Issues', sub: 'Late or absent staff' },
    dailyDigest: {
      label: 'Daily Digest',
      sub: 'A daily operating summary across arrivals, departures, payments, and issues',
    },
    systemAlerts: { label: 'System Alerts', sub: 'Security and system events' },
  };
  const eventPermissions: Partial<Record<NotificationEvent, Permission>> = {
    newReservation: 'view:reservations',
    checkIn: 'checkin:reservations',
    checkOut: 'checkout:reservations',
    upcomingArrival: 'view:reservations',
    checkOutDue: 'checkout:reservations',
    paymentOverdue: 'view:finance',
    paymentReceived: 'view:finance',
    lowInventory: 'view:inventory',
    housekeepingAlert: 'view:housekeeping',
    noShowFollowUp: 'view:reservations',
    maintenanceAlert: 'view:facilities',
    maintenanceEscalation: 'view:facilities',
    attendanceAlert: 'view:attendance',
    dailyDigest: 'view:settings',
    systemAlerts: 'view:settings',
  };

  const { data, isLoading } = useNotificationPreferences();
  const updatePrefs = useUpdateNotificationPreferences();
  const sendTestNotification = useSendTestNotification();
  const { data: pushSettings } = usePushSettings();
  const { data: pushStatus, isLoading: pushStatusLoading } = usePushStatus();
  const enablePush = useEnablePushNotifications();
  const disablePush = useDisablePushNotifications();
  const { can } = usePermissions();
  const [prefs, setPrefs] = useState(defaultPrefs);
  const [saved, setSaved] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushPermission, setPushPermission] = useState<'default' | 'granted' | 'denied'>('default');
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [inAppSoundEnabled, setInAppSoundEnabledState] = useState(true);
  const [testEvent, setTestEvent] = useState<NotificationEvent>('systemAlerts');

  useEffect(() => {
    setInAppSoundEnabledState(isInAppNotificationSoundEnabled());
  }, []);

  useEffect(() => {
    let cancelled = false;

    const inspectPush = async () => {
      if (typeof window === 'undefined') return;
      const supported =
        'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
      if (!supported) {
        if (!cancelled) {
          setPushSupported(false);
          setPushSubscribed(false);
        }
        return;
      }

      const registration = await navigator.serviceWorker.getRegistration('/push-sw.js');
      const subscription = await registration?.pushManager.getSubscription();

      if (!cancelled) {
        setPushSupported(true);
        setPushPermission(Notification.permission);
        setPushSubscribed(Boolean(subscription));
      }
    };

    void inspectPush();
    return () => {
      cancelled = true;
    };
  }, [enablePush.isSuccess, disablePush.isSuccess]);

  const toggle = (key: keyof typeof prefs, channel: 'email' | 'inApp' | 'push') => {
    setPrefs((p) => ({ ...p, [key]: { ...p[key], [channel]: !p[key][channel] } }));
    setSaved(false);
  };

  const handleSave = async () => {
    const payload = (Object.keys(prefs) as NotificationEvent[]).map((event) => ({
      event,
      channelEmail: prefs[event].email,
      channelInApp: prefs[event].inApp,
      channelPush: prefs[event].push,
    }));
    await updatePrefs.mutateAsync(payload);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  useEffect(() => {
    if (!data) return;
    setPrefs((current) => {
      const next = { ...current };
      for (const pref of data) {
        next[pref.event] = {
          email: pref.channelEmail,
          inApp: pref.channelInApp,
          push: pref.channelPush,
        };
      }
      return next;
    });
  }, [data]);

  const visibleKeys = (Object.keys(prefs) as NotificationEvent[]).filter((key) => {
    const required = eventPermissions[key];
    return !required || can(required);
  });
  const canSendTestNotification = can('manage:settings');
  const lastPushTestResult = pushStatus?.lastTestResult ?? null;

  useEffect(() => {
    if (!visibleKeys.length) return;
    if (!visibleKeys.includes(testEvent)) {
      setTestEvent(visibleKeys[0]);
    }
  }, [testEvent, visibleKeys]);

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
        {isLoading && (
          <div className="px-5 py-6 text-sm text-slate-500">Loading preferences...</div>
        )}
        {!isLoading && visibleKeys.length === 0 && (
          <div className="px-5 py-6 text-sm text-slate-500">
            No notification types are available for your current role.
          </div>
        )}
        {!isLoading &&
          visibleKeys.map((key, i, arr) => {
            const { label, sub } = labels[key] ?? '';
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
                  <Switch
                    checked={p.email}
                    onCheckedChange={() => toggle(key, 'email')}
                    className="data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-[#0f1117] border border-[#1e2536]"
                    aria-label={`${label} email`}
                  />
                </div>
                <div className="flex justify-center w-16">
                  <Switch
                    checked={p.inApp}
                    onCheckedChange={() => toggle(key, 'inApp')}
                    className="data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-[#0f1117] border border-[#1e2536]"
                    aria-label={`${label} in-app`}
                  />
                </div>
                <div className="flex justify-center w-16">
                  <Switch
                    checked={p.push}
                    onCheckedChange={() => toggle(key, 'push')}
                    className="data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-[#0f1117] border border-[#1e2536]"
                    aria-label={`${label} push`}
                  />
                </div>
              </div>
            );
          })}
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={updatePrefs.isPending}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            saved ? 'bg-emerald-600 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'
          } ${updatePrefs.isPending ? 'opacity-70 cursor-not-allowed' : ''}`}
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

      <div className="rounded-xl border border-[#1e2536] bg-[#161b27] p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-200">In-app notification sound</p>
            <p className="mt-1 text-xs text-slate-500">
              Play a default chime when a new realtime notification arrives while you are using the
              app.
            </p>
          </div>
          <Switch
            checked={inAppSoundEnabled}
            onCheckedChange={(checked) => {
              const enabled = Boolean(checked);
              setInAppSoundEnabledState(enabled);
              setInAppNotificationSoundEnabled(enabled);
            }}
            className="data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-[#0f1117] border border-[#1e2536]"
            aria-label="Toggle in-app notification sound"
          />
        </div>
      </div>

      {canSendTestNotification && (
        <div className="rounded-xl border border-[#1e2536] bg-[#161b27] p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-200">Test notification trigger</p>
              <p className="mt-1 text-xs text-slate-500">
                Send a test notification to yourself using one of your allowed event types to verify
                inbox, sound, push, and email behavior.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <select
                value={testEvent}
                onChange={(e) => setTestEvent(e.target.value as NotificationEvent)}
                className="rounded-lg border border-[#1e2536] bg-[#0f1117] px-3 py-2 text-sm text-slate-300 outline-none"
              >
                {visibleKeys.map((key) => (
                  <option key={key} value={key}>
                    {labels[key].label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={async () => {
                  await sendTestNotification.mutateAsync(testEvent);
                }}
                disabled={!visibleKeys.length || sendTestNotification.isPending}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sendTestNotification.isPending ? 'Sending...' : 'Send test notification'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-[#1e2536] bg-[#161b27] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-200">Browser push delivery</p>
            <p className="mt-1 text-xs text-slate-500">
              Enable device-level notifications from this browser for real push delivery when your
              push preferences are turned on.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[#1e2536] bg-[#0f1117] px-3 py-1.5 text-xs text-slate-400">
              {pushSupported ? `Permission: ${pushPermission}` : 'Push unsupported'}
            </span>
            <span
              className={`rounded-full border px-3 py-1.5 text-xs ${
                pushSubscribed
                  ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                  : 'border-amber-500/20 bg-amber-500/10 text-amber-300'
              }`}
            >
              {pushSubscribed ? 'Subscribed' : 'Not subscribed'}
            </span>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={async () => {
              if (!pushSettings?.enabled || !pushSettings.publicKey) {
                openToast('error', 'Web push is not configured on the server yet.');
                return;
              }
              await enablePush.mutateAsync(pushSettings.publicKey);
            }}
            disabled={!pushSupported || !pushSettings?.enabled || enablePush.isPending}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {enablePush.isPending ? 'Enabling...' : 'Enable browser push'}
          </button>
          <button
            type="button"
            onClick={async () => {
              await disablePush.mutateAsync();
            }}
            disabled={!pushSupported || disablePush.isPending}
            className="rounded-lg border border-[#1e2536] bg-[#0f1117] px-4 py-2 text-sm font-semibold text-slate-300 transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {disablePush.isPending ? 'Disabling...' : 'Disable browser push'}
          </button>
        </div>
      </div>

      {canSendTestNotification && (
        <div className="rounded-xl border border-[#1e2536] bg-[#161b27] p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-200">Push reliability</p>
              <p className="mt-1 text-xs text-slate-500">
                Review active subscription health and the most recent browser push delivery outcomes
                for this account.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[#1e2536] bg-[#0f1117] px-3 py-1.5 text-xs text-slate-300">
                Active subscriptions: {pushStatus?.summary.totalSubscriptions ?? 0}
              </span>
              <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-300">
                Healthy: {pushStatus?.summary.healthySubscriptions ?? 0}
              </span>
              <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-300">
                Never tested: {pushStatus?.summary.neverTestedSubscriptions ?? 0}
              </span>
              <span className="rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-300">
                Failing: {pushStatus?.summary.failingSubscriptions ?? 0}
              </span>
            </div>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <div className="rounded-xl border border-[#1e2536] bg-[#0f1117] p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Subscription health
              </p>
              {pushStatusLoading ? (
                <p className="mt-3 text-sm text-slate-500">Loading push health...</p>
              ) : !pushStatus?.subscriptions.length ? (
                <p className="mt-3 text-sm text-slate-500">
                  No active browser push subscriptions yet on this account.
                </p>
              ) : (
                <div className="mt-3 space-y-3">
                  {pushStatus.subscriptions.map((subscription) => (
                    <div
                      key={subscription.id}
                      className="rounded-lg border border-[#1e2536] bg-[#161b27] p-3"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-200">
                            {subscription.endpointPreview}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {subscription.userAgent || 'Unknown browser'}
                          </p>
                        </div>
                        <span
                          className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-wider ${
                            subscription.health === 'healthy'
                              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                              : subscription.health === 'failing'
                                ? 'border-rose-500/20 bg-rose-500/10 text-rose-300'
                                : 'border-amber-500/20 bg-amber-500/10 text-amber-300'
                          }`}
                        >
                          {subscription.health === 'never_tested'
                            ? 'Never tested'
                            : subscription.health}
                        </span>
                      </div>
                      <div className="mt-3 grid gap-2 text-xs text-slate-400 md:grid-cols-2">
                        <p>Last attempt: {formatDateTime(subscription.lastAttemptAt)}</p>
                        <p>Last success: {formatDateTime(subscription.lastSuccessAt)}</p>
                        <p>Last event: {subscription.lastDeliveredEvent ?? '—'}</p>
                        <p>Registered: {formatDateTime(subscription.createdAt)}</p>
                      </div>
                      {subscription.lastFailureReason && (
                        <p className="mt-3 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                          Last failure
                          {subscription.lastFailureStatusCode
                            ? ` (${subscription.lastFailureStatusCode})`
                            : ''}
                          : {subscription.lastFailureReason}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-[#1e2536] bg-[#0f1117] p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Last push test result
                </p>
                {!lastPushTestResult ? (
                  <p className="mt-3 text-sm text-slate-500">
                    No push test result recorded yet. Use the test notification trigger after
                    enabling browser push.
                  </p>
                ) : (
                  <div className="mt-3 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-slate-200">
                          {lastPushTestResult.title}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatDateTime(
                            lastPushTestResult.deliveredAt ?? lastPushTestResult.createdAt,
                          )}
                        </p>
                      </div>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-wider ${
                          lastPushTestResult.status === 'delivered'
                            ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                            : 'border-rose-500/20 bg-rose-500/10 text-rose-300'
                        }`}
                      >
                        {lastPushTestResult.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Endpoint: {lastPushTestResult.endpointPreview}
                    </p>
                    {lastPushTestResult.failureReason && (
                      <p className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                        {lastPushTestResult.failureStatusCode
                          ? `HTTP ${lastPushTestResult.failureStatusCode}: `
                          : ''}
                        {lastPushTestResult.failureReason}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-[#1e2536] bg-[#0f1117] p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Recent push deliveries
                </p>
                {!pushStatus?.recentDeliveries.length ? (
                  <p className="mt-3 text-sm text-slate-500">
                    No recent push delivery attempts yet.
                  </p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {pushStatus.recentDeliveries.slice(0, 5).map((delivery) => (
                      <div
                        key={delivery.id}
                        className="flex items-start justify-between gap-3 rounded-lg border border-[#1e2536] bg-[#161b27] px-3 py-2.5"
                      >
                        <div>
                          <p className="text-sm text-slate-200">{delivery.title}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {delivery.endpointPreview} •{' '}
                            {formatDateTime(delivery.deliveredAt ?? delivery.createdAt)}
                          </p>
                        </div>
                        <span
                          className={`rounded-full border px-2 py-1 text-[11px] uppercase tracking-wider ${
                            delivery.status === 'delivered'
                              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                              : 'border-rose-500/20 bg-rose-500/10 text-rose-300'
                          }`}
                        >
                          {delivery.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Permissions Tab ─────────────────────────────────────────────────────────
function PermissionsTab() {
  const { permissions, role, ready } = usePermissions();
  const user = useAuthStore((s) => s.user);
  const grants = user?.permissionOverrides?.grants ?? [];
  const denies = user?.permissionOverrides?.denies ?? [];

  return (
    <div className="space-y-5">
      <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5">
        <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-3">
          Role & Access
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-slate-200">Role:</span>
          <span
            className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${roleColors[role] ?? roleColors.STAFF}`}
          >
            {role}
          </span>
          <span className="text-xs text-slate-500">Effective permissions shown below</span>
        </div>
      </div>

      <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5">
        <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-4">
          Effective Permissions
        </p>
        {!ready ? (
          <p className="text-sm text-slate-500">Loading permissions...</p>
        ) : permissions.length === 0 ? (
          <p className="text-sm text-slate-500">No permissions assigned.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {permissions.map((p) => {
              const permission = String(p);
              return (
                <span
                  key={permission}
                  className="text-xs px-2.5 py-1 rounded-full bg-white/5 border border-[#1e2536] text-slate-300"
                >
                  {permission}
                </span>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-3">
            Extra Grants
          </p>
          {grants.length === 0 ? (
            <p className="text-sm text-slate-500">No additional grants.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {grants.map((p) => (
                <span
                  key={p}
                  className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300"
                >
                  {p}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-3">
            Explicit Denies
          </p>
          {denies.length === 0 ? (
            <p className="text-sm text-slate-500">No explicit denies.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {denies.map((p) => (
                <span
                  key={p}
                  className="text-xs px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-300"
                >
                  {p}
                </span>
              ))}
            </div>
          )}
        </div>
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
  const searchParams = useSearchParams();
  const validTabs: Tab[] = ['profile', 'password', 'notifications', 'sessions', 'permissions'];
  const [tab, setTab] = useState<Tab>(() => {
    const t = searchParams.get('tab') as Tab | null;
    return t && validTabs.includes(t) ? t : 'profile';
  });
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

  useEffect(() => {
    const t = searchParams.get('tab') as Tab | null;
    if (t && validTabs.includes(t)) setTab(t);
  }, [searchParams]);

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
          id="permissions"
          label="Permissions"
          icon={Shield}
          active={tab === 'permissions'}
          onClick={() => setTab('permissions')}
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
      {tab === 'permissions' && <PermissionsTab />}
      {tab === 'sessions' && <SessionsTab lastLogin={currentUser.lastLogin} />}
    </div>
  );
}
