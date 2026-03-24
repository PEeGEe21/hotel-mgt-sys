'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  Phone,
  Mail,
  Briefcase,
  Calendar,
  DollarSign,
  Clock,
  Edit2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Shield,
  FileText,
  UserCheck,
  Loader2,
  X,
  Check,
  KeyRound,
  BedDouble,
  RotateCcw,
} from 'lucide-react';
import { createPortal } from 'react-dom';
import {
  useStaffMember,
  useUpdateStaff,
  useDeactivateStaff,
  useReactivateStaff,
  useResetStaffPassword,
  type ApiStaff,
  type CreateStaffInput,
  type StaffRole,
} from '@/hooks/useStaff';
import openToast from '@/components/ToastComponent';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' });
}
function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-NG', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const ROLE_COLOR: Record<string, string> = {
  ADMIN: 'text-violet-400',
  MANAGER: 'text-blue-400',
  RECEPTIONIST: 'text-sky-400',
  HOUSEKEEPING: 'text-emerald-400',
  CASHIER: 'text-amber-400',
  BARTENDER: 'text-orange-400',
  STAFF: 'text-slate-400',
};

const LEAVE_STATUS_STYLE: Record<string, string> = {
  PENDING: 'bg-amber-500/15 text-amber-400',
  APPROVED: 'bg-emerald-500/15 text-emerald-400',
  REJECTED: 'bg-red-500/15 text-red-400',
};

const TASK_TYPE_STYLE: Record<string, string> = {
  CLEANING: 'bg-sky-500/15 text-sky-400',
  TURNDOWN: 'bg-violet-500/15 text-violet-400',
  INSPECTION: 'bg-amber-500/15 text-amber-400',
  MAINTENANCE: 'bg-red-500/15 text-red-400',
  AMENITY: 'bg-emerald-500/15 text-emerald-400',
};

// ─── Edit Staff Modal ─────────────────────────────────────────────────────────
function EditStaffModal({ staff, onClose }: { staff: ApiStaff; onClose: () => void }) {
  const update = useUpdateStaff(staff.id);
  const ROLES: StaffRole[] = [
    'ADMIN',
    'MANAGER',
    'RECEPTIONIST',
    'HOUSEKEEPING',
    'CASHIER',
    'BARTENDER',
    'STAFF',
  ];
  const [form, setForm] = useState({
    firstName: staff.firstName,
    lastName: staff.lastName,
    email: staff.user.email,
    department: staff.department,
    position: staff.position,
    phone: staff.phone ?? '',
    salary: Number(staff.salary),
    role: staff.user.role,
  });
  const [error, setError] = useState('');
  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.firstName.trim()) return setError('First name is required.');
    if (!form.email.trim()) return setError('Email is required.');
    setError('');
    try {
      await update.mutateAsync(form as any);
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Update failed.');
    }
  };

  const inputCls =
    'w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-blue-500 transition-colors';
  const Label = ({ children }: { children: React.ReactNode }) => (
    <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
      {children}
    </label>
  );

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#161b27] border border-[#1e2536] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#1e2536]">
          <h2 className="text-base font-bold text-white">Edit Staff</h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4 max-h-[65vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>First Name *</Label>
              <input
                value={form.firstName}
                onChange={(e) => set('firstName', e.target.value)}
                className={inputCls}
                autoFocus
              />
            </div>
            <div>
              <Label>Last Name</Label>
              <input
                value={form.lastName}
                onChange={(e) => set('lastName', e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
          <div>
            <Label>Email *</Label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              className={inputCls}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Department</Label>
              <input
                value={form.department}
                onChange={(e) => set('department', e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <Label>Position</Label>
              <input
                value={form.position}
                onChange={(e) => set('position', e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Phone</Label>
              <input
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <Label>Salary (₦/mo)</Label>
              <input
                type="number"
                min={0}
                value={form.salary}
                onChange={(e) => set('salary', Number(e.target.value))}
                className={inputCls}
              />
            </div>
          </div>
          <div>
            <Label>Role</Label>
            <div className="flex flex-wrap gap-2">
              {ROLES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => set('role', r)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${form.role === r ? 'bg-blue-600/20 border-blue-500/30 text-blue-400' : 'bg-[#0f1117] border-[#1e2536] text-slate-400 hover:text-slate-200'}`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>
        <div className="flex gap-3 px-6 pb-5 pt-4 border-t border-[#1e2536]">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg border border-[#1e2536] text-slate-400 text-sm hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={update.isPending}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
          >
            {update.isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Check size={14} />
            )}
            Save Changes
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ─── Tab ──────────────────────────────────────────────────────────────────────
type Tab = 'overview' | 'attendance' | 'leaves' | 'tasks';
function TabBtn({
  label,
  icon: Icon,
  active,
  onClick,
}: {
  label: string;
  icon: any;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap border ${active ? 'bg-blue-600/20 text-blue-400 border-blue-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border-transparent'}`}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function StaffDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const staffId = id as string;

  const { data: staff, isLoading, isError } = useStaffMember(staffId);
  const deactivate = useDeactivateStaff(staffId);
  const reactivate = useReactivateStaff(staffId);
  const resetPwd = useResetStaffPassword(staffId);

  const [tab, setTab] = useState<Tab>('overview');
  const [showEdit, setShowEdit] = useState(false);

  if (isLoading)
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin text-slate-500" />
      </div>
    );
  if (isError || !staff)
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <UserCheck size={40} className="text-slate-700" />
        <p className="text-slate-500">Staff member not found</p>
        <button
          onClick={() => router.push('/staff')}
          className="text-blue-400 text-sm hover:underline"
        >
          Back to Staff
        </button>
      </div>
    );

  const attendance = staff.attendance ?? [];
  const leaves = staff.leaves ?? [];
  const tasks = staff.tasks ?? [];
  const isActive = staff.user.isActive;

  // Compute today's hours from attendance
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayRecs = attendance.filter((a) => new Date(a.timestamp) >= today);
  let hoursToday = 0;
  for (let i = 0; i < todayRecs.length - 1; i += 2) {
    if (todayRecs[i]?.type === 'CLOCK_IN' && todayRecs[i + 1]?.type === 'CLOCK_OUT') {
      hoursToday +=
        (new Date(todayRecs[i + 1].timestamp).getTime() -
          new Date(todayRecs[i].timestamp).getTime()) /
        3_600_000;
    }
  }

  return (
    <div className="space-y-6 max-w-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/staff')}
            className="w-9 h-9 rounded-lg bg-[#161b27] border border-[#1e2536] flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors shrink-0"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-600/50 to-slate-700/50 border border-white/10 flex items-center justify-center text-xl font-bold text-white shrink-0">
            {staff.firstName[0]}
            {staff.lastName[0]}
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-bold text-white">
                {staff.firstName} {staff.lastName}
              </h1>
              {!isActive && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/20">
                  Inactive
                </span>
              )}
              {staff.user.mustChangePassword && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center gap-1">
                  <AlertTriangle size={10} /> Must change password
                </span>
              )}
            </div>
            <p className="text-slate-500 text-sm mt-0.5">
              <span className={`font-medium ${ROLE_COLOR[staff.user.role]}`}>
                {staff.user.role}
              </span>
              {' · '}
              {staff.position}
              {' · '}
              {staff.department}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowEdit(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#161b27] border border-[#1e2536] hover:border-slate-500 text-slate-300 text-xs font-medium transition-colors"
          >
            <Edit2 size={13} /> Edit
          </button>
          <button
            onClick={() => {
              if (confirm('Reset password to default?')) resetPwd.mutate();
            }}
            disabled={resetPwd.isPending}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#161b27] border border-[#1e2536] hover:border-amber-500/30 text-slate-400 hover:text-amber-400 text-xs font-medium transition-colors"
          >
            {resetPwd.isPending ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <RotateCcw size={13} />
            )}
            Reset Password
          </button>
          {isActive ? (
            <button
              onClick={() => {
                if (confirm('Deactivate this staff account?')) deactivate.mutate();
              }}
              disabled={deactivate.isPending}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#161b27] border border-[#1e2536] hover:border-red-500/30 text-slate-400 hover:text-red-400 text-xs font-medium transition-colors"
            >
              {deactivate.isPending ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <XCircle size={13} />
              )}
              Deactivate
            </button>
          ) : (
            <button
              onClick={() => reactivate.mutate()}
              disabled={reactivate.isPending}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600/15 border border-emerald-500/20 hover:bg-emerald-600/25 text-emerald-400 text-xs font-medium transition-colors"
            >
              {reactivate.isPending ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <CheckCircle2 size={13} />
              )}
              Reactivate
            </button>
          )}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: 'Employee Code',
            value: staff.employeeCode,
            sub: 'Kiosk ID',
            icon: Shield,
            color: 'text-blue-400',
            bg: 'bg-blue-500/10   border-blue-500/20',
          },
          {
            label: 'Hire Date',
            value: fmt(staff.hireDate),
            sub: 'Start date',
            icon: Calendar,
            color: 'text-violet-400',
            bg: 'bg-violet-500/10 border-violet-500/20',
          },
          {
            label: 'Salary',
            value: Number(staff.salary) > 0 ? `₦${Number(staff.salary).toLocaleString()}` : '—',
            sub: 'per month',
            icon: DollarSign,
            color: 'text-emerald-400',
            bg: 'bg-emerald-500/10 border-emerald-500/20',
          },
          {
            label: 'Hours Today',
            value: hoursToday > 0 ? `${hoursToday.toFixed(1)}h` : todayRecs.length ? 'Active' : '—',
            sub: 'from attendance',
            icon: Clock,
            color: 'text-amber-400',
            bg: 'bg-amber-500/10 border-amber-500/20',
          },
        ].map(({ label, value, sub, icon: Icon, color, bg }) => (
          <div key={label} className={`${bg} border rounded-xl px-4 py-4`}>
            <div className="flex items-center gap-2 mb-1">
              <Icon size={14} className={color} />
              <p className="text-xs text-slate-500 uppercase tracking-wider">{label}</p>
            </div>
            <p className="text-lg font-bold text-white leading-tight">{value}</p>
            <p className="text-xs text-slate-600 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#161b27] border border-[#1e2536] rounded-xl p-1 w-fit">
        <TabBtn
          label="Overview"
          icon={UserCheck}
          active={tab === 'overview'}
          onClick={() => setTab('overview')}
        />
        <TabBtn
          label="Attendance"
          icon={Clock}
          active={tab === 'attendance'}
          onClick={() => setTab('attendance')}
        />
        <TabBtn
          label="Leaves"
          icon={Briefcase}
          active={tab === 'leaves'}
          onClick={() => setTab('leaves')}
        />
        <TabBtn
          label="Tasks"
          icon={BedDouble}
          active={tab === 'tasks'}
          onClick={() => setTab('tasks')}
        />
      </div>

      {/* ── Overview ── */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="md:col-span-2 space-y-5">
            {/* Profile */}
            <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5">
              <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-4">
                Profile
              </p>
              <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                {[
                  { label: 'Full Name', value: `${staff.firstName} ${staff.lastName}` },
                  { label: 'Email', value: staff.user.email },
                  { label: 'Phone', value: staff.phone ?? '—' },
                  { label: 'Department', value: staff.department },
                  { label: 'Position', value: staff.position },
                  { label: 'System Role', value: staff.user.role },
                  { label: 'Employee No', value: staff.employeeCode },
                  { label: 'Hire Date', value: fmt(staff.hireDate) },
                  {
                    label: 'Salary',
                    value:
                      Number(staff.salary) > 0
                        ? `₦${Number(staff.salary).toLocaleString()}/mo`
                        : '—',
                  },
                  { label: 'Account', value: isActive ? 'Active' : 'Deactivated' },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-xs text-slate-600">{label}</p>
                    <p
                      className={`text-sm font-medium mt-0.5 ${label === 'System Role' ? (ROLE_COLOR[value] ?? 'text-slate-200') : label === 'Account' ? (isActive ? 'text-emerald-400' : 'text-red-400') : 'text-slate-200'}`}
                    >
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent attendance */}
            <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5">
              <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-4">
                Recent Attendance
              </p>
              {attendance.length > 0 ? (
                <div className="space-y-2">
                  {attendance.slice(0, 8).map((a, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between py-2 border-b border-[#1e2536] last:border-0"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${a.type === 'CLOCK_IN' ? 'bg-emerald-400' : 'bg-slate-500'}`}
                        />
                        <span
                          className={`text-xs font-medium ${a.type === 'CLOCK_IN' ? 'text-emerald-400' : 'text-slate-400'}`}
                        >
                          {a.type === 'CLOCK_IN' ? 'Clock In' : 'Clock Out'}
                        </span>
                        {a.method && (
                          <span className="text-[10px] text-slate-600 bg-slate-700/30 px-1.5 py-0.5 rounded">
                            {a.method}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500">{fmtDateTime(a.timestamp)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-600 text-sm text-center py-4">No attendance records</p>
              )}
            </div>
          </div>

          {/* Right */}
          <div className="space-y-5">
            {/* Account info */}
            <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5">
              <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-4">
                Account
              </p>
              <div className="space-y-3">
                {[
                  { label: 'Email', value: staff.user.email },
                  { label: 'Role', value: staff.user.role },
                  { label: 'Status', value: isActive ? 'Active' : 'Deactivated' },
                  {
                    label: 'Last Login',
                    value: staff.user.lastLoginAt ? fmtDateTime(staff.user.lastLoginAt) : 'Never',
                  },
                  {
                    label: 'Password',
                    value: staff.user.mustChangePassword ? 'Must change' : 'Set',
                  },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">{label}</span>
                    <span
                      className={`text-xs font-medium ${
                        label === 'Status'
                          ? isActive
                            ? 'text-emerald-400'
                            : 'text-red-400'
                          : label === 'Password' && staff.user.mustChangePassword
                            ? 'text-amber-400'
                            : 'text-slate-300'
                      }`}
                    >
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Active tasks */}
            <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5">
              <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-3">
                Active Tasks
              </p>
              {tasks.length > 0 ? (
                <div className="space-y-2">
                  {tasks.map((t: any) => (
                    <div
                      key={t.id}
                      className="flex items-center gap-2 bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2"
                    >
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${TASK_TYPE_STYLE[t.type] ?? 'bg-slate-500/15 text-slate-400'}`}
                      >
                        {t.type}
                      </span>
                      <span className="text-xs text-slate-300">Room {t.room?.number}</span>
                      <span className="ml-auto text-[10px] text-slate-600">{t.status}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-600 text-xs text-center py-3">No active tasks</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Attendance ── */}
      {tab === 'attendance' && (
        <div className="bg-[#161b27] border border-[#1e2536] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#1e2536]">
            <p className="text-sm font-semibold text-white">Attendance History</p>
            <p className="text-xs text-slate-500 mt-0.5">Last 20 records</p>
          </div>
          {attendance.length > 0 ? (
            <table className="w-full">
              <thead className="border-b border-[#1e2536] bg-[#0f1117]/50">
                <tr>
                  {['Type', 'Date & Time', 'Method', 'Note'].map((h) => (
                    <th
                      key={h}
                      className="text-xs text-slate-500 uppercase tracking-wider font-medium px-4 py-3 text-left"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e2536]">
                {attendance.map((a: any, i: number) => (
                  <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-medium flex items-center gap-1.5 ${a.type === 'CLOCK_IN' ? 'text-emerald-400' : 'text-slate-400'}`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${a.type === 'CLOCK_IN' ? 'bg-emerald-400' : 'bg-slate-500'}`}
                        />
                        {a.type === 'CLOCK_IN' ? 'Clock In' : 'Clock Out'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">{fmtDateTime(a.timestamp)}</td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] bg-slate-700/30 text-slate-400 px-2 py-0.5 rounded">
                        {a.method ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{a.note ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-12 text-center">
              <Clock size={28} className="text-slate-700 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">No attendance records</p>
            </div>
          )}
        </div>
      )}

      {/* ── Leaves ── */}
      {tab === 'leaves' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-white">Leave History</p>
          </div>
          {leaves.length > 0 ? (
            <div className="bg-[#161b27] border border-[#1e2536] rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="border-b border-[#1e2536] bg-[#0f1117]/50">
                  <tr>
                    {['Type', 'From', 'To', 'Reason', 'Status'].map((h) => (
                      <th
                        key={h}
                        className="text-xs text-slate-500 uppercase tracking-wider font-medium px-4 py-3 text-left"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e2536]">
                  {leaves.map((l: any) => (
                    <tr key={l.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 text-xs text-slate-300">{l.type}</td>
                      <td className="px-4 py-3 text-xs text-slate-400">{fmt(l.startDate)}</td>
                      <td className="px-4 py-3 text-xs text-slate-400">{fmt(l.endDate)}</td>
                      <td className="px-4 py-3 text-xs text-slate-400 max-w-xs truncate">
                        {l.reason}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${LEAVE_STATUS_STYLE[l.status] ?? 'bg-slate-500/15 text-slate-400'}`}
                        >
                          {l.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center bg-[#161b27] border border-[#1e2536] rounded-xl">
              <Briefcase size={28} className="text-slate-700 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">No leave records</p>
            </div>
          )}
        </div>
      )}

      {/* ── Tasks ── */}
      {tab === 'tasks' && (
        <div className="space-y-3">
          {tasks.length > 0 ? (
            tasks.map((t: any) => (
              <div
                key={t.id}
                className="bg-[#161b27] border border-[#1e2536] rounded-xl p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0f1117] border border-[#1e2536] flex items-center justify-center shrink-0">
                    <BedDouble size={14} className="text-slate-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-200">Room {t.room?.number}</p>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${TASK_TYPE_STYLE[t.type] ?? 'bg-slate-500/15 text-slate-400'}`}
                      >
                        {t.type}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {t.room?.type}
                      {t.dueBy && ` · Due ${fmtTime(t.dueBy)}`}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    t.status === 'DONE'
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : t.status === 'IN_PROGRESS'
                        ? 'bg-blue-500/15    text-blue-400'
                        : 'bg-amber-500/15   text-amber-400'
                  }`}
                >
                  {t.status}
                </span>
              </div>
            ))
          ) : (
            <div className="py-12 text-center bg-[#161b27] border border-[#1e2536] rounded-xl">
              <BedDouble size={28} className="text-slate-700 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">No active tasks assigned</p>
            </div>
          )}
        </div>
      )}

      {showEdit && <EditStaffModal staff={staff} onClose={() => setShowEdit(false)} />}
    </div>
  );
}
