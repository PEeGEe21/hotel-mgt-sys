'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  UserCheck,
  Search,
  Plus,
  Phone,
  Mail,
  ChevronRight,
  Shield,
  Clock,
  Briefcase,
  Loader2,
  X,
  Check,
  Star,
} from 'lucide-react';
import { createPortal } from 'react-dom';
import {
  useStaff,
  useCreateStaff,
  useRoles,
  type StaffRole,
  type ApiStaff,
  type CreateStaffInput,
} from '@/hooks/useStaff';
import openToast from '@/components/ToastComponent';
import { useDebounce } from '@/hooks/useDebounce';
import Pagination from '@/components/ui/pagination';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const CLOCK_STATUS_STYLE: Record<string, string> = {
  'Clocked In': 'bg-emerald-500/15 text-emerald-400',
  'Clocked Out': 'bg-slate-500/15   text-slate-400',
  'On Leave': 'bg-amber-500/15   text-amber-400',
  'Not Clocked In': 'bg-slate-500/10   text-slate-600',
};

const ROLE_COLOR: Record<string, string> = {
  ADMIN: 'text-violet-400',
  MANAGER: 'text-blue-400',
  RECEPTIONIST: 'text-sky-400',
  HOUSEKEEPING: 'text-emerald-400',
  CASHIER: 'text-amber-400',
  BARTENDER: 'text-orange-400',
  STAFF: 'text-slate-400',
};

// ─── Add Staff Modal ──────────────────────────────────────────────────────────
function AddStaffModal({
  departments,
  onClose,
}: {
  departments: { id: string; name: string }[];
  onClose: () => void;
}) {
  const createStaff = useCreateStaff();
  const { data: roles = [] } = useRoles();
  const [form, setForm] = useState<CreateStaffInput>({
    firstName: '',
    lastName: '',
    email: '',
    department: '',
    position: '',
    role: 'STAFF',
    hireDate: new Date().toISOString().slice(0, 10),
    phone: '',
    salary: 0,
  });
  const [error, setError] = useState('');
  const [created, setCreated] = useState<{ employeeCode: string } | null>(null);

  const set = (k: keyof CreateStaffInput, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.firstName.trim()) return setError('First name is required.');
    if (!form.lastName.trim()) return setError('Last name is required.');
    if (!form.email.trim()) return setError('Email is required.');
    if (!form.department) return setError('Department is required.');
    if (!form.position.trim()) return setError('Position is required.');
    setError('');
    try {
      const result = await createStaff.mutateAsync(form);
      openToast('success', `${form.firstName} ${form.lastName} added`);
      setCreated({ employeeCode: result.employeeCode });
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Could not create staff member.');
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
          <div>
            <h2 className="text-base font-bold text-white">Add Staff Member</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Creates a login account with default password
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Success state */}
        {created ? (
          <div className="px-6 py-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center mx-auto">
              <Check size={24} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-base font-bold text-white">
                {form.firstName} {form.lastName} added
              </p>
              <p className="text-sm text-slate-500 mt-1">Staff account created successfully</p>
            </div>
            <div className="bg-[#0f1117] border border-[#1e2536] rounded-xl p-4 space-y-2 text-left">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Employee Code</span>
                <span className="font-mono font-bold text-white">{created.employeeCode}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Login Email</span>
                <span className="text-slate-200">{form.email}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Default Password</span>
                <span className="font-mono text-amber-400 font-bold">password</span>
              </div>
            </div>
            <p className="text-xs text-slate-600">
              Staff will be prompted to change their password on first login.
            </p>
            <button
              onClick={onClose}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-lg py-2.5 text-sm font-semibold transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="px-6 py-5 space-y-4 max-h-[65vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>First Name *</Label>
                  <input
                    value={form.firstName}
                    onChange={(e) => set('firstName', e.target.value)}
                    placeholder="Chidi"
                    className={inputCls}
                    autoFocus
                  />
                </div>
                <div>
                  <Label>Last Name *</Label>
                  <input
                    value={form.lastName}
                    onChange={(e) => set('lastName', e.target.value)}
                    placeholder="Nwosu"
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
                  placeholder="chidi@hotel.com"
                  className={inputCls}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Department *</Label>
                  <select
                    value={form.department}
                    onChange={(e) => set('department', e.target.value)}
                    className={inputCls}
                  >
                    <option value="">Select…</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Position *</Label>
                  <input
                    value={form.position}
                    onChange={(e) => set('position', e.target.value)}
                    placeholder="Head Receptionist"
                    className={inputCls}
                  />
                </div>
              </div>

              {/* Role selector */}
              <div>
                <Label>System Role</Label>
                <div className="flex flex-wrap gap-2">
                  {roles.map((r) => (
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Phone</Label>
                  <input
                    value={form.phone}
                    onChange={(e) => set('phone', e.target.value)}
                    placeholder="+234 802 111 2233"
                    className={inputCls}
                  />
                </div>
                <div>
                  <Label>Hire Date</Label>
                  <input
                    type="date"
                    value={form.hireDate}
                    onChange={(e) => set('hireDate', e.target.value)}
                    className={inputCls + ' [color-scheme:dark]'}
                  />
                </div>
              </div>
              <div>
                <Label>Salary (₦/month)</Label>
                <input
                  type="number"
                  min={0}
                  value={form.salary}
                  onChange={(e) => set('salary', Number(e.target.value))}
                  placeholder="0"
                  className={inputCls}
                />
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
                disabled={createStaff.isPending}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
              >
                {createStaff.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Check size={14} />
                )}
                Add Staff
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function StaffPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [dept, setDept] = useState('');
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [limit, setLimit] = useState(10);

  const debouncedSearch = useDebounce(search, 400);
  const resetPage = () => setPage(1);

  const { data, isLoading, isFetching } = useStaff({
    search: debouncedSearch || undefined,
    department: dept || undefined,
    page,
    limit: limit,
  });

  const staff = data?.staff ?? [];
  const stats = data?.stats;
  const departments = data?.departments ?? [];

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              Staff
              {isFetching && !isLoading && (
                <Loader2 size={14} className="animate-spin text-slate-500" />
              )}
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">{stats?.total ?? '—'} team members</p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            <Plus size={15} /> Add Staff
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              label: 'Total Staff',
              value: stats?.total,
              icon: UserCheck,
              color: 'text-blue-400',
              bg: 'bg-blue-500/10    border-blue-500/20',
            },
            {
              label: 'Clocked In',
              value: stats?.clocked,
              icon: Clock,
              color: 'text-emerald-400',
              bg: 'bg-emerald-500/10 border-emerald-500/20',
            },
            {
              label: 'On Leave',
              value: stats?.onLeave,
              icon: Briefcase,
              color: 'text-amber-400',
              bg: 'bg-amber-500/10   border-amber-500/20',
            },
            {
              label: 'Departments',
              value: departments.length,
              icon: Shield,
              color: 'text-violet-400',
              bg: 'bg-violet-500/10  border-violet-500/20',
            },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div
              key={label}
              className={`${bg} border rounded-xl px-4 py-4 flex items-center gap-3`}
            >
              <Icon size={18} className={color} />
              <div>
                <p className="text-2xl font-bold text-white">{value ?? '—'}</p>
                <p className="text-xs text-slate-500">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <select
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              resetPage();
            }}
            className="bg-[#161b27] border border-[#1e2536] rounded-lg px-3 py-2 text-sm text-slate-300 outline-none focus:border-blue-500 transition-colors"
          >
            {[5, 10, 20, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n} per page
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2 bg-[#161b27] border border-[#1e2536] rounded-lg px-3 py-2 flex-1 min-w-56">
            <Search size={14} className="text-slate-500" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Name, position, employee code…"
              className="bg-transparent text-sm text-slate-300 placeholder:text-slate-600 outline-none flex-1"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => {
                setDept('');
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${!dept ? 'bg-blue-600/20 border-blue-500/30 text-blue-400' : 'bg-[#161b27] border-[#1e2536] text-slate-400 hover:text-slate-200'}`}
            >
              All
            </button>
            {departments.map((d) => (
              <button
                key={d.id}
                onClick={() => {
                  setDept(d.name);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${dept === d.name ? 'bg-blue-600/20 border-blue-500/30 text-blue-400' : 'bg-[#161b27] border-[#1e2536] text-slate-400 hover:text-slate-200'}`}
              >
                {d.name}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-[#161b27] border border-[#1e2536] rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 size={24} className="animate-spin text-slate-500" />
            </div>
          ) : (
            <table className="w-full">
              <thead className="border-b border-[#1e2536] bg-[#0f1117]/50">
                <tr>
                  {['Staff Member', 'Contact', 'Department', 'Role', 'Status', 'Salary', ''].map(
                    (h) => (
                      <th
                        key={h}
                        className="text-xs text-slate-500 uppercase tracking-wider font-medium px-4 py-3 text-left whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {staff.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => router.push(`/staff/${s.id}`)}
                    className="border-b border-[#1e2536] last:border-0 hover:bg-white/[0.02] transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-600/50 to-slate-700/50 border border-white/10 flex items-center justify-center text-sm font-bold text-white shrink-0">
                          {s.firstName[0]}
                          {s.lastName[0]}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium text-slate-200">
                              {s.firstName} {s.lastName}
                            </p>
                            {!s.user.isActive && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/20">
                                Inactive
                              </span>
                            )}
                            {s.user.mustChangePassword && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                Pwd change
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 font-mono">{s.employeeCode}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {s.phone && (
                        <p className="text-xs text-slate-400 flex items-center gap-1.5">
                          <Phone size={10} className="text-slate-600" />
                          {s.phone}
                        </p>
                      )}
                      <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <Mail size={10} className="text-slate-600" />
                        {s.user.email}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <span className="text-xs bg-slate-500/15 text-slate-400 px-2.5 py-1 rounded-full">
                          {s.department}
                        </span>
                        <p className="text-xs text-slate-600 mt-1">{s.position}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-medium ${ROLE_COLOR[s.user.role] ?? 'text-slate-400'}`}
                      >
                        {s.user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-medium ${CLOCK_STATUS_STYLE[s.clockStatus ?? 'Not Clocked In']}`}
                      >
                        {s.clockStatus ?? 'Not Clocked In'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-300">
                      {Number(s.salary) > 0 ? `₦${Number(s.salary).toLocaleString()}/mo` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <ChevronRight size={16} className="text-slate-600" />
                    </td>
                  </tr>
                ))}
                {staff.length === 0 && !isLoading && (
                  <tr>
                    <td colSpan={7} className="py-16 text-center">
                      <UserCheck size={32} className="text-slate-700 mx-auto mb-3" />
                      <p className="text-slate-500 text-sm">No staff found</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {data?.meta && staff.length > 0 && (
            <Pagination meta={data.meta} currentPage={page} handlePageChange={setPage} />
          )}
        </div>
      </div>

      {showAdd && <AddStaffModal departments={departments} onClose={() => setShowAdd(false)} />}
    </>
  );
}
