'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  LayoutDashboard,
  Loader2,
  Save,
} from 'lucide-react';
import type { Role } from '@/lib/permissions';
import type { DashboardWidgetSize } from '@/types/dashboard';
import {
  DashboardAdminLayoutRow,
  useDashboardAdminLayouts,
  useUpdateDashboardAdminLayouts,
} from '@/hooks/dashboard/useDashboardAdminLayouts';

const roleLabels: Record<Role, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  RECEPTIONIST: 'Receptionist',
  HOUSEKEEPING: 'Housekeeping',
  CASHIER: 'Cashier',
  COOK: 'Cook',
  BARTENDER: 'Bartender',
  STAFF: 'Staff',
};

const sizeLabels: Record<DashboardWidgetSize, string> = {
  compact: 'Compact',
  wide: 'Wide',
  full: 'Full',
};

function reindexRows(rows: DashboardAdminLayoutRow[]) {
  return rows.map((row, index) => ({ ...row, position: index }));
}

export default function DashboardSettingsPage() {
  const router = useRouter();
  const { data, isLoading } = useDashboardAdminLayouts();
  const updateLayouts = useUpdateDashboardAdminLayouts();
  const [selectedRole, setSelectedRole] = useState<Role>('MANAGER');
  const [rowsByRole, setRowsByRole] = useState<Record<string, DashboardAdminLayoutRow[]>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!data) return;
    const grouped: Record<string, DashboardAdminLayoutRow[]> = {};
    data.roles.forEach((role) => {
      grouped[role] = reindexRows(
        [...data.rows.filter((row) => row.role === role)].sort((a, b) => a.position - b.position),
      );
    });
    setRowsByRole(grouped);
  }, [data]);

  const roles = data?.roles ?? [];
  const activeRows = rowsByRole[selectedRole] ?? [];

  const changedCount = useMemo(() => {
    if (!data) return 0;
    const original = new Map(
      data.rows.map((row) => [
        `${row.role}:${row.widgetId}`,
        `${row.position}:${row.enabled}:${row.sizeOverride ?? ''}`,
      ]),
    );

    return Object.values(rowsByRole)
      .flat()
      .filter((row) => {
        const key = `${row.role}:${row.widgetId}`;
        return original.get(key) !== `${row.position}:${row.enabled}:${row.sizeOverride ?? ''}`;
      }).length;
  }, [data, rowsByRole]);

  const updateRoleRows = (
    role: Role,
    updater: (rows: DashboardAdminLayoutRow[]) => DashboardAdminLayoutRow[],
  ) => {
    setRowsByRole((current) => ({
      ...current,
      [role]: reindexRows(updater(current[role] ?? [])),
    }));
    setSaved(false);
  };

  const moveRow = (index: number, direction: -1 | 1) => {
    updateRoleRows(selectedRole, (rows) => {
      const next = [...rows];
      const target = index + direction;
      if (target < 0 || target >= next.length) return next;
      const [row] = next.splice(index, 1);
      next.splice(target, 0, row);
      return next;
    });
  };

  const toggleRow = (widgetId: string) => {
    updateRoleRows(selectedRole, (rows) =>
      rows.map((row) => (row.widgetId === widgetId ? { ...row, enabled: !row.enabled } : row)),
    );
  };

  const setSize = (widgetId: string, sizeOverride: DashboardWidgetSize | null) => {
    updateRoleRows(selectedRole, (rows) =>
      rows.map((row) => (row.widgetId === widgetId ? { ...row, sizeOverride } : row)),
    );
  };

  const save = () => {
    const payload = Object.values(rowsByRole)
      .flat()
      .map((row) => ({
        role: row.role,
        widgetId: row.widgetId,
        position: row.position,
        enabled: row.enabled,
        sizeOverride: row.sizeOverride,
      }));

    updateLayouts.mutate(payload, {
      onSuccess: () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/settings')}
            className="w-9 h-9 rounded-lg bg-[#161b27] border border-[#1e2536] flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors"
            title="Back to settings"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Dashboard Layouts</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Configure widget visibility, order, and size by role
            </p>
          </div>
        </div>

        <button
          onClick={save}
          disabled={!changedCount || updateLayouts.isPending}
          className="h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-400 text-white text-sm font-semibold flex items-center gap-2 transition-colors"
        >
          {updateLayouts.isPending ? (
            <Loader2 size={14} className="animate-spin" />
          ) : saved ? (
            <Check size={14} />
          ) : (
            <Save size={14} />
          )}
          {saved ? 'Saved' : changedCount ? `Save ${changedCount}` : 'Saved'}
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[240px_minmax(0,1fr)] gap-4">
        <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-2 h-fit">
          {roles.map((role) => {
            const count = rowsByRole[role]?.filter((row) => row.enabled).length ?? 0;
            const active = selectedRole === role;
            return (
              <button
                key={role}
                onClick={() => setSelectedRole(role)}
                className={`w-full px-3 py-2.5 rounded-lg text-left transition-colors flex items-center justify-between gap-3 ${
                  active
                    ? 'bg-blue-600/15 text-blue-300'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
                }`}
              >
                <span className="text-sm font-medium">{roleLabels[role]}</span>
                <span className="text-xs text-slate-500">{count}</span>
              </button>
            );
          })}
        </div>

        <div className="bg-[#161b27] border border-[#1e2536] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[#1e2536] flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 min-w-0">
              <LayoutDashboard size={16} className="text-blue-400 shrink-0" />
              <h2 className="text-sm font-semibold text-slate-200 truncate">
                {roleLabels[selectedRole]} dashboard
              </h2>
            </div>
            <p className="text-xs text-slate-500">{activeRows.length} widgets configured</p>
          </div>

          {isLoading ? (
            <div className="p-6 text-sm text-slate-500 flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" /> Loading dashboard layouts...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px]">
                <thead className="bg-[#0f1117]/70 border-b border-[#1e2536]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      Widget
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      Size
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-slate-500">
                      Visible
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                      Order
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {activeRows.map((row, index) => (
                    <tr
                      key={row.widgetId}
                      className="border-b border-[#1e2536] last:border-0 hover:bg-white/[0.01]"
                    >
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-slate-200">{row.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {row.permissionKey}
                          {row.featureFlag ? ` • ${row.featureFlag}` : ''}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={row.sizeOverride ?? ''}
                          onChange={(event) =>
                            setSize(
                              row.widgetId,
                              event.target.value
                                ? (event.target.value as DashboardWidgetSize)
                                : null,
                            )
                          }
                          className="h-9 min-w-36 rounded-lg bg-[#0f1117] border border-[#1e2536] text-sm text-slate-300 px-3 outline-none focus:border-blue-500"
                        >
                          <option value="">Default: {sizeLabels[row.defaultSize]}</option>
                          {row.allowedSizes.map((size) => (
                            <option key={size} value={size}>
                              {sizeLabels[size]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => toggleRow(row.widgetId)}
                          className={`mx-auto w-9 h-6 rounded-full border transition-colors p-0.5 ${
                            row.enabled
                              ? 'bg-blue-600/30 border-blue-500/40'
                              : 'bg-[#0f1117] border-[#1e2536]'
                          }`}
                          title={row.enabled ? 'Hide widget' : 'Show widget'}
                        >
                          <span
                            className={`block w-4 h-4 rounded-full transition-transform ${
                              row.enabled
                                ? 'translate-x-3 bg-blue-300'
                                : 'translate-x-0 bg-slate-600'
                            }`}
                          />
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => moveRow(index, -1)}
                            disabled={index === 0}
                            className="w-8 h-8 rounded-lg border border-[#1e2536] text-slate-400 hover:text-slate-200 hover:border-slate-500 disabled:opacity-30 disabled:hover:border-[#1e2536] flex items-center justify-center"
                            title="Move up"
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button
                            onClick={() => moveRow(index, 1)}
                            disabled={index === activeRows.length - 1}
                            className="w-8 h-8 rounded-lg border border-[#1e2536] text-slate-400 hover:text-slate-200 hover:border-slate-500 disabled:opacity-30 disabled:hover:border-[#1e2536] flex items-center justify-center"
                            title="Move down"
                          >
                            <ArrowDown size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
