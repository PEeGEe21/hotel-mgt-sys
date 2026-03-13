'use client';

import { useState, useMemo } from 'react';
import {
  Shield,
  Search,
  ChevronRight,
  ChevronDown,
  Check,
  X,
  Minus,
  Info,
  Save,
  RotateCcw,
  Users,
  AlertTriangle,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import {
  ROLE_PERMISSIONS,
  PERMISSION_GROUPS,
  resolvePermissions,
  type Role,
  type Permission,
} from '@/lib/permissions';

// ─── Types ────────────────────────────────────────────────────────────────────

type OverrideState = 'granted' | 'denied' | 'default';

type StaffUser = {
  id: string;
  name: string;
  role: Role;
  department: string;
  position: string;
  email: string;
  grants: Permission[];
  denies: Permission[];
};

// ─── Seed users ───────────────────────────────────────────────────────────────

const staffUsers: StaffUser[] = [
  {
    id: 'u1',
    name: 'Blessing Adeyemi',
    role: 'MANAGER',
    department: 'Management',
    position: 'Hotel Manager',
    email: 'blessing.a@hotel.com',
    grants: [],
    denies: [],
  },
  {
    id: 'u2',
    name: 'Chidi Nwosu',
    role: 'RECEPTIONIST',
    department: 'Front Desk',
    position: 'Head Receptionist',
    email: 'chidi.n@hotel.com',
    grants: ['delete:guests', 'discount:pos'],
    denies: [],
  },
  {
    id: 'u3',
    name: 'Ngozi Eze',
    role: 'RECEPTIONIST',
    department: 'Front Desk',
    position: 'Receptionist',
    email: 'ngozi.e@hotel.com',
    grants: [],
    denies: ['create:guests', 'checkout:reservations'],
  },
  {
    id: 'u4',
    name: 'Emeka Obi',
    role: 'HOUSEKEEPING',
    department: 'Housekeeping',
    position: 'Head Housekeeper',
    email: 'emeka.o@hotel.com',
    grants: ['view:inventory'],
    denies: [],
  },
  {
    id: 'u5',
    name: 'Tunde Bakare',
    role: 'BARTENDER',
    department: 'Bar',
    position: 'Head Bartender',
    email: 'tunde.b@hotel.com',
    grants: ['void:pos', 'discount:pos'],
    denies: [],
  },
  {
    id: 'u6',
    name: 'Kemi Adebayo',
    role: 'CASHIER',
    department: 'Finance',
    position: 'Cashier',
    email: 'kemi.a@hotel.com',
    grants: [],
    denies: ['void:pos'],
  },
  {
    id: 'u7',
    name: 'Adaeze Okafor',
    role: 'HOUSEKEEPING',
    department: 'Housekeeping',
    position: 'Housekeeper',
    email: 'adaeze.o@hotel.com',
    grants: [],
    denies: [],
  },
  {
    id: 'u8',
    name: 'Yetunde Aina',
    role: 'STAFF',
    department: 'Maintenance',
    position: 'Maintenance Tech',
    email: 'yetunde.a@hotel.com',
    grants: ['view:facilities'],
    denies: [],
  },
];

const ROLE_COLORS: Record<Role, string> = {
  SUPER_ADMIN: 'text-red-400 bg-red-500/15 border-red-500/30',
  ADMIN: 'text-violet-400 bg-violet-500/15 border-violet-500/30',
  MANAGER: 'text-blue-400 bg-blue-500/15 border-blue-500/30',
  RECEPTIONIST: 'text-sky-400 bg-sky-500/15 border-sky-500/30',
  HOUSEKEEPING: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
  CASHIER: 'text-amber-400 bg-amber-500/15 border-amber-500/30',
  BARTENDER: 'text-orange-400 bg-orange-500/15 border-orange-500/30',
  STAFF: 'text-slate-400 bg-slate-500/15 border-slate-500/30',
};

// ─── Override pill ─────────────────────────────────────────────────────────────
function OverridePill({ count, type }: { count: number; type: 'grant' | 'deny' }) {
  if (count === 0) return null;
  return (
    <span
      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${type === 'grant' ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'bg-red-500/15 border-red-500/30 text-red-400'}`}
    >
      {type === 'grant' ? '+' : '-'}
      {count}
    </span>
  );
}

// ─── 3-state toggle ───────────────────────────────────────────────────────────
// default (from role) | granted (override +) | denied (override -)
function PermToggle({
  state,
  fromRole,
  onChange,
  locked,
}: {
  state: OverrideState;
  fromRole: boolean;
  onChange: (s: OverrideState) => void;
  locked?: boolean;
}) {
  if (locked) {
    return (
      <div className="flex items-center justify-center w-full">
        <div className="flex items-center gap-1 text-xs text-slate-600">
          <Lock size={10} /> Always on
        </div>
      </div>
    );
  }

  // Cycle: default → granted → denied → default
  const cycle = () => {
    if (state === 'default') onChange('granted');
    else if (state === 'granted') onChange('denied');
    else onChange('default');
  };

  const effective = state === 'default' ? fromRole : state === 'granted';

  return (
    <button
      onClick={cycle}
      className={`group relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all w-full justify-center ${
        state === 'granted'
          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
          : state === 'denied'
            ? 'bg-red-500/20 border-red-500/40 text-red-300'
            : effective
              ? 'bg-slate-500/10 border-slate-500/20 text-slate-400'
              : 'bg-[#0f1117] border-[#1e2536] text-slate-700'
      }`}
      title={
        state === 'granted'
          ? 'Override: Granted (click to deny)'
          : state === 'denied'
            ? 'Override: Denied (click to reset)'
            : effective
              ? 'From role (click to grant override)'
              : 'Not permitted (click to grant override)'
      }
    >
      {state === 'granted' ? (
        <>
          <Check size={11} className="text-emerald-400" /> Grant
        </>
      ) : state === 'denied' ? (
        <>
          <X size={11} className="text-red-400" /> Deny
        </>
      ) : effective ? (
        <>
          <Minus size={11} /> Role
        </>
      ) : (
        <>
          <X size={11} className="opacity-40" /> None
        </>
      )}
    </button>
  );
}

// ─── Permission editor panel ──────────────────────────────────────────────────
function PermissionEditor({
  user,
  onSave,
  onClose,
}: {
  user: StaffUser;
  onSave: (id: string, grants: Permission[], denies: Permission[]) => void;
  onClose: () => void;
}) {
  const [grants, setGrants] = useState<Permission[]>(user.grants);
  const [denies, setDenies] = useState<Permission[]>(user.denies);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    rooms: true,
    reservations: true,
    guests: true,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const rolePerms = new Set(ROLE_PERMISSIONS[user.role] ?? []);

  const getState = (p: Permission): OverrideState => {
    if (grants.includes(p)) return 'granted';
    if (denies.includes(p)) return 'denied';
    return 'default';
  };

  const setState = (p: Permission, s: OverrideState) => {
    setGrants((g) => g.filter((x) => x !== p));
    setDenies((d) => d.filter((x) => x !== p));
    if (s === 'granted') setGrants((g) => [...g, p]);
    if (s === 'denied') setDenies((d) => [...d, p]);
    setSaved(false);
  };

  const resetAll = () => {
    setGrants([]);
    setDenies([]);
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 500));
    onSave(user.id, grants, denies);
    setSaving(false);
    setSaved(true);
  };

  const effective = resolvePermissions(user.role, { grants, denies });
  const totalOverrides = grants.length + denies.length;

  // Always-on permissions (SUPER_ADMIN can't be restricted)
  const isLocked = user.role === 'SUPER_ADMIN';

  return (
    <div className="flex flex-col h-full">
      {/* User header */}
      <div className="flex items-center gap-4 px-6 py-5 border-b border-[#1e2536]">
        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500/30 to-violet-500/30 border border-white/10 flex items-center justify-center text-base font-bold text-white shrink-0">
          {user.name
            .split(' ')
            .map((n) => n[0])
            .join('')}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white">{user.name}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <p className="text-xs text-slate-500">{user.position}</p>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${ROLE_COLORS[user.role]}`}
            >
              {user.role}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-slate-300 transition-colors shrink-0"
        >
          <X size={18} />
        </button>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-6 py-2.5 bg-[#0f1117]/40 border-b border-[#1e2536]">
        <p className="text-[10px] text-slate-600 uppercase tracking-wider font-medium">Legend</p>
        {[
          { label: 'From role', cls: 'bg-slate-500/10 border-slate-500/20 text-slate-400' },
          {
            label: 'Grant override',
            cls: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
          },
          { label: 'Deny override', cls: 'bg-red-500/20 border-red-500/40 text-red-300' },
        ].map(({ label, cls }) => (
          <span
            key={label}
            className={`text-[10px] px-2 py-0.5 rounded-md border font-medium ${cls}`}
          >
            {label}
          </span>
        ))}
        <span className="text-[10px] text-slate-600 ml-auto">
          Click to cycle · {totalOverrides} override{totalOverrides !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Permission groups */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
        {PERMISSION_GROUPS.map((group) => {
          const open = openGroups[group.key] !== false;
          const groupGrants = group.permissions.filter((p) => grants.includes(p.key)).length;
          const groupDenies = group.permissions.filter((p) => denies.includes(p.key)).length;

          return (
            <div
              key={group.key}
              className="bg-[#0f1117] border border-[#1e2536] rounded-xl overflow-hidden"
            >
              <button
                onClick={() => setOpenGroups((o) => ({ ...o, [group.key]: !open }))}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors"
              >
                <ChevronDown
                  size={14}
                  className={`text-slate-500 transition-transform ${open ? '' : '-rotate-90'}`}
                />
                <span className="text-sm font-semibold text-slate-200 flex-1 text-left">
                  {group.label}
                </span>
                <div className="flex items-center gap-1.5">
                  <OverridePill count={groupGrants} type="grant" />
                  <OverridePill count={groupDenies} type="deny" />
                </div>
              </button>

              {open && (
                <div className="border-t border-[#1e2536]">
                  {/* Column headers */}
                  <div className="grid grid-cols-[1fr_100px_100px] gap-2 px-4 py-2 border-b border-[#1e2536]">
                    <span className="text-[10px] text-slate-600 uppercase tracking-wider">
                      Permission
                    </span>
                    <span className="text-[10px] text-slate-600 uppercase tracking-wider text-center">
                      Role Default
                    </span>
                    <span className="text-[10px] text-slate-600 uppercase tracking-wider text-center">
                      This User
                    </span>
                  </div>
                  {group.permissions.map(({ key: pKey, label, description }) => {
                    const fromRole = rolePerms.has(pKey);
                    const state = getState(pKey);
                    const effectiveHas = effective.includes(pKey);

                    return (
                      <div
                        key={pKey}
                        className={`grid grid-cols-[1fr_100px_100px] items-center gap-2 px-4 py-2.5 border-b border-[#1e2536]/50 last:border-0 hover:bg-white/[0.01] transition-colors`}
                      >
                        <div>
                          <p
                            className={`text-sm font-medium ${effectiveHas ? 'text-slate-200' : 'text-slate-600'}`}
                          >
                            {label}
                          </p>
                          <p className="text-xs text-slate-600 mt-0.5">{description}</p>
                        </div>
                        {/* Role default indicator */}
                        <div className="flex justify-center">
                          {fromRole ? (
                            <span className="flex items-center gap-1 text-xs text-slate-500">
                              <CheckCircle2 size={12} className="text-slate-600" /> Yes
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs text-slate-700">
                              <X size={12} /> No
                            </span>
                          )}
                        </div>
                        {/* User override */}
                        <PermToggle
                          state={state}
                          fromRole={fromRole}
                          onChange={(s) => setState(pKey, s)}
                          locked={isLocked}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-[#1e2536] flex items-center gap-3">
        <div className="flex items-center gap-3 text-xs text-slate-500 flex-1">
          <span className="flex items-center gap-1 text-emerald-400">
            <Check size={11} /> {effective.length} effective permissions
          </span>
          {totalOverrides > 0 && (
            <span className="text-slate-500">
              {grants.length} grants, {denies.length} denials
            </span>
          )}
        </div>
        {totalOverrides > 0 && (
          <button
            onClick={resetAll}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 bg-white/5 hover:bg-white/10 px-3 py-2 rounded-lg font-medium transition-colors"
          >
            <RotateCcw size={12} /> Reset all
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${saved ? 'bg-emerald-600 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'} disabled:opacity-70`}
        >
          {saving ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : saved ? (
            <>
              <CheckCircle2 size={14} /> Saved
            </>
          ) : (
            <>
              <Save size={14} /> Save Changes
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function UserPermissionsPage() {
  const [users, setUsers] = useState<StaffUser[]>(staffUsers);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<Role | 'ALL'>('ALL');
  const [selected, setSelected] = useState<StaffUser | null>(null);

  const roles = [...new Set(users.map((u) => u.role))] as Role[];

  const filtered = useMemo(
    () =>
      users.filter((u) => {
        const ms = `${u.name} ${u.email} ${u.department}`
          .toLowerCase()
          .includes(search.toLowerCase());
        const mr = roleFilter === 'ALL' || u.role === roleFilter;
        return ms && mr;
      }),
    [users, search, roleFilter],
  );

  const handleSave = (id: string, grants: Permission[], denies: Permission[]) => {
    setUsers((us) => us.map((u) => (u.id === id ? { ...u, grants, denies } : u)));
    setSelected((u) => (u?.id === id ? { ...u, grants, denies } : u));
  };

  return (
    <div className="flex gap-0 h-[calc(100vh-64px)] -m-6">
      {/* Left — user list */}
      <div
        className={`flex flex-col border-r border-[#1e2536] transition-all ${selected ? 'w-80 shrink-0' : 'flex-1'}`}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#1e2536]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">User Permissions</h1>
              <p className="text-slate-500 text-xs mt-0.5">
                {users.length} users · per-user overrides
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2">
              <Search size={13} className="text-slate-500 shrink-0" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search users..."
                className="bg-transparent text-sm text-slate-300 placeholder:text-slate-600 outline-none flex-1"
              />
            </div>
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => setRoleFilter('ALL')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-all ${roleFilter === 'ALL' ? 'bg-blue-600/20 border-blue-500/30 text-blue-400' : 'bg-[#0f1117] border-[#1e2536] text-slate-500 hover:text-slate-300'}`}
              >
                All
              </button>
              {roles.map((r) => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-all ${roleFilter === r ? `${ROLE_COLORS[r]}` : 'bg-[#0f1117] border-[#1e2536] text-slate-500 hover:text-slate-300'}`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Info callout */}
        <div className="mx-4 my-3 bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2.5 flex items-start gap-2">
          <Info size={13} className="text-blue-400 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-300/80">
            Role sets the baseline. Select a user to add grants or denials on top.
          </p>
        </div>

        {/* User list */}
        <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1">
          {filtered.map((u) => {
            const isSelected = selected?.id === u.id;
            const totalOverrides = u.grants.length + u.denies.length;
            return (
              <button
                key={u.id}
                onClick={() => setSelected(isSelected ? null : u)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl border text-left transition-all ${isSelected ? 'bg-blue-600/15 border-blue-500/30' : 'bg-[#0f1117] border-[#1e2536] hover:border-slate-600 hover:bg-white/[0.02]'}`}
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500/20 to-violet-500/20 border border-white/10 flex items-center justify-center text-xs font-bold text-white shrink-0">
                  {u.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-slate-200 truncate">{u.name}</p>
                    {totalOverrides > 0 && (
                      <div className="flex gap-1 shrink-0">
                        <OverridePill count={u.grants.length} type="grant" />
                        <OverridePill count={u.denies.length} type="deny" />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full border font-semibold ${ROLE_COLORS[u.role]}`}
                    >
                      {u.role}
                    </span>
                    <span className="text-xs text-slate-600 truncate">{u.position}</span>
                  </div>
                </div>
                <ChevronRight
                  size={14}
                  className={`shrink-0 transition-colors ${isSelected ? 'text-blue-400' : 'text-slate-600'}`}
                />
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="py-12 text-center">
              <Users size={28} className="text-slate-700 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">No users found</p>
            </div>
          )}
        </div>
      </div>

      {/* Right — permission editor */}
      {selected ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          <PermissionEditor
            key={selected.id}
            user={selected}
            onSave={handleSave}
            onClose={() => setSelected(null)}
          />
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#161b27] border border-[#1e2536] flex items-center justify-center mx-auto mb-4">
              <Shield size={28} className="text-slate-600" />
            </div>
            <p className="text-slate-400 font-medium">Select a user</p>
            <p className="text-slate-600 text-sm mt-1">to view and edit their permissions</p>
          </div>
        </div>
      )}
    </div>
  );
}
