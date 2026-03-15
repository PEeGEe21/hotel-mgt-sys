'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Clock,
  CheckCircle2,
  AlertCircle,
  ClipboardList,
  UserCheck,
  Boxes,
  ArrowUpRight,
  Plus,
  Loader2,
} from 'lucide-react';
import {
  useHKStats,
  useHKTasks,
  useHKStaff,
  useMarkDone,
  type HKTask,
  type TaskStatus,
} from '@/hooks/useHousekeeping';
import NewTaskModal from './_components/NewTaskModal';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_STYLE: Record<TaskStatus, string> = {
  PENDING: 'bg-amber-500/15 text-amber-400',
  IN_PROGRESS: 'bg-blue-500/15  text-blue-400',
  DONE: 'bg-emerald-500/15 text-emerald-400',
  SKIPPED: 'bg-slate-500/15 text-slate-400',
};

const PRIORITY_STYLE: Record<string, string> = {
  LOW: 'bg-slate-500/15 text-slate-500',
  NORMAL: 'bg-slate-500/10 text-slate-400',
  HIGH: 'bg-orange-500/15 text-orange-400',
  URGENT: 'bg-red-500/15 text-red-400',
};

const toneMap: Record<string, string> = {
  blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/20 text-blue-400',
  amber: 'from-amber-500/20 to-amber-600/10 border-amber-500/20 text-amber-400',
  violet: 'from-violet-500/20 to-violet-600/10 border-violet-500/20 text-violet-400',
  red: 'from-red-500/20 to-red-600/10 border-red-500/20 text-red-400',
  emerald: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/20 text-emerald-400',
};

// ─── Task Row ─────────────────────────────────────────────────────────────────
function TaskRow({ task }: { task: HKTask }) {
  const router = useRouter();
  const markDone = useMarkDone(task.id);
  return (
    <div className="bg-[#0f1117] border border-[#1e2536] rounded-xl p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-700/40 to-slate-800/80 border border-[#1e2536] flex items-center justify-center text-white font-bold shrink-0">
          {task.room.number}
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-white capitalize">
              {task.type.toLowerCase().replace('_', ' ')}
            </p>
            <span
              className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${PRIORITY_STYLE[task.priority]}`}
            >
              {task.priority}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {task.room.floor?.name ?? `Room ${task.room.number}`}
            {task.dueBy &&
              ` · Due ${new Date(task.dueBy).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}`}
          </p>
          {task.staff && (
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-2">
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500/30 to-violet-500/30 border border-white/10 flex items-center justify-center text-[9px] font-bold text-white">
                {task.staff.firstName[0]}
                {task.staff.lastName[0]}
              </div>
              <UserCheck size={11} className="text-emerald-400" />
              {task.staff.firstName} {task.staff.lastName}
            </div>
          )}
          {!task.staff && <p className="text-xs text-slate-600 mt-1 italic">Unassigned</p>}
        </div>
      </div>
      <div className="flex items-center justify-between md:flex-col md:items-end gap-3">
        <span
          className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_STYLE[task.status]}`}
        >
          {task.status.replace('_', ' ')}
        </span>
        <div className="flex items-center gap-2">
          {task.status !== 'DONE' && (
            <button
              onClick={() => markDone.mutate()}
              disabled={markDone.isPending}
              className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
            >
              {markDone.isPending ? (
                <Loader2 size={11} className="animate-spin" />
              ) : (
                <CheckCircle2 size={11} />
              )}
              Done
            </button>
          )}
          <button
            onClick={() => router.push(`/housekeeping/tasks`)}
            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
          >
            Details <ArrowUpRight size={11} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function HousekeepingPage() {
  const [showNew, setShowNew] = useState(false);

  const { data: stats, isLoading: statsLoading } = useHKStats();
  const { data: tasksData, isLoading: tasksLoading } = useHKTasks({
    status: 'PENDING',
    limit: 10,
  });
  const { data: inProgressData } = useHKTasks({ status: 'IN_PROGRESS', limit: 5 });
  const { data: staff = [] } = useHKStaff();

  const priorityTasks = tasksData?.tasks ?? [];
  const inProgress = inProgressData?.tasks ?? [];
  const floors = stats?.floors ?? [];

  const kpis = [
    {
      label: 'To Clean',
      value: stats?.pending ?? '—',
      change: `${stats?.urgent ?? 0} urgent`,
      icon: Sparkles,
      tone: 'blue',
    },
    {
      label: 'In Progress',
      value: stats?.inProgress ?? '—',
      change: `${inProgress.length} active`,
      icon: Clock,
      tone: 'amber',
    },
    {
      label: 'Done Today',
      value: stats?.done ?? '—',
      change: `of ${stats?.total ?? 0} total`,
      icon: CheckCircle2,
      tone: 'emerald',
    },
    {
      label: 'Need Attention',
      value: stats?.urgent ?? 0,
      change: 'high priority',
      icon: AlertCircle,
      tone: 'red',
    },
  ];

  // Supply levels from room stats (approximation for display)
  const supplies = [
    {
      item: 'Rooms Ready',
      value: stats
        ? Math.round(
            ((stats.roomStats['AVAILABLE'] ?? 0) /
              Math.max(
                Object.values(stats.roomStats).reduce((a, b) => a + b, 0),
                1,
              )) *
              100,
          )
        : 0,
      tone: 'emerald',
    },
    {
      item: 'Rooms Dirty',
      value: stats
        ? Math.round(
            ((stats.roomStats['DIRTY'] ?? 0) /
              Math.max(
                Object.values(stats.roomStats).reduce((a, b) => a + b, 0),
                1,
              )) *
              100,
          )
        : 0,
      tone: 'amber',
    },
    {
      item: 'Tasks Done',
      value: stats ? Math.round(((stats.done ?? 0) / Math.max(stats.total ?? 1, 1)) * 100) : 0,
      tone: 'blue',
    },
    {
      item: 'Staff Active',
      value:
        staff.length > 0
          ? Math.round((staff.filter((s) => s.tasks.length > 0).length / staff.length) * 100)
          : 0,
      tone: 'violet',
    },
  ];

  const fillMap: Record<string, string> = {
    emerald: 'from-emerald-500 to-emerald-400',
    amber: 'from-amber-500 to-amber-400',
    blue: 'from-blue-500 to-blue-400',
    violet: 'from-violet-500 to-violet-400',
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Housekeeping</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Live workload, room status and team coverage for today.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span className="bg-[#161b27] border border-[#1e2536] px-3 py-2 rounded-lg flex items-center gap-2">
              <Clock size={12} />
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </span>
            <Link
              href="/housekeeping/tasks"
              className="bg-white/5 border border-[#1e2536] hover:border-slate-500 text-slate-200 px-3 py-2 rounded-lg transition-colors"
            >
              Manage Tasks
            </Link>
            <button
              onClick={() => setShowNew(true)}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded-lg transition-colors"
            >
              <Plus size={13} /> New Task
            </button>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {kpis.map(({ label, value, change, icon: Icon, tone }) => (
            <div key={label} className={`bg-gradient-to-br ${toneMap[tone]} border rounded-xl p-5`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-widest font-medium">
                    {label}
                  </p>
                  <p className="text-3xl font-bold text-white mt-1.5">
                    {statsLoading ? (
                      <Loader2 size={20} className="animate-spin text-slate-500" />
                    ) : (
                      value
                    )}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">{change}</p>
                </div>
                <Icon size={18} className="opacity-70" />
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* Left: Tasks + Floors */}
          <div className="xl:col-span-2 space-y-4">
            {/* Priority queue */}
            <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Sparkles size={14} /> Priority Queue
                </h2>
                <Link
                  href="/housekeeping/tasks"
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  View all →
                </Link>
              </div>
              {tasksLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 size={20} className="animate-spin text-slate-500" />
                </div>
              ) : priorityTasks.length > 0 ? (
                <div className="space-y-3">
                  {priorityTasks.map((t) => (
                    <TaskRow key={t.id} task={t} />
                  ))}
                </div>
              ) : (
                <div className="py-10 text-center">
                  <CheckCircle2 size={28} className="text-emerald-500/40 mx-auto mb-2" />
                  <p className="text-slate-500 text-sm">All caught up — no pending tasks</p>
                </div>
              )}
            </div>

            {/* Floor readiness */}
            <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-white">Floor Readiness</h2>
              </div>
              {floors.length > 0 ? (
                <div className="space-y-3">
                  {floors.map((floor) => (
                    <div
                      key={floor.id}
                      className="border border-[#1e2536] rounded-xl px-4 py-3 bg-[#0f1117]"
                    >
                      <div className="flex items-center justify-between text-sm text-white font-medium">
                        <span>{floor.name}</span>
                        <span className="text-xs text-slate-500">{floor.total} rooms</span>
                      </div>
                      <div className="mt-3 grid grid-cols-4 gap-2 text-xs">
                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-2 py-2 text-emerald-300 text-center">
                          <p className="text-slate-500 text-[10px] mb-1">Ready</p>
                          <p className="font-semibold">{floor.ready}</p>
                        </div>
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-2 py-2 text-amber-300 text-center">
                          <p className="text-slate-500 text-[10px] mb-1">Dirty</p>
                          <p className="font-semibold">{floor.dirty}</p>
                        </div>
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg px-2 py-2 text-blue-300 text-center">
                          <p className="text-slate-500 text-[10px] mb-1">Occupied</p>
                          <p className="font-semibold">{floor.occupied}</p>
                        </div>
                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-2 py-2 text-red-300 text-center">
                          <p className="text-slate-500 text-[10px] mb-1">Maint.</p>
                          <p className="font-semibold">{floor.maintenance}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-600 text-sm text-center py-6">No floor data</p>
              )}
            </div>
          </div>

          {/* Right: Room status, Team, Supply */}
          <div className="space-y-4">
            {/* Room status */}
            <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5">
              <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-400" /> Room Status
              </h2>
              <div className="grid grid-cols-2 gap-3 text-xs">
                {[
                  { label: 'Available', key: 'AVAILABLE', tone: 'emerald' },
                  { label: 'Occupied', key: 'OCCUPIED', tone: 'blue' },
                  { label: 'Dirty', key: 'DIRTY', tone: 'amber' },
                  { label: 'Maintenance', key: 'MAINTENANCE', tone: 'red' },
                ].map((item) => (
                  <div
                    key={item.label}
                    className={`bg-gradient-to-br ${toneMap[item.tone]} border rounded-xl p-3`}
                  >
                    <p className="text-xs text-slate-400">{item.label}</p>
                    <p className="text-lg font-semibold text-white mt-1">
                      {stats?.roomStats?.[item.key] ?? 0}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Team board */}
            <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5">
              <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <UserCheck size={14} /> Team Board
              </h2>
              {staff.length > 0 ? (
                <div className="space-y-3">
                  {staff.map((member) => {
                    const active = member.tasks.length;
                    return (
                      <div
                        key={member.id}
                        className="bg-[#0f1117] border border-[#1e2536] rounded-xl px-4 py-3"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-white">
                            {member.firstName} {member.lastName}
                          </p>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${active > 0 ? 'bg-blue-500/15 text-blue-400' : 'bg-emerald-500/15 text-emerald-400'}`}
                          >
                            {active > 0 ? `${active} active` : 'Available'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{member.position}</p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-slate-600 text-sm text-center py-4">
                  No housekeeping staff found
                </p>
              )}
            </div>

            {/* Supply tracker */}
            <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5">
              <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Boxes size={14} /> Shift Overview
              </h2>
              <div className="space-y-3">
                {supplies.map((s) => (
                  <div key={s.item}>
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>{s.item}</span>
                      <span className="text-slate-300 font-semibold">{s.value}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#0f1117] border border-[#1e2536] mt-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${fillMap[s.tone]}`}
                        style={{ width: `${s.value}%`, transition: 'width 0.5s ease' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <NewTaskModal isOpen={showNew} onClose={() => setShowNew(false)} />
    </>
  );
}
