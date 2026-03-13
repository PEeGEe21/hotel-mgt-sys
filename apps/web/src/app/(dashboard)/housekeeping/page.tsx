import {
  Sparkles,
  Clock,
  CheckCircle2,
  AlertCircle,
  ClipboardList,
  UserCheck,
  Boxes,
  ArrowUpRight,
} from 'lucide-react';
import Link from 'next/link';

const kpis = [
  { label: 'Rooms To Clean', value: '38', change: '+6', icon: Sparkles, tone: 'blue' },
  { label: 'In Progress', value: '12', change: '4 due in 2h', icon: Clock, tone: 'amber' },
  { label: 'Inspections', value: '9', change: '2 urgent', icon: ClipboardList, tone: 'violet' },
  { label: 'Out of Service', value: '3', change: '1 new', icon: AlertCircle, tone: 'red' },
];

const tasks = [
  { room: '214', type: 'Checkout Clean', floor: '2F', priority: 'High', assignee: 'T. Ogun', status: 'In Progress', due: '10:30 AM' },
  { room: '508', type: 'Deep Clean', floor: '5F', priority: 'Urgent', assignee: 'M. Mensah', status: 'Pending', due: '11:00 AM' },
  { room: '109', type: 'Turndown', floor: '1F', priority: 'Normal', assignee: 'L. Park', status: 'Queued', due: '12:30 PM' },
  { room: '332', type: 'Inspection', floor: '3F', priority: 'High', assignee: 'R. Silva', status: 'Pending', due: '01:00 PM' },
  { room: '420', type: 'Maintenance Prep', floor: '4F', priority: 'Normal', assignee: 'K. Bello', status: 'Done', due: '09:15 AM' },
];

const floorStatus = [
  { floor: '1st Floor', ready: 18, dirty: 6, inspected: 4 },
  { floor: '2nd Floor', ready: 14, dirty: 9, inspected: 3 },
  { floor: '3rd Floor', ready: 12, dirty: 8, inspected: 2 },
  { floor: '4th Floor', ready: 10, dirty: 7, inspected: 4 },
];

const team = [
  { name: 'Tomi Ogun', shift: '07:00 - 15:00', rooms: 7, status: 'On Track' },
  { name: 'Mariam Mensah', shift: '08:00 - 16:00', rooms: 9, status: 'Behind' },
  { name: 'Lina Park', shift: '10:00 - 18:00', rooms: 5, status: 'On Track' },
  { name: 'Rafael Silva', shift: '12:00 - 20:00', rooms: 4, status: 'Available' },
];

const supplies = [
  { item: 'Fresh Linen', value: 78, tone: 'emerald' },
  { item: 'Amenities', value: 62, tone: 'blue' },
  { item: 'Cleaning Agents', value: 41, tone: 'amber' },
  { item: 'Mini Bar Stock', value: 55, tone: 'violet' },
];

const statusBadge: Record<string, string> = {
  'In Progress': 'bg-blue-500/15 text-blue-400',
  'Pending': 'bg-amber-500/15 text-amber-400',
  'Queued': 'bg-slate-500/15 text-slate-300',
  'Done': 'bg-emerald-500/15 text-emerald-400',
  'Urgent': 'bg-red-500/15 text-red-400',
  'High': 'bg-orange-500/15 text-orange-400',
  'Normal': 'bg-slate-500/15 text-slate-400',
  'Behind': 'bg-red-500/15 text-red-400',
  'On Track': 'bg-emerald-500/15 text-emerald-400',
  'Available': 'bg-blue-500/15 text-blue-400',
};

const toneMap: Record<string, string> = {
  blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/20 text-blue-400',
  amber: 'from-amber-500/20 to-amber-600/10 border-amber-500/20 text-amber-400',
  violet: 'from-violet-500/20 to-violet-600/10 border-violet-500/20 text-violet-400',
  red: 'from-red-500/20 to-red-600/10 border-red-500/20 text-red-400',
  emerald: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/20 text-emerald-400',
};

const fillMap: Record<string, string> = {
  blue: 'from-blue-500 to-blue-400',
  amber: 'from-amber-500 to-amber-400',
  violet: 'from-violet-500 to-violet-400',
  red: 'from-red-500 to-red-400',
  emerald: 'from-emerald-500 to-emerald-400',
};

export default function HousekeepingPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Housekeeping</h1>
          <p className="text-slate-500 text-sm mt-0.5">Live workload, room status, and team coverage for today.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
          <span className="bg-[#161b27] border border-[#1e2536] px-3 py-2 rounded-lg flex items-center gap-2">
            <Clock size={12} />
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </span>
          <Link href={'/housekeeping/assign-tasks'} className="bg-white/5 border border-[#1e2536] hover:border-slate-500 text-slate-200 px-3 py-2 rounded-lg transition-colors">
            Assign Tasks
          </Link>
          <button className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded-lg transition-colors">
            New Task
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map(({ label, value, change, icon: Icon, tone }) => (
          <div key={label} className={`bg-gradient-to-br ${toneMap[tone]} border rounded-xl p-5`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-widest font-medium">{label}</p>
                <p className="text-3xl font-bold text-white mt-1.5">{value}</p>
                <p className="text-xs text-slate-400 mt-1">{change} vs yesterday</p>
              </div>
              <Icon size={18} className="opacity-70" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 space-y-4">
          <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Sparkles size={14} /> Priority Queue
              </h2>
              <div className="flex flex-wrap gap-2 text-xs">
                {['All', 'High Priority', 'Inspections', 'Deep Clean'].map(label => (
                  <button
                    key={label}
                    className={`px-3 py-1.5 rounded-full border transition-colors ${
                      label === 'High Priority'
                        ? 'bg-orange-500/15 border-orange-500/30 text-orange-400'
                        : 'bg-[#0f1117] border-[#1e2536] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              {tasks.map((task, index) => (
                <div
                  key={`${task.room}-${index}`}
                  className="bg-[#0f1117] border border-[#1e2536] rounded-xl p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-700/40 to-slate-800/80 border border-[#1e2536] flex items-center justify-center text-white font-bold">
                      {task.room}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-white">{task.type}</p>
                        <span className={`text-[11px] px-2 py-0.5 rounded-full ${statusBadge[task.priority]}`}>
                          {task.priority}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Floor {task.floor} · Due {task.due}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-2">
                        <UserCheck size={12} className="text-emerald-400" />
                        {task.assignee}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between md:flex-col md:items-end gap-3">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusBadge[task.status]}`}>
                      {task.status}
                    </span>
                    <button className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                      View details <ArrowUpRight size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-white">Floor Readiness</h2>
              <button className="text-xs text-blue-400 hover:text-blue-300">Export report</button>
            </div>
            <div className="space-y-3">
              {floorStatus.map(floor => (
                <div key={floor.floor} className="border border-[#1e2536] rounded-xl px-4 py-3 bg-[#0f1117]">
                  <div className="flex items-center justify-between text-sm text-white font-medium">
                    <span>{floor.floor}</span>
                    <span className="text-xs text-slate-500">{floor.ready + floor.dirty + floor.inspected} rooms</span>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2 text-emerald-300">
                      Ready <span className="float-right font-semibold">{floor.ready}</span>
                    </div>
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 text-amber-300">
                      Dirty <span className="float-right font-semibold">{floor.dirty}</span>
                    </div>
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2 text-blue-300">
                      Inspected <span className="float-right font-semibold">{floor.inspected}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5">
            <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-400" /> Room Status
            </h2>
            <div className="grid grid-cols-2 gap-3 text-xs">
              {[
                { label: 'Ready', value: 44, tone: 'emerald' },
                { label: 'Dirty', value: 30, tone: 'amber' },
                { label: 'Inspect', value: 12, tone: 'blue' },
                { label: 'Out of Service', value: 3, tone: 'red' },
              ].map(item => (
                <div key={item.label} className={`bg-gradient-to-br ${toneMap[item.tone]} border rounded-xl p-3`}>
                  <p className="text-xs text-slate-400">{item.label}</p>
                  <p className="text-lg font-semibold text-white mt-1">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5">
            <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <UserCheck size={14} /> Team Board
            </h2>
            <div className="space-y-3">
              {team.map(member => (
                <div key={member.name} className="bg-[#0f1117] border border-[#1e2536] rounded-xl px-4 py-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-white">{member.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusBadge[member.status]}`}>
                      {member.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
                    <span>{member.shift}</span>
                    <span>{member.rooms} rooms</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5">
            <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Boxes size={14} /> Supply Tracker
            </h2>
            <div className="space-y-3">
              {supplies.map(supply => (
                <div key={supply.item}>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{supply.item}</span>
                    <span className="text-slate-300 font-semibold">{supply.value}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#0f1117] border border-[#1e2536] mt-2 overflow-hidden">
                    <div className={`h-full rounded-full bg-gradient-to-r ${fillMap[supply.tone]}`} style={{ width: `${supply.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5">
            <h2 className="text-sm font-semibold text-white mb-4">Today&apos;s Checklist</h2>
            <div className="space-y-3 text-xs text-slate-400">
              {[
                'Disinfect elevator controls and lobby surfaces',
                'Restock linen closets on floors 2, 4, 5',
                'Audit minibar counts for suites 301-320',
                'Prepare turndown carts for evening shift',
              ].map(item => (
                <div key={item} className="flex items-start gap-2">
                  <span className="mt-1 h-2.5 w-2.5 rounded-full border border-emerald-500/40 bg-emerald-500/20" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
