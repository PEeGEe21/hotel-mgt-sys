'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Shield, Check, X, Info, RefreshCw } from 'lucide-react';
import { ROLE_PERMISSIONS, PERMISSION_GROUPS, type Role, type Permission } from '@/lib/permissions';
import {
  useBackfillRolePermissions,
  useRolePermissions,
  useUpdateRolePermissions,
} from '@/hooks/useRolePermissions';

const roles: { key: Role; label: string; locked?: boolean }[] = [
  { key: 'SUPER_ADMIN', label: 'Super Admin', locked: true },
  { key: 'ADMIN', label: 'Admin', locked: true },
  { key: 'MANAGER', label: 'Manager' },
  { key: 'RECEPTIONIST', label: 'Receptionist' },
  { key: 'HOUSEKEEPING', label: 'Housekeeping' },
  { key: 'CASHIER', label: 'Cashier' },
  { key: 'BARTENDER', label: 'Bartender' },
  { key: 'STAFF', label: 'Staff' },
];

const roleColors: Record<Role, string> = {
  SUPER_ADMIN: 'text-violet-400',
  ADMIN: 'text-blue-400',
  MANAGER: 'text-sky-400',
  RECEPTIONIST: 'text-emerald-400',
  HOUSEKEEPING: 'text-amber-400',
  CASHIER: 'text-orange-400',
  BARTENDER: 'text-pink-400',
  STAFF: 'text-slate-400',
};

export default function RolesPage() {
  const router = useRouter();
  const { data, isLoading } = useRolePermissions();
  const updateRoles = useUpdateRolePermissions();
  const backfillRoles = useBackfillRolePermissions();
  const [matrix, setMatrix] = useState<Record<Role, Permission[]>>({ ...ROLE_PERMISSIONS });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!data) return;
    const next: Record<Role, Permission[]> = { ...ROLE_PERMISSIONS };
    data.forEach((r) => {
      next[r.role] = r.permissions;
    });
    setMatrix(next);
  }, [data]);

  const toggle = (role: Role, perm: Permission) => {
    const locked = roles.find((r) => r.key === role)?.locked;
    if (locked) return;
    setMatrix((m) => {
      const current = m[role];
      const has = current.includes(perm);
      return { ...m, [role]: has ? current.filter((p) => p !== perm) : [...current, perm] };
    });
    setSaved(false);
  };

  const has = (role: Role, perm: Permission) => matrix[role].includes(perm);

  const handleSave = () => {
    const payload = roles
      .filter((r) => !r.locked)
      .map((r) => ({ role: r.key, permissions: matrix[r.key] }));

    updateRoles.mutate(payload, {
      onSuccess: () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/settings')}
            className="w-9 h-9 rounded-lg bg-[#161b27] border border-[#1e2536] flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Roles & Permissions</h1>
            <p className="text-slate-500 text-sm mt-0.5">Control access for each role</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => backfillRoles.mutate()}
            disabled={backfillRoles.isPending || updateRoles.isPending}
            className="flex items-center gap-2 rounded-lg border border-[#29406f] bg-[#17233b] px-4 py-2 text-sm font-semibold text-slate-100 transition-colors hover:bg-[#1d2d4a] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {backfillRoles.isPending ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <RefreshCw size={14} />
            )}
            Backfill Defaults
          </button>
          <button
            onClick={handleSave}
            disabled={updateRoles.isPending || backfillRoles.isPending}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${saved ? 'bg-emerald-600 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'} disabled:cursor-not-allowed disabled:opacity-60`}
          >
            {updateRoles.isPending ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : saved ? (
              <>
                <Check size={14} /> Saved!
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>

      {/* Locked roles notice */}
      <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
        <Info size={15} className="text-amber-400 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-300">
          <span className="font-semibold">Super Admin</span> and{' '}
          <span className="font-semibold">Admin</span> roles are locked — they always have full
          access and cannot be restricted.
        </p>
      </div>

      <div className="flex items-start gap-3 bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-3">
        <Info size={15} className="text-blue-400 shrink-0 mt-0.5" />
        <p className="text-sm text-blue-300">
          These are baseline permissions per role. You can still grant or deny specific users in
          HR → Permissions.
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-[#29406f] bg-[#17233b] px-4 py-3">
        <Info size={15} className="mt-0.5 shrink-0 text-sky-300" />
        <p className="text-sm text-sky-100">
          <span className="font-semibold">Backfill Defaults</span> repairs stored role rows by
          adding any missing baseline permissions from code. It will not remove custom permissions,
          but it can restore missing defaults for locked roles like Super Admin and Admin.
        </p>
      </div>

      {/* Matrix table */}
      <div className="bg-[#161b27] border border-[#1e2536] rounded-xl overflow-x-auto max-h-[70vh]">
        {isLoading && (
          <div className="px-5 py-3 text-sm text-slate-500">Loading role permissions...</div>
        )}
        <table className="w-full min-w-[900px]">
          <thead className="border-b border-[#1e2536] bg-[#0f1117]/95 sticky top-0 z-10 backdrop-blur">
            <tr>
              <th className="text-xs text-slate-500 uppercase tracking-wider font-medium px-5 py-4 text-left w-48 sticky top-0 bg-[#0f1117]/95">
                Permission
              </th>
              {roles.map((r) => (
                <th
                  key={r.key}
                  className="text-xs font-semibold px-3 py-4 text-center min-w-[90px] sticky top-0 bg-[#0f1117]/95"
                >
                  <div className="flex flex-col items-center gap-1">
                    <Shield size={13} className={roleColors[r.key]} />
                    <span className={`${roleColors[r.key]}`}>{r.label}</span>
                    {r.locked && (
                      <span className="text-[9px] text-slate-600 uppercase tracking-wider">
                        locked
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSION_GROUPS.map((group) => (
              <Fragment key={group.key}>
                {/* Group header */}
                <tr
                  key={`group-${group.label}`}
                  className="border-b border-[#1e2536] bg-[#0f1117]/30"
                >
                  <td colSpan={roles.length + 1} className="px-5 py-2">
                    <span className="text-xs text-slate-500 uppercase tracking-widest font-semibold">
                      {group.label}
                    </span>
                  </td>
                </tr>
                {/* Permission rows */}
                {group.permissions.map(({ key, label }) => (
                  <tr
                    key={key}
                    className="border-b border-[#1e2536] last:border-0 hover:bg-white/[0.01] transition-colors"
                  >
                    <td className="px-5 py-3 text-sm text-slate-400">{label}</td>
                    {roles.map((r) => {
                      const active = has(r.key, key);
                      const locked = r.locked;
                      return (
                        <td key={r.key} className="px-3 py-3 text-center">
                          <button
                            onClick={() => toggle(r.key, key)}
                            disabled={locked}
                            className={`w-7 h-7 rounded-lg border flex items-center justify-center mx-auto transition-all ${
                              active
                                ? locked
                                  ? 'bg-blue-600/30 border-blue-500/30 text-blue-400 cursor-not-allowed'
                                  : 'bg-blue-600/20 border-blue-500/30 text-blue-400 hover:bg-blue-600/30'
                                : locked
                                  ? 'bg-transparent border-transparent cursor-not-allowed'
                                  : 'bg-transparent border-[#1e2536] text-slate-700 hover:border-slate-500'
                            }`}
                          >
                            {active ? (
                              <Check size={13} />
                            ) : locked ? null : (
                              <X size={11} className="opacity-30" />
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
