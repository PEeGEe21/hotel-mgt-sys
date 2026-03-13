'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Shield, Check, X, Info } from 'lucide-react';
import { ROLE_PERMISSIONS, type Role, type Permission } from '@/lib/permissions';

// Group permissions for display
const permissionGroups: { label: string; perms: { key: Permission; label: string }[] }[] = [
  {
    label: 'Dashboard',
    perms: [{ key: 'view:dashboard', label: 'View Dashboard' }],
  },
  {
    label: 'Rooms',
    perms: [
      { key: 'view:rooms', label: 'View Rooms' },
      { key: 'manage:rooms', label: 'Manage Rooms' },
    ],
  },
  {
    label: 'Reservations',
    perms: [
      { key: 'view:reservations', label: 'View Reservations' },
      { key: 'manage:reservations', label: 'Manage Reservations' },
    ],
  },
  {
    label: 'Guests',
    perms: [
      { key: 'view:guests', label: 'View Guests' },
      { key: 'manage:guests', label: 'Manage Guests' },
    ],
  },
  {
    label: 'Staff',
    perms: [
      { key: 'view:staff', label: 'View Staff' },
      { key: 'manage:staff', label: 'Manage Staff' },
    ],
  },
  {
    label: 'Attendance',
    perms: [
      { key: 'view:attendance', label: 'View All Attendance' },
      { key: 'manage:attendance', label: 'Manage Attendance' },
      { key: 'clock:self', label: 'Clock In/Out (Self)' },
    ],
  },
  {
    label: 'POS / Store',
    perms: [
      { key: 'view:pos', label: 'View POS' },
      { key: 'manage:pos', label: 'Manage POS' },
    ],
  },
  {
    label: 'Inventory',
    perms: [
      { key: 'view:inventory', label: 'View Inventory' },
      { key: 'manage:inventory', label: 'Manage Inventory' },
    ],
  },
  {
    label: 'Housekeeping',
    perms: [
      { key: 'view:housekeeping', label: 'View Housekeeping' },
      { key: 'manage:housekeeping', label: 'Manage Housekeeping' },
    ],
  },
  {
    label: 'Finance',
    perms: [
      { key: 'view:finance', label: 'View Finance' },
      { key: 'manage:finance', label: 'Manage Finance' },
    ],
  },
  {
    label: 'Reports',
    perms: [{ key: 'view:reports', label: 'View Reports' }],
  },
  {
    label: 'Facilities',
    perms: [
      { key: 'view:facilities', label: 'View Facilities' },
      { key: 'manage:facilities', label: 'Manage Facilities' },
    ],
  },
  {
    label: 'Settings',
    perms: [
      { key: 'view:settings', label: 'View Settings' },
      { key: 'manage:settings', label: 'Manage Settings' },
    ],
  },
];

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
  const [matrix, setMatrix] = useState<Record<Role, Permission[]>>({ ...ROLE_PERMISSIONS });
  const [saved, setSaved] = useState(false);

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
    // In production: POST to /api/v1/settings/permissions
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
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
        <button
          onClick={handleSave}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${saved ? 'bg-emerald-600 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
        >
          {saved ? (
            <>
              <Check size={14} /> Saved!
            </>
          ) : (
            'Save Changes'
          )}
        </button>
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

      {/* Matrix table */}
      <div className="bg-[#161b27] border border-[#1e2536] rounded-xl overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead className="border-b border-[#1e2536] bg-[#0f1117]/50">
            <tr>
              <th className="text-xs text-slate-500 uppercase tracking-wider font-medium px-5 py-4 text-left w-48">
                Permission
              </th>
              {roles.map((r) => (
                <th
                  key={r.key}
                  className="text-xs font-semibold px-3 py-4 text-center min-w-[90px]"
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
            {permissionGroups.map((group) => (
              <>
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
                {group.perms.map(({ key, label }) => (
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
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
