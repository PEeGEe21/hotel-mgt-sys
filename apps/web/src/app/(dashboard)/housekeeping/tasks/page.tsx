'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  Sparkles,
  LayoutGrid,
  Columns3,
  Plus,
  Search,
  ChevronDown,
  Clock,
  Flag,
  X,
  Save,
  Loader2,
  UserCheck,
  CheckCircle2,
  ArrowLeft,
} from 'lucide-react';
import {
  useHKTasks,
  useHKStaff,
  useUpdateTask,
  useMarkDone,
  useAssignTask,
  type HKTask,
  type TaskStatus,
  type TaskPriority,
} from '@/hooks/useHousekeeping';
import { useFloors } from '@/hooks/useFloors';
import { useDebounce } from '@/hooks/useDebounce';
import NewTaskModal from '../_components/NewTaskModal';
import { useRouter, useSearchParams } from 'next/navigation';
import TaskCard from '../_components/TaskCard';
import { KANBAN_COLS, STATUS_CONFIG } from '@/lib/housekeeping-data';
import TaskDrawer from '../_components/TaskDrawer';

// ─── Room Grid Card ───────────────────────────────────────────────────────────
function RoomGridCard({
  roomNumber,
  tasks,
  onClick,
}: {
  roomNumber: string;
  tasks: HKTask[];
  onClick: () => void;
}) {
  const blocked = tasks.some((t) => t.status === 'SKIPPED');
  const allDone = tasks.length > 0 && tasks.every((t) => t.status === 'DONE');
  const inProgress = tasks.some((t) => t.status === 'IN_PROGRESS');
  const bg = blocked
    ? 'border-red-500/40 bg-red-500/5'
    : allDone
      ? 'border-emerald-500/30 bg-emerald-500/5'
      : inProgress
        ? 'border-blue-500/30 bg-blue-500/5'
        : 'border-[#1e2536] bg-[#161b27]';
  const dot = blocked
    ? 'bg-red-400'
    : allDone
      ? 'bg-emerald-400'
      : inProgress
        ? 'bg-blue-400 animate-pulse'
        : 'bg-amber-400';

  return (
    <button
      onClick={onClick}
      className={`border rounded-xl p-3 text-left hover:brightness-110 transition-all ${bg}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-bold text-white">Rm {roomNumber}</span>
        <span className={`w-2 h-2 rounded-full ${dot}`} />
      </div>
      <p className="text-[10px] text-slate-500">
        {tasks.length} task{tasks.length !== 1 ? 's' : ''}
      </p>
      {tasks.some((t) => t.priority === 'URGENT') && (
        <p className="text-[10px] text-red-400 font-semibold mt-1 flex items-center gap-1">
          <Flag size={8} />
          Urgent
        </p>
      )}
      {allDone && tasks.length > 0 && <p className="text-[10px] text-emerald-400 mt-1">✓ Clear</p>}
    </button>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function HousekeepingTasksPage() {
  const [view, setView] = useState<'kanban' | 'grid'>('kanban');
  const [search, setSearch] = useState('');
  const [floorFilter, setFloorFilter] = useState('');
  const [staffFilter, setStaffFilter] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState<HKTask | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const debouncedSearch = useDebounce(search, 300);
  const taskId = searchParams.get('taskId');
  const { data: floors = [] } = useFloors();
  const { data: staff = [] } = useHKStaff();

  const { data: tasksData, isLoading } = useHKTasks({
    search: debouncedSearch || undefined,
    floorId: floorFilter || undefined,
    assignedTo: staffFilter || undefined,
    limit: 200,
  });

  const tasks = tasksData?.tasks ?? [];

  const stats = useMemo(
    () => ({
      total: tasks.length,
      pending: tasks.filter((t) => t.status === 'PENDING').length,
      inProgress: tasks.filter((t) => t.status === 'IN_PROGRESS').length,
      done: tasks.filter((t) => t.status === 'DONE').length,
      skipped: tasks.filter((t) => t.status === 'SKIPPED').length,
      urgent: tasks.filter((t) => t.priority === 'URGENT').length,
    }),
    [tasks],
  );

  const rooms = useMemo(() => [...new Set(tasks.map((t) => t.room.number))].sort(), [tasks]);

  useEffect(() => {
    if (!taskId || tasks.length === 0) return;
    const task = tasks.find((entry) => entry.id === taskId);
    if (!task) return;
    setSelected(task);
    setShowDrawer(true);
  }, [taskId, tasks]);

  const roomFloor = (roomNumber: string) => {
    const task = tasks.find((t) => t.room.number === roomNumber);
    return task?.room.floor?.name ?? '';
  };

  return (
    <>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="w-9 h-9 rounded-lg bg-[#161b27] border border-[#1e2536] flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors shrink-0"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Task Board</h1>
              <p className="text-slate-500 text-sm mt-0.5">
                {new Date().toLocaleDateString('en', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-[#161b27] border border-[#1e2536] rounded-lg p-1">
              <button
                onClick={() => setView('kanban')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${view === 'kanban' ? 'bg-blue-600/20 text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <Columns3 size={13} /> Board
              </button>
              <button
                onClick={() => setView('grid')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${view === 'grid' ? 'bg-blue-600/20 text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <LayoutGrid size={13} /> Rooms
              </button>
            </div>
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            >
              <Plus size={15} /> New Task
            </button>
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {[
            ['Total', stats.total, 'text-slate-300', 'bg-slate-500'],
            ['To Do', stats.pending, 'text-slate-400', 'bg-slate-500'],
            ['In Progress', stats.inProgress, 'text-blue-400', 'bg-blue-400'],
            ['Done', stats.done, 'text-emerald-400', 'bg-emerald-400'],
            ['Skipped', stats.skipped, 'text-red-400', 'bg-red-400'],
            ['Urgent', stats.urgent, 'text-red-400', 'bg-red-500'],
          ].map(([label, value, color, dot]) => (
            <div
              key={label as string}
              className="bg-[#161b27] border border-[#1e2536] rounded-xl px-3 py-3 text-center"
            >
              <p className={`text-xl font-bold ${color}`}>{isLoading ? '—' : (value as number)}</p>
              <div className="flex items-center justify-center gap-1 mt-0.5">
                <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                <p className="text-[10px] text-slate-600 uppercase tracking-wider">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex items-center gap-2 bg-[#161b27] border border-[#1e2536] rounded-lg px-3 py-2 flex-1 min-w-40">
            <Search size={13} className="text-slate-500 shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search room, notes, staff…"
              className="bg-transparent text-sm text-slate-300 placeholder:text-slate-600 outline-none flex-1"
            />
          </div>
          <select
            value={floorFilter}
            onChange={(e) => setFloorFilter(e.target.value)}
            className="bg-[#161b27] border border-[#1e2536] rounded-lg px-3 py-2 text-sm text-slate-400 outline-none focus:border-blue-500 transition-colors"
          >
            <option value="">All Floors</option>
            {floors.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          <select
            value={staffFilter}
            onChange={(e) => setStaffFilter(e.target.value)}
            className="bg-[#161b27] border border-[#1e2536] rounded-lg px-3 py-2 text-sm text-slate-400 outline-none focus:border-blue-500 transition-colors"
          >
            <option value="">All Staff</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.firstName} {s.lastName}
              </option>
            ))}
          </select>
        </div>

        {/* Kanban */}
        {view === 'kanban' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {KANBAN_COLS.map((col) => {
              const sc = STATUS_CONFIG[col];
              const colTasks = tasks.filter((t) => t.status === col);
              return (
                <div key={col} className="flex flex-col">
                  <div
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl mb-3 border ${sc.bg} ${sc.border}`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${sc.dot} ${col === 'IN_PROGRESS' ? 'animate-pulse' : ''}`}
                    />
                    <span className={`text-xs font-bold uppercase tracking-wider ${sc.color}`}>
                      {sc.label}
                    </span>
                    <span
                      className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${sc.bg} ${sc.color}`}
                    >
                      {colTasks.length}
                    </span>
                  </div>
                  <div className="space-y-2 flex-1">
                    {colTasks.map((t) => (
                      <TaskCard
                        key={t.id}
                        task={t}
                        onClick={() => (setSelected(t), setShowDrawer(true))}
                      />
                    ))}
                    {colTasks.length === 0 && (
                      <div className="border border-dashed border-[#1e2536] rounded-xl p-6 text-center">
                        <p className="text-xs text-slate-700">No tasks</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Room grid */}
        {view === 'grid' && (
          <div className="space-y-5">
            <div className="flex items-center gap-4 flex-wrap">
              {[
                ['bg-emerald-400', 'All clear'],
                ['bg-blue-400 animate-pulse', 'In progress'],
                ['bg-amber-400', 'Pending'],
                ['bg-red-400', 'Skipped'],
              ].map(([dot, label]) => (
                <div key={label} className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span className={`w-2 h-2 rounded-full ${dot}`} />
                  {label}
                </div>
              ))}
            </div>
            {floors
              .filter((f) => !floorFilter || f.id === floorFilter)
              .map((floor) => {
                const floorRooms = rooms.filter((r) => {
                  const task = tasks.find((t) => t.room.number === r);
                  return task?.room.floor?.id === floor.id;
                });
                if (floorRooms.length === 0) return null;
                return (
                  <div key={floor.id}>
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-2">
                      {floor.name}
                    </p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                      {floorRooms.map((roomNumber) => (
                        <RoomGridCard
                          key={roomNumber}
                          roomNumber={roomNumber}
                          tasks={tasks.filter((t) => t.room.number === roomNumber)}
                          onClick={() => {
                            const t = tasks.filter((x) => x.room.number === roomNumber);
                            if (t.length) {
                              setSelected(t[0]);
                              setShowDrawer(true);
                            }
                          }}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      <NewTaskModal isOpen={showAdd} onClose={() => setShowAdd(false)} />
      {selected && (
        <TaskDrawer
          isOpen={showDrawer}
          task={selected}
          onClose={() => (setShowDrawer(false), setSelected(null))}
        />
      )}
    </>
  );
}
