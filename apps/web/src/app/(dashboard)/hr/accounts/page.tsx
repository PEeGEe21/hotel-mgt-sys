'use client';

import { useMemo, useState } from 'react';
import {
  UserCog,
  Plus,
  Search,
  Shield,
  X,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  Key,
  LogIn,
} from 'lucide-react';
import {
  useCreateUserAccount,
  useDeleteUserAccount,
  useResetUserPassword,
  useUpdateUserAccount,
  useUserAccounts,
  type UserAccount,
} from '@/hooks/useUserAccounts';
import { useDebounce } from '@/hooks/useDebounce';
import Pagination from '@/components/ui/pagination';
import { useAuthStore } from '@/store/auth.store';
import { impersonateAction } from '@/actions/auth.actions';
import { useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '@/store/app.store';
import { useRouter } from 'next/navigation';
import { usePresenceRealtime } from '@/hooks/usePresenceRealtime';
import TableScroll from '@/components/ui/table-scroll';

type Role =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'MANAGER'
  | 'RECEPTIONIST'
  | 'HOUSEKEEPING'
  | 'CASHIER'
  | 'COOK'
  | 'BARTENDER'
  | 'STAFF';
type AccountStatus = 'Active' | 'Suspended' | 'Pending';

const roleColors: Record<Role, string> = {
  SUPER_ADMIN: 'text-red-400 bg-red-500/15',
  ADMIN: 'text-violet-400 bg-violet-500/15',
  MANAGER: 'text-blue-400 bg-blue-500/15',
  RECEPTIONIST: 'text-sky-400 bg-sky-500/15',
  HOUSEKEEPING: 'text-emerald-400 bg-emerald-500/15',
  CASHIER: 'text-amber-400 bg-amber-500/15',
  COOK: 'text-rose-400 bg-rose-500/15',
  BARTENDER: 'text-orange-400 bg-orange-500/15',
  STAFF: 'text-slate-400 bg-slate-500/15',
};

const statusStyle: Record<AccountStatus, string> = {
  Active: 'bg-emerald-500/15 text-emerald-400',
  Suspended: 'bg-red-500/15 text-red-400',
  Pending: 'bg-amber-500/15 text-amber-400',
};

const roles: Role[] = [
  'ADMIN',
  'MANAGER',
  'RECEPTIONIST',
  'HOUSEKEEPING',
  'CASHIER',
  'COOK',
  'BARTENDER',
  'STAFF',
];

function AccountModal({
  account,
  onClose,
  onSave,
}: {
  account?: UserAccount | null;
  onClose: () => void;
  onSave: (payload: {
    email: string;
    password?: string;
    role: string;
    firstName: string;
    lastName: string;
    department: string;
    position: string;
    employeeCode: string;
  }) => void;
}) {
  const [form, setForm] = useState({
    firstName: account?.firstName ?? '',
    lastName: account?.lastName ?? '',
    email: account?.email ?? '',
    role: account?.role ?? 'STAFF',
    department: account?.department ?? '',
    position: account?.position ?? '',
    employeeCode: account?.employeeCode ?? '',
    password: '',
  });

  const update = (key: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const canSave =
    form.firstName &&
    form.lastName &&
    form.email &&
    form.role &&
    form.department &&
    form.position &&
    form.employeeCode &&
    (account ? true : form.password);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#161b27] border border-[#1e2536] rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">
            {account ? 'Edit User Account' : 'Create User Account'}
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-4">
          {[
            { label: 'First Name', key: 'firstName', placeholder: 'Jane' },
            { label: 'Last Name', key: 'lastName', placeholder: 'Doe' },
            { label: 'Email', key: 'email', placeholder: 'work email address', type: 'email' },
            { label: 'Department', key: 'department', placeholder: 'Front Desk' },
            { label: 'Position', key: 'position', placeholder: 'Receptionist' },
            { label: 'Employee Code', key: 'employeeCode', placeholder: 'EMP-001' },
          ].map(({ label, key, placeholder, type }) => (
            <div key={label}>
              <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
                {label}
              </label>
              <input
                type={type ?? 'text'}
                value={(form as any)[key]}
                onChange={(e) => update(key as any, e.target.value)}
                placeholder={placeholder}
                className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          ))}
          {!account && (
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
                Temporary Password
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => update('password', e.target.value)}
                placeholder="Will be changed on first login"
                className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          )}
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-2 block">
              Assign Role
            </label>
            <div className="flex flex-wrap gap-2">
              {roles.map((r) => (
                <button
                  key={r}
                  onClick={() => update('role', r)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    form.role === r
                      ? 'bg-blue-600/20 border-blue-500/30 text-blue-400'
                      : 'bg-[#0f1117] border-[#1e2536] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button
            onClick={onClose}
            className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg py-2.5 text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => canSave && onSave(form)}
            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg py-2.5 text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={!canSave}
          >
            {account ? 'Save Changes' : 'Create Account'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UserAccountsPage() {
  usePresenceRealtime();

  const router = useRouter();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const setHotel = useAppStore((s) => s.setHotel);
  const canImpersonate =
    currentUser?.role === 'SUPER_ADMIN' ||
    currentUser?.role === 'ADMIN' ||
    currentUser?.role === 'MANAGER';
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<UserAccount | null>(null);
  const debouncedSearch = useDebounce(search.trim(), 300);
  const { data, isLoading } = useUserAccounts({
    search: debouncedSearch || undefined,
    page,
    limit: limit,
  });
  const createAccount = useCreateUserAccount();
  const updateAccount = useUpdateUserAccount(editing?.id ?? '');
  const deleteAccount = useDeleteUserAccount();
  const resetPassword = useResetUserPassword(editing?.id ?? '');
  const resetPage = () => setPage(1);

  const accounts = data?.users ?? [];
  const stats = data?.stats;

  // const stats = useMemo(
  //   () => ({
  //     total: accounts.length,
  //     active: accounts.filter((a) => a.status === 'Active').length,
  //     suspended: accounts.filter((a) => a.status === 'Suspended').length,
  //     pending: accounts.filter((a) => a.status === 'Pending').length,
  //   }),
  //   [accounts],
  // );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">User Accounts</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage system access and roles for staff</p>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setShowAdd(true);
          }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
        >
          <Plus size={15} /> Create Account
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: 'Total Accounts',
            value: stats?.total,
            color: 'text-blue-400',
            bg: 'bg-blue-500/10 border-blue-500/20',
          },
          {
            label: 'Active',
            value: stats?.active,
            color: 'text-emerald-400',
            bg: 'bg-emerald-500/10 border-emerald-500/20',
          },
          {
            label: 'Suspended',
            value: stats?.suspended,
            color: 'text-red-400',
            bg: 'bg-red-500/10 border-red-500/20',
          },
          {
            label: 'Pending Setup',
            value: stats?.pending,
            color: 'text-amber-400',
            bg: 'bg-amber-500/10 border-amber-500/20',
          },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`${bg} border rounded-xl px-4 py-4`}>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <select
          value={limit}
          onChange={(e) => {
            setLimit(Number(e.target.value));
            resetPage();
          }}
          className="h-10 bg-[#161b27] border border-[#1e2536] rounded-lg px-3 py-2 text-sm text-slate-300 outline-none focus:border-blue-500 transition-colors"
        >
          {[5, 10, 20, 50, 100].map((n) => (
            <option key={n} value={n}>
              {n} per page
            </option>
          ))}
        </select>

        <div className="flex items-center gap-2 bg-[#161b27] border border-[#1e2536] rounded-lg px-3 py-2 max-w-80">
          <Search size={14} className="text-slate-500" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search accounts..."
            className="bg-transparent text-sm text-slate-300 placeholder:text-slate-600 outline-none flex-1"
          />
        </div>
      </div>

      <div className="bg-[#161b27] border border-[#1e2536] rounded-xl overflow-hidden">
        <TableScroll>
        <table className="w-full">
          <thead className="border-b border-[#1e2536] bg-[#0f1117]/50">
            <tr>
              {['Staff Member', 'Username', 'Role', 'Status', 'Presence', 'Last Login', 'Created', ''].map(
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
            {isLoading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-500 text-sm">
                  Loading accounts…
                </td>
              </tr>
            ) : accounts.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-500 text-sm">
                  No accounts found
                </td>
              </tr>
            ) : (
              accounts.map((acc) => (
                <tr
                  key={acc.id}
                  className="border-b border-[#1e2536] last:border-0 hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="uppercase w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/30 to-violet-500/30 border border-white/10 flex items-center justify-center text-xs font-bold text-white shrink-0">
                        {acc.staffName
                          .split(' ')
                          .map((n) => n[0])
                          .join('')}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-200 capitalize">
                          {acc.staffName}
                        </p>
                        <p className="text-xs text-slate-500">{acc.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-400 font-mono">{acc.username}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-medium ${roleColors[acc.role as Role] || 'bg-slate-500/15 text-slate-400'}`}
                    >
                      {acc.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1 w-fit ${statusStyle[acc.status]}`}
                    >
                      {acc.status === 'Active' ? (
                        <CheckCircle2 size={10} />
                      ) : acc.status === 'Suspended' ? (
                        <XCircle size={10} />
                      ) : null}
                      {acc.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1 w-fit ${
                        acc.isOnline
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-slate-500/15 text-slate-400'
                      }`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${
                          acc.isOnline ? 'bg-emerald-400' : 'bg-slate-500'
                        }`}
                      />
                      {acc.isOnline ? 'Online' : 'Offline'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                    {acc.lastLogin ?? 'Never'}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                    {acc.createdAt}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {canImpersonate && currentUser?.id !== acc.id && (
                        <button
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                          title="Impersonate"
                          onClick={async () => {
                            if (!confirm(`Impersonate ${acc.staffName}?`)) return;
                            const result = await impersonateAction(acc.id);
                            if (result.success) {
                              queryClient.removeQueries({ queryKey: ['dashboard'] });
                              setUser(result.user);
                              if (result.hotel) setHotel(result.hotel);
                              router.push('/dashboard');
                            } else {
                              alert(result.message);
                            }
                          }}
                        >
                          <LogIn size={13} />
                        </button>
                      )}
                      <button
                        className="p-1.5 rounded-lg text-slate-500 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                        title="Reset Password"
                        onClick={async () => {
                          const pw = prompt('Enter a temporary password');
                          if (!pw) return;
                          setEditing(acc);
                          await resetPassword.mutateAsync(pw);
                        }}
                      >
                        <Key size={13} />
                      </button>
                      <button
                        className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                        onClick={() => {
                          setEditing(acc);
                          setShowAdd(true);
                        }}
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        onClick={async () => {
                          if (!confirm('Disable this account?')) return;
                          await deleteAccount.mutateAsync(acc.id);
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </TableScroll>
        {data?.meta && accounts.length > 0 && (
          <Pagination meta={data.meta} currentPage={page} handlePageChange={setPage} />
        )}
      </div>

      {showAdd && (
        <AccountModal
          account={editing}
          onClose={() => {
            setShowAdd(false);
            setEditing(null);
          }}
          onSave={async (payload) => {
            try {
              if (editing) {
                await updateAccount.mutateAsync({
                  email: payload.email,
                  role: payload.role,
                  firstName: payload.firstName,
                  lastName: payload.lastName,
                  department: payload.department,
                  position: payload.position,
                  employeeCode: payload.employeeCode,
                });
              } else {
                await createAccount.mutateAsync({
                  email: payload.email,
                  password: payload.password ?? '',
                  role: payload.role,
                  firstName: payload.firstName,
                  lastName: payload.lastName,
                  department: payload.department,
                  position: payload.position,
                  employeeCode: payload.employeeCode,
                });
              }
              setShowAdd(false);
              setEditing(null);
            } catch {
              // handled by toast
            }
          }}
        />
      )}
    </div>
  );
}
