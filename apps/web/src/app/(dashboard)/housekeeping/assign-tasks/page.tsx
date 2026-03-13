'use client';

import { useState, useMemo } from 'react';
import {
  Sparkles, LayoutGrid, Columns3, Plus,
  Search, ChevronDown, Clock, AlertTriangle,
  CheckCircle2, Circle, Loader2, Flag, X, Save
} from 'lucide-react';

type TaskStatus  = 'pending' | 'in_progress' | 'done' | 'blocked';
type Priority    = 'low' | 'normal' | 'urgent';
type TaskType    = 'cleaning' | 'turndown' | 'inspection' | 'maintenance' | 'amenity';

type HKTask = {
  id: string; room: string; floor: number; type: TaskType;
  status: TaskStatus; priority: Priority; assignee: string | null;
  notes: string; createdAt: string; dueBy: string;
};

const STAFF = ['Emeka Obi', 'Adaeze Okafor', 'Fatou Diallo', 'James Eze'];

const seedTasks: HKTask[] = [
  { id: 't1',  room: '101', floor: 1, type: 'cleaning',    status: 'pending',     priority: 'urgent', assignee: 'Emeka Obi',    notes: 'Guest checked out. Deep clean required.', createdAt: '07:30', dueBy: '11:00' },
  { id: 't2',  room: '102', floor: 1, type: 'turndown',    status: 'pending',     priority: 'normal', assignee: 'Adaeze Okafor',notes: 'Evening turndown service.', createdAt: '07:30', dueBy: '18:00' },
  { id: 't3',  room: '201', floor: 2, type: 'cleaning',    status: 'in_progress', priority: 'urgent', assignee: 'Emeka Obi',    notes: 'Early check-in requested.', createdAt: '07:30', dueBy: '09:30' },
  { id: 't4',  room: '202', floor: 2, type: 'amenity',     status: 'in_progress', priority: 'normal', assignee: 'Adaeze Okafor',notes: 'Restock minibar and toiletries.', createdAt: '08:00', dueBy: '12:00' },
  { id: 't5',  room: '203', floor: 2, type: 'inspection',  status: 'pending',     priority: 'normal', assignee: 'Fatou Diallo', notes: 'Post-cleaning supervisor check.', createdAt: '08:00', dueBy: '13:00' },
  { id: 't6',  room: '301', floor: 3, type: 'cleaning',    status: 'done',        priority: 'normal', assignee: 'Fatou Diallo', notes: '', createdAt: '07:00', dueBy: '10:00' },
  { id: 't7',  room: '302', floor: 3, type: 'cleaning',    status: 'done',        priority: 'normal', assignee: 'James Eze',    notes: '', createdAt: '07:00', dueBy: '10:00' },
  { id: 't8',  room: '303', floor: 3, type: 'maintenance', status: 'blocked',     priority: 'urgent', assignee: null,           notes: 'AC unit not cooling. Maintenance ticket raised.', createdAt: '07:30', dueBy: '10:00' },
  { id: 't9',  room: '401', floor: 4, type: 'cleaning',    status: 'in_progress', priority: 'normal', assignee: 'James Eze',    notes: 'VIP suite — extra attention required.', createdAt: '08:30', dueBy: '11:00' },
  { id: 't10', room: '402', floor: 4, type: 'turndown',    status: 'pending',     priority: 'normal', assignee: null,           notes: '', createdAt: '09:00', dueBy: '18:00' },
  { id: 't11', room: '403', floor: 4, type: 'inspection',  status: 'done',        priority: 'urgent', assignee: 'Emeka Obi',    notes: 'Pre-arrival VIP inspection completed.', createdAt: '07:00', dueBy: '09:00' },
  { id: 't12', room: '205', floor: 2, type: 'amenity',     status: 'pending',     priority: 'low',    assignee: null,           notes: 'Replenish welcome snacks.', createdAt: '09:00', dueBy: '16:00' },
];

const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; bg: string; border: string; dot: string }> = {
  pending:     { label: 'To Do',       color: 'text-slate-400',   bg: 'bg-slate-500/10',   border: 'border-slate-500/20',  dot: 'bg-slate-500' },
  in_progress: { label: 'In Progress', color: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20',   dot: 'bg-blue-400' },
  done:        { label: 'Done',        color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20',dot: 'bg-emerald-400' },
  blocked:     { label: 'Blocked',     color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20',    dot: 'bg-red-400' },
};
const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; bg: string }> = {
  low:    { label: 'Low',    color: 'text-slate-500', bg: 'bg-slate-500/10' },
  normal: { label: 'Normal', color: 'text-blue-400',  bg: 'bg-blue-500/10' },
  urgent: { label: 'Urgent', color: 'text-red-400',   bg: 'bg-red-500/15' },
};
const TYPE_CONFIG: Record<TaskType, { label: string; color: string; bg: string }> = {
  cleaning:    { label: 'Cleaning',    color: 'text-sky-400',     bg: 'bg-sky-500/10' },
  turndown:    { label: 'Turndown',    color: 'text-violet-400',  bg: 'bg-violet-500/10' },
  inspection:  { label: 'Inspection',  color: 'text-amber-400',   bg: 'bg-amber-500/10' },
  maintenance: { label: 'Maintenance', color: 'text-red-400',     bg: 'bg-red-500/10' },
  amenity:     { label: 'Amenity',     color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
};

const KANBAN_COLS: TaskStatus[] = ['pending', 'in_progress', 'done', 'blocked'];

function TaskCard({ task, onClick, onAdvance }: { task: HKTask; onClick: () => void; onAdvance: (id: string, s: TaskStatus) => void }) {
  const sc = STATUS_CONFIG[task.status];
  const tc = TYPE_CONFIG[task.type];
  const next: Partial<Record<TaskStatus, TaskStatus>> = { pending: 'in_progress', in_progress: 'done', blocked: 'pending' };
  return (
    <div onClick={onClick} className="bg-[#161b27] border border-[#1e2536] hover:border-slate-600 rounded-xl p-4 cursor-pointer transition-all group space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold text-white">Rm {task.room}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${tc.bg} ${tc.color}`}>{tc.label}</span>
          {task.priority === 'urgent' && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-red-500/20 text-red-400 flex items-center gap-0.5"><Flag size={8} /> Urgent</span>
          )}
        </div>
        {next[task.status] && (
          <button onClick={e => { e.stopPropagation(); onAdvance(task.id, next[task.status]!); }}
            className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-white/10 text-slate-500 hover:text-slate-300 transition-all shrink-0" title="Advance">
            <ChevronDown size={13} className="-rotate-90" />
          </button>
        )}
      </div>
      {task.notes && <p className="text-xs text-slate-500 line-clamp-2">{task.notes}</p>}
      <div className="flex items-center justify-between gap-2">
        {task.assignee
          ? <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500/30 to-violet-500/30 border border-white/10 flex items-center justify-center text-[9px] font-bold text-white">
                {task.assignee.split(' ').map(n => n[0]).join('')}
              </div>
              <span className="text-[10px] text-slate-500 truncate max-w-[90px]">{task.assignee.split(' ')[0]}</span>
            </div>
          : <span className="text-[10px] text-slate-700 italic">Unassigned</span>}
        <div className="flex items-center gap-1 text-[10px] text-slate-600"><Clock size={9} />{task.dueBy}</div>
      </div>
    </div>
  );
}

function RoomGridCard({ room, tasks, onClick }: { room: string; tasks: HKTask[]; onClick: () => void }) {
  const blocked    = tasks.some(t => t.status === 'blocked');
  const allDone    = tasks.length > 0 && tasks.every(t => t.status === 'done');
  const inProgress = tasks.some(t => t.status === 'in_progress');
  const bg = blocked ? 'border-red-500/40 bg-red-500/5' : allDone ? 'border-emerald-500/30 bg-emerald-500/5' : inProgress ? 'border-blue-500/30 bg-blue-500/5' : 'border-[#1e2536] bg-[#161b27]';
  const dot = blocked ? 'bg-red-400' : allDone ? 'bg-emerald-400' : inProgress ? 'bg-blue-400 animate-pulse' : 'bg-amber-400';
  return (
    <button onClick={onClick} className={`border rounded-xl p-3 text-left hover:brightness-110 transition-all ${bg}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-bold text-white">Rm {room}</span>
        <span className={`w-2 h-2 rounded-full ${dot}`} />
      </div>
      <p className="text-[10px] text-slate-500">{tasks.length} task{tasks.length !== 1 ? 's' : ''}</p>
      {tasks.some(t => t.priority === 'urgent') && <p className="text-[10px] text-red-400 font-semibold mt-1 flex items-center gap-1"><Flag size={8} />Urgent</p>}
      {allDone && tasks.length > 0 && <p className="text-[10px] text-emerald-400 mt-1">✓ Clear</p>}
    </button>
  );
}

function AddTaskModal({ onClose, onAdd }: { onClose: () => void; onAdd: (t: HKTask) => void }) {
  const [form, setForm] = useState({ room: '', type: 'cleaning' as TaskType, priority: 'normal' as Priority, assignee: '', notes: '', dueBy: '12:00' });
  const sel = "w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500 transition-colors";
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#161b27] border border-[#1e2536] rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">New Task</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300"><X size={18} /></button>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">Room</label>
              <input value={form.room} onChange={e => setForm(p => ({...p, room: e.target.value}))} placeholder="e.g. 203" className={`${sel} placeholder:text-slate-600`} />
            </div>
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">Due By</label>
              <input type="time" value={form.dueBy} onChange={e => setForm(p => ({...p, dueBy: e.target.value}))} className={sel} />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">Task Type</label>
            <select value={form.type} onChange={e => setForm(p => ({...p, type: e.target.value as TaskType}))} className={sel}>
              {(Object.keys(TYPE_CONFIG) as TaskType[]).map(t => <option key={t} value={t}>{TYPE_CONFIG[t].label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">Priority</label>
            <div className="flex gap-2">
              {(['low','normal','urgent'] as Priority[]).map(p => (
                <button key={p} onClick={() => setForm(f => ({...f, priority: p}))}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all capitalize ${form.priority === p ? `${PRIORITY_CONFIG[p].bg} ${PRIORITY_CONFIG[p].color} border-current` : 'bg-[#0f1117] border-[#1e2536] text-slate-500'}`}>{p}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">Assign To</label>
            <select value={form.assignee} onChange={e => setForm(p => ({...p, assignee: e.target.value}))} className={sel}>
              <option value="">Unassigned</option>
              {STAFF.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">Notes</label>
            <textarea value={form.notes} onChange={e => setForm(p => ({...p, notes: e.target.value}))} placeholder="Optional notes..." rows={2} className={`${sel} placeholder:text-slate-600 resize-none`} />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg py-2.5 text-sm font-medium transition-colors">Cancel</button>
          <button onClick={() => { if (!form.room) return; onAdd({ id: `t${Date.now()}`, floor: Math.ceil(Number(form.room)/100), room: form.room, type: form.type, status: 'pending', priority: form.priority, assignee: form.assignee || null, notes: form.notes, createdAt: new Date().toLocaleTimeString('en',{hour:'2-digit',minute:'2-digit'}), dueBy: form.dueBy }); onClose(); }}
            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg py-2.5 text-sm font-semibold transition-colors flex items-center justify-center gap-2">
            <Plus size={14} /> Create Task
          </button>
        </div>
      </div>
    </div>
  );
}

function TaskDrawer({ task, onClose, onUpdate }: { task: HKTask; onClose: () => void; onUpdate: (t: HKTask) => void }) {
  const [form, setForm] = useState(task);
  const f = (k: string, v: any) => setForm(p => ({...p, [k]: v}));
  const tc = TYPE_CONFIG[form.type];
  const sel = "w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500 transition-colors";
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-end" onClick={onClose}>
      <div className="w-full max-w-md bg-[#161b27] border-l border-[#1e2536] h-full flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e2536]">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-violet-400" />
            <h2 className="text-base font-bold text-white">Room {form.room}</h2>
            <span className={`text-xs px-2 py-0.5 rounded-full ${tc.bg} ${tc.color}`}>{tc.label}</span>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-2 block">Status</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(STATUS_CONFIG) as TaskStatus[]).map(s => {
                const c = STATUS_CONFIG[s];
                return (
                  <button key={s} onClick={() => f('status', s)}
                    className={`py-2 rounded-lg text-xs font-medium border transition-all flex items-center justify-center gap-1.5 ${form.status === s ? `${c.bg} ${c.color} ${c.border}` : 'bg-[#0f1117] border-[#1e2536] text-slate-500 hover:text-slate-300'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />{c.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-2 block">Priority</label>
            <div className="flex gap-2">
              {(['low','normal','urgent'] as Priority[]).map(p => (
                <button key={p} onClick={() => f('priority', p)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all capitalize ${form.priority === p ? `${PRIORITY_CONFIG[p].bg} ${PRIORITY_CONFIG[p].color} border-current` : 'bg-[#0f1117] border-[#1e2536] text-slate-500'}`}>{p}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-2 block">Assigned To</label>
            <select value={form.assignee ?? ''} onChange={e => f('assignee', e.target.value || null)} className={sel}>
              <option value="">Unassigned</option>
              {STAFF.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-2 block">Notes</label>
            <textarea value={form.notes} onChange={e => f('notes', e.target.value)} rows={3} placeholder="Task notes..."
              className={`${sel} placeholder:text-slate-600 resize-none`} />
          </div>
          <div className="bg-[#0f1117] rounded-xl p-4 space-y-2">
            {[['Floor', `Floor ${form.floor}`], ['Created', form.createdAt], ['Due By', form.dueBy]].map(([l, v]) => (
              <div key={l} className="flex justify-between text-xs">
                <span className="text-slate-600">{l}</span>
                <span className="text-slate-400 font-medium">{v}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="p-4 border-t border-[#1e2536]">
          <button onClick={() => { onUpdate(form); onClose(); }}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-xl py-3 text-sm font-semibold transition-colors flex items-center justify-center gap-2">
            <Save size={14} /> Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

export default function HousekeepingPage() {
  const [tasks, setTasks] = useState<HKTask[]>(seedTasks);
  const [view, setView]   = useState<'kanban' | 'grid'>('kanban');
  const [search, setSearch]     = useState('');
  const [floorFilter, setFloor] = useState<number | 'all'>('all');
  const [staffFilter, setStaff] = useState('all');
  const [showAdd, setShowAdd]   = useState(false);
  const [selected, setSelected] = useState<HKTask | null>(null);

  const floors    = [...new Set(tasks.map(t => t.floor))].sort();
  const assignees = [...new Set(tasks.map(t => t.assignee).filter(Boolean))] as string[];

  const filtered = useMemo(() => tasks.filter(t => {
    const ms = `${t.room} ${t.type} ${t.assignee ?? ''}`.toLowerCase().includes(search.toLowerCase());
    const mf = floorFilter === 'all' || t.floor === floorFilter;
    const ma = staffFilter === 'all' || t.assignee === staffFilter;
    return ms && mf && ma;
  }), [tasks, search, floorFilter, staffFilter]);

  const advance = (id: string, status: TaskStatus) => setTasks(ts => ts.map(t => t.id === id ? {...t, status} : t));
  const update  = (u: HKTask) => setTasks(ts => ts.map(t => t.id === u.id ? u : t));

  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    done: tasks.filter(t => t.status === 'done').length,
    blocked: tasks.filter(t => t.status === 'blocked').length,
    urgent: tasks.filter(t => t.priority === 'urgent').length,
  };

  const rooms = [...new Set(filtered.map(t => t.room))].sort();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Housekeeping</h1>
          <p className="text-slate-500 text-sm mt-0.5">{new Date().toLocaleDateString('en',{weekday:'long',month:'long',day:'numeric'})}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-[#161b27] border border-[#1e2536] rounded-lg p-1">
            <button onClick={() => setView('kanban')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${view === 'kanban' ? 'bg-blue-600/20 text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}><Columns3 size={13} /> Board</button>
            <button onClick={() => setView('grid')}  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${view === 'grid'   ? 'bg-blue-600/20 text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}><LayoutGrid size={13} /> Rooms</button>
          </div>
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"><Plus size={15} /> New Task</button>
        </div>
      </div>

      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {[
          ['Total',       stats.total,      'text-slate-300', 'bg-slate-500'],
          ['To Do',       stats.pending,    'text-slate-400', 'bg-slate-500'],
          ['In Progress', stats.inProgress, 'text-blue-400',  'bg-blue-400'],
          ['Done',        stats.done,       'text-emerald-400','bg-emerald-400'],
          ['Blocked',     stats.blocked,    'text-red-400',   'bg-red-400'],
          ['Urgent',      stats.urgent,     'text-red-400',   'bg-red-500'],
        ].map(([label, value, color, dot]) => (
          <div key={label as string} className="bg-[#161b27] border border-[#1e2536] rounded-xl px-3 py-3 text-center">
            <p className={`text-xl font-bold ${color}`}>{value as number}</p>
            <div className="flex items-center justify-center gap-1 mt-0.5">
              <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
              <p className="text-[10px] text-slate-600 uppercase tracking-wider">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex items-center gap-2 bg-[#161b27] border border-[#1e2536] rounded-lg px-3 py-2 flex-1 min-w-40">
          <Search size={13} className="text-slate-500 shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search room, type, staff..."
            className="bg-transparent text-sm text-slate-300 placeholder:text-slate-600 outline-none flex-1" />
        </div>
        <select value={floorFilter} onChange={e => setFloor(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          className="bg-[#161b27] border border-[#1e2536] rounded-lg px-3 py-2 text-sm text-slate-400 outline-none">
          <option value="all">All Floors</option>
          {floors.map(f => <option key={f} value={f}>Floor {f}</option>)}
        </select>
        <select value={staffFilter} onChange={e => setStaff(e.target.value)}
          className="bg-[#161b27] border border-[#1e2536] rounded-lg px-3 py-2 text-sm text-slate-400 outline-none">
          <option value="all">All Staff</option>
          {assignees.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {view === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {KANBAN_COLS.map(col => {
            const sc = STATUS_CONFIG[col];
            const colTasks = filtered.filter(t => t.status === col);
            return (
              <div key={col} className="flex flex-col">
                <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl mb-3 border ${sc.bg} ${sc.border}`}>
                  <span className={`w-2 h-2 rounded-full ${sc.dot} ${col === 'in_progress' ? 'animate-pulse' : ''}`} />
                  <span className={`text-xs font-bold uppercase tracking-wider ${sc.color}`}>{sc.label}</span>
                  <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${sc.bg} ${sc.color}`}>{colTasks.length}</span>
                </div>
                <div className="space-y-2 flex-1">
                  {colTasks.map(t => <TaskCard key={t.id} task={t} onClick={() => setSelected(t)} onAdvance={advance} />)}
                  {colTasks.length === 0 && (
                    <div className="border border-dashed border-[#1e2536] rounded-xl p-6 text-center"><p className="text-xs text-slate-700">No tasks</p></div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === 'grid' && (
        <div className="space-y-5">
          <div className="flex items-center gap-4 flex-wrap">
            {[['bg-emerald-400','All clear'],['bg-blue-400 animate-pulse','In progress'],['bg-amber-400','Pending'],['bg-red-400','Blocked']].map(([dot, label]) => (
              <div key={label} className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className={`w-2 h-2 rounded-full ${dot}`} />{label}
              </div>
            ))}
          </div>
          {floors.filter(f => floorFilter === 'all' || f === floorFilter).map(floor => {
            const floorRooms = rooms.filter(r => Math.ceil(Number(r)/100) === floor);
            return (
              <div key={floor}>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-2">Floor {floor}</p>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                  {floorRooms.map(room => (
                    <RoomGridCard key={room} room={room} tasks={filtered.filter(t => t.room === room)}
                      onClick={() => { const t = filtered.filter(x => x.room === room); if (t.length) setSelected(t[0]); }} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAdd  && <AddTaskModal onClose={() => setShowAdd(false)} onAdd={t => setTasks(ts => [t, ...ts])} />}
      {selected && <TaskDrawer task={selected} onClose={() => setSelected(null)} onUpdate={update} />}
    </div>
  );
}