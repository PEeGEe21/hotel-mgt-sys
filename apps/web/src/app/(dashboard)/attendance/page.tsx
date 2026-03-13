'use client';

import { useState, useMemo } from 'react';
import {
  Clock,
  Search,
  LogIn,
  LogOut,
  Download,
  ChevronRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Users,
  Timer,
  Calendar,
  ChevronLeft,
  X,
  Pencil,
  Filter,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Half Day' | 'Leave' | 'Holiday';

type StaffRecord = {
  id: string;
  name: string;
  department: string;
  position: string;
  clockIn?: string;
  clockOut?: string;
  status: AttendanceStatus;
  hoursWorked?: number;
  method: 'Manual' | 'Biometric' | 'Card';
  note?: string;
};

type HistoryEntry = {
  date: string;
  clockIn?: string;
  clockOut?: string;
  status: AttendanceStatus;
  hours?: number;
  note?: string;
};

// ─── Seed data ────────────────────────────────────────────────────────────────

const TODAY = '2026-03-12';

const todayRecords: StaffRecord[] = [
  {
    id: 's1',
    name: 'Blessing Adeyemi',
    department: 'Management',
    position: 'Hotel Manager',
    clockIn: '08:02',
    clockOut: undefined,
    status: 'Present',
    hoursWorked: undefined,
    method: 'Card',
  },
  {
    id: 's2',
    name: 'Chidi Nwosu',
    department: 'Front Desk',
    position: 'Head Receptionist',
    clockIn: '07:55',
    clockOut: undefined,
    status: 'Present',
    hoursWorked: undefined,
    method: 'Biometric',
  },
  {
    id: 's3',
    name: 'Ngozi Eze',
    department: 'Front Desk',
    position: 'Receptionist',
    clockIn: '08:10',
    clockOut: undefined,
    status: 'Late',
    hoursWorked: undefined,
    method: 'Manual',
    note: 'Traffic',
  },
  {
    id: 's4',
    name: 'Emeka Obi',
    department: 'Housekeeping',
    position: 'Head Housekeeper',
    clockIn: '07:00',
    clockOut: undefined,
    status: 'Present',
    hoursWorked: undefined,
    method: 'Biometric',
  },
  {
    id: 's5',
    name: 'Adaeze Okafor',
    department: 'Housekeeping',
    position: 'Housekeeper',
    clockIn: '07:05',
    clockOut: undefined,
    status: 'Present',
    hoursWorked: undefined,
    method: 'Biometric',
  },
  {
    id: 's6',
    name: 'Tunde Bakare',
    department: 'Bar',
    position: 'Head Bartender',
    clockIn: '16:00',
    clockOut: undefined,
    status: 'Present',
    hoursWorked: undefined,
    method: 'Card',
    note: 'Evening shift',
  },
  {
    id: 's7',
    name: 'Kemi Adebayo',
    department: 'Finance',
    position: 'Cashier',
    clockIn: undefined,
    clockOut: undefined,
    status: 'Absent',
    hoursWorked: undefined,
    method: 'Manual',
    note: 'Sick leave',
  },
  {
    id: 's8',
    name: 'Seun Lawal',
    department: 'Security',
    position: 'Security Officer',
    clockIn: '06:00',
    clockOut: '14:00',
    status: 'Present',
    hoursWorked: 8,
    method: 'Card',
  },
  {
    id: 's9',
    name: 'Yetunde Aina',
    department: 'Maintenance',
    position: 'Maintenance Tech',
    clockIn: '08:30',
    clockOut: undefined,
    status: 'Late',
    hoursWorked: undefined,
    method: 'Manual',
  },
  {
    id: 's10',
    name: 'Funke Adeola',
    department: 'Housekeeping',
    position: 'Housekeeper',
    clockIn: undefined,
    clockOut: undefined,
    status: 'Leave',
    hoursWorked: undefined,
    method: 'Manual',
    note: 'Annual leave',
  },
];

const historyData: Record<string, HistoryEntry[]> = {
  s2: [
    { date: '2026-03-11', clockIn: '07:58', clockOut: '16:02', status: 'Present', hours: 8.1 },
    { date: '2026-03-10', clockIn: '08:00', clockOut: '16:00', status: 'Present', hours: 8 },
    {
      date: '2026-03-09',
      clockIn: '08:15',
      clockOut: '16:10',
      status: 'Late',
      hours: 7.9,
      note: 'Late arrival',
    },
    {
      date: '2026-03-08',
      clockIn: undefined,
      clockOut: undefined,
      status: 'Leave',
      note: 'Annual leave',
    },
    { date: '2026-03-07', clockIn: undefined, clockOut: undefined, status: 'Holiday' },
    { date: '2026-03-06', clockIn: '07:55', clockOut: '16:05', status: 'Present', hours: 8.2 },
    { date: '2026-03-05', clockIn: '07:50', clockOut: '16:00', status: 'Present', hours: 8.2 },
  ],
};

const DEPARTMENTS = ['All Departments', ...new Set(todayRecords.map((r) => r.department))];

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  AttendanceStatus,
  { color: string; bg: string; border: string; icon: any }
> = {
  Present: {
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/15',
    border: 'border-emerald-500/30',
    icon: CheckCircle2,
  },
  Late: {
    color: 'text-amber-400',
    bg: 'bg-amber-500/15',
    border: 'border-amber-500/30',
    icon: AlertCircle,
  },
  Absent: {
    color: 'text-red-400',
    bg: 'bg-red-500/15',
    border: 'border-red-500/30',
    icon: XCircle,
  },
  'Half Day': {
    color: 'text-sky-400',
    bg: 'bg-sky-500/15',
    border: 'border-sky-500/30',
    icon: Timer,
  },
  Leave: {
    color: 'text-violet-400',
    bg: 'bg-violet-500/15',
    border: 'border-violet-500/30',
    icon: Calendar,
  },
  Holiday: {
    color: 'text-slate-400',
    bg: 'bg-slate-500/15',
    border: 'border-slate-500/30',
    icon: Calendar,
  },
};

function StatusBadge({ status }: { status: AttendanceStatus }) {
  const s = STATUS_CONFIG[status];
  const Icon = s.icon;
  return (
    <span
      className={`text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1.5 w-fit border ${s.bg} ${s.color} ${s.border}`}
    >
      <Icon size={10} />
      {status}
    </span>
  );
}

// ─── Clock In/Out Modal ───────────────────────────────────────────────────────

function ClockModal({
  staff,
  type,
  onClose,
  onSave,
}: {
  staff?: StaffRecord;
  type: 'in' | 'out' | 'manual';
  onClose: () => void;
  onSave: (staffId: string, time: string, note: string) => void;
}) {
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const [selectedStaff, setSelectedStaff] = useState(staff?.id ?? '');
  const [time, setTime] = useState(timeStr);
  const [note, setNote] = useState('');
  const inputCls =
    'w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-blue-500 transition-colors';

  const title = type === 'in' ? 'Clock In' : type === 'out' ? 'Clock Out' : 'Manual Entry';
  const color =
    type === 'out' ? 'bg-violet-600 hover:bg-violet-500' : 'bg-emerald-600 hover:bg-emerald-500';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#161b27] border border-[#1e2536] rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-4">
          {!staff && (
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
                Staff Member
              </label>
              <select
                value={selectedStaff}
                onChange={(e) => setSelectedStaff(e.target.value)}
                className={inputCls}
              >
                <option value="">Select staff…</option>
                {todayRecords.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {staff && (
            <div className="flex items-center gap-3 bg-[#0f1117] border border-[#1e2536] rounded-xl px-4 py-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500/30 to-violet-500/30 border border-white/10 flex items-center justify-center text-sm font-bold text-white shrink-0">
                {staff.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-200">{staff.name}</p>
                <p className="text-xs text-slate-500">{staff.department}</p>
              </div>
            </div>
          )}
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
              Time
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className={inputCls}
            />
          </div>
          {type === 'manual' && (
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
                Status
              </label>
              <select className={inputCls}>
                {(['Present', 'Late', 'Absent', 'Half Day', 'Leave'] as AttendanceStatus[]).map(
                  (s) => (
                    <option key={s}>{s}</option>
                  ),
                )}
              </select>
            </div>
          )}
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
              Note (optional)
            </label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Reason, notes…"
              className={inputCls}
            />
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
            onClick={() => {
              onSave(staff?.id ?? selectedStaff, time, note);
              onClose();
            }}
            className={`flex-1 ${color} text-white rounded-lg py-2.5 text-sm font-semibold transition-colors`}
          >
            {title}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── History Drawer ───────────────────────────────────────────────────────────

function HistoryDrawer({ staff, onClose }: { staff: StaffRecord; onClose: () => void }) {
  const entries = historyData[staff.id] ?? [];
  const [month] = useState('March 2026');

  const totalPresent = entries.filter((e) => e.status === 'Present' || e.status === 'Late').length;
  const totalHours = entries.reduce((s, e) => s + (e.hours ?? 0), 0);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-end">
      <div className="bg-[#161b27] border-l border-[#1e2536] w-full max-w-md h-full flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e2536]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500/30 to-violet-500/30 border border-white/10 flex items-center justify-center text-sm font-bold text-white shrink-0">
              {staff.name
                .split(' ')
                .map((n) => n[0])
                .join('')}
            </div>
            <div>
              <p className="text-sm font-bold text-white">{staff.name}</p>
              <p className="text-xs text-slate-500">
                {staff.position} · {staff.department}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Month header + stats */}
        <div className="px-5 py-4 border-b border-[#1e2536]">
          <div className="flex items-center justify-between mb-3">
            <button className="text-slate-500 hover:text-slate-300">
              <ChevronLeft size={16} />
            </button>
            <p className="text-sm font-semibold text-white">{month}</p>
            <button className="text-slate-500 hover:text-slate-300">
              <ChevronRight size={16} />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Days Present', value: totalPresent, color: 'text-emerald-400' },
              {
                label: 'Days Absent',
                value: entries.filter((e) => e.status === 'Absent').length,
                color: 'text-red-400',
              },
              { label: 'Hours Worked', value: `${totalHours.toFixed(1)}h`, color: 'text-blue-400' },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                className="bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-center"
              >
                <p className={`text-lg font-bold ${color}`}>{value}</p>
                <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Entries */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
          {entries.length === 0 ? (
            <div className="py-12 text-center">
              <Clock size={28} className="text-slate-700 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">No records for this month</p>
            </div>
          ) : (
            entries.map((e, i) => {
              const s = STATUS_CONFIG[e.status];
              const Icon = s.icon;
              return (
                <div
                  key={i}
                  className="bg-[#0f1117] border border-[#1e2536] rounded-xl px-4 py-3 flex items-center gap-3"
                >
                  <div
                    className={`w-8 h-8 rounded-lg ${s.bg} border ${s.border} flex items-center justify-center shrink-0`}
                  >
                    <Icon size={13} className={s.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-200">{e.date}</p>
                      <StatusBadge status={e.status} />
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      {e.clockIn && (
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <LogIn size={10} className="text-emerald-500" />
                          {e.clockIn}
                        </p>
                      )}
                      {e.clockOut && (
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <LogOut size={10} className="text-violet-500" />
                          {e.clockOut}
                        </p>
                      )}
                      {e.hours && <p className="text-xs text-slate-600">{e.hours}h</p>}
                    </div>
                    {e.note && <p className="text-xs text-slate-600 truncate mt-0.5">{e.note}</p>}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-[#1e2536]">
          <button className="w-full flex items-center justify-center gap-2 bg-[#0f1117] border border-[#1e2536] hover:border-slate-500 text-slate-400 hover:text-slate-200 rounded-lg py-2.5 text-sm font-medium transition-all">
            <Download size={14} /> Export Attendance
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AttendancePage() {
  const [records, setRecords] = useState<StaffRecord[]>(todayRecords);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('All Departments');
  const [modal, setModal] = useState<{
    open: boolean;
    type: 'in' | 'out' | 'manual';
    staff?: StaffRecord;
  } | null>(null);
  const [drawer, setDrawer] = useState<StaffRecord | null>(null);

  const filtered = useMemo(
    () =>
      records.filter((r) => {
        const matchSearch = `${r.name} ${r.department} ${r.position}`
          .toLowerCase()
          .includes(search.toLowerCase());
        const matchDept = deptFilter === 'All Departments' || r.department === deptFilter;
        return matchSearch && matchDept;
      }),
    [records, search, deptFilter],
  );

  const stats = useMemo(
    () => ({
      present: records.filter((r) => r.status === 'Present').length,
      late: records.filter((r) => r.status === 'Late').length,
      absent: records.filter((r) => r.status === 'Absent').length,
      leave: records.filter((r) => r.status === 'Leave').length,
      clockedOut: records.filter((r) => r.clockIn && r.clockOut).length,
      inHouse: records.filter((r) => r.clockIn && !r.clockOut).length,
    }),
    [records],
  );

  const handleClockIn = (staffId: string, time: string, note: string) => {
    setRecords((rs) =>
      rs.map((r) =>
        r.id === staffId ? { ...r, clockIn: time, status: 'Present', note: note || r.note } : r,
      ),
    );
  };
  const handleClockOut = (staffId: string, time: string) => {
    setRecords((rs) =>
      rs.map((r) => {
        if (r.id !== staffId) return r;
        const cin = r.clockIn ? parseInt(r.clockIn.replace(':', '')) : 0;
        const cout = parseInt(time.replace(':', ''));
        const hrs = Math.max(0, (cout - cin) / 100);
        return { ...r, clockOut: time, hoursWorked: parseFloat(hrs.toFixed(1)) };
      }),
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Attendance</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Today — {TODAY} · {records.length} staff scheduled
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setModal({ open: true, type: 'manual' })}
            className="flex items-center gap-2 bg-[#161b27] border border-[#1e2536] hover:border-slate-500 text-slate-300 px-3 py-2 rounded-lg text-sm font-medium transition-all"
          >
            <Pencil size={13} /> Manual Entry
          </button>
          <button className="flex items-center gap-2 bg-[#161b27] border border-[#1e2536] hover:border-slate-500 text-slate-300 px-3 py-2 rounded-lg text-sm font-medium transition-all">
            <Download size={13} /> Export
          </button>
          <button
            onClick={() => setModal({ open: true, type: 'in' })}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            <LogIn size={14} /> Clock In
          </button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {[
          {
            label: 'Present',
            value: stats.present,
            color: 'text-emerald-400',
            bg: 'bg-emerald-500/10 border-emerald-500/20',
          },
          {
            label: 'Late',
            value: stats.late,
            color: 'text-amber-400',
            bg: 'bg-amber-500/10 border-amber-500/20',
          },
          {
            label: 'Absent',
            value: stats.absent,
            color: 'text-red-400',
            bg: 'bg-red-500/10 border-red-500/20',
          },
          {
            label: 'On Leave',
            value: stats.leave,
            color: 'text-violet-400',
            bg: 'bg-violet-500/10 border-violet-500/20',
          },
          {
            label: 'In House',
            value: stats.inHouse,
            color: 'text-blue-400',
            bg: 'bg-blue-500/10 border-blue-500/20',
          },
          {
            label: 'Clocked Out',
            value: stats.clockedOut,
            color: 'text-slate-400',
            bg: 'bg-slate-500/10 border-slate-500/20',
          },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`${bg} border rounded-xl px-3 py-3 text-center`}>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 bg-[#161b27] border border-[#1e2536] rounded-lg px-3 py-2 flex-1 min-w-48">
          <Search size={14} className="text-slate-500 shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search staff..."
            className="bg-transparent text-sm text-slate-300 placeholder:text-slate-600 outline-none flex-1"
          />
        </div>
        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="bg-[#161b27] border border-[#1e2536] rounded-lg px-3 py-2 text-sm text-slate-300 outline-none focus:border-blue-500 transition-colors"
        >
          {DEPARTMENTS.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-[#161b27] border border-[#1e2536] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-[#1e2536] bg-[#0f1117]/50">
            <tr>
              {[
                'Staff',
                'Department',
                'Clock In',
                'Clock Out',
                'Hours',
                'Status',
                'Method',
                '',
              ].map((h) => (
                <th
                  key={h}
                  className="text-xs text-slate-500 uppercase tracking-wider font-medium px-4 py-3 text-left whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const canClockIn = !r.clockIn && r.status !== 'Absent' && r.status !== 'Leave';
              const canClockOut = !!r.clockIn && !r.clockOut;
              return (
                <tr
                  key={r.id}
                  className="border-b border-[#1e2536] last:border-0 hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/20 to-violet-500/20 border border-white/10 flex items-center justify-center text-xs font-bold text-slate-300 shrink-0">
                        {r.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-200 whitespace-nowrap">
                          {r.name}
                        </p>
                        <p className="text-xs text-slate-500">{r.position}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-400 whitespace-nowrap">
                    {r.department}
                  </td>
                  <td className="px-4 py-3">
                    {r.clockIn ? (
                      <span className="text-sm font-mono text-emerald-400 flex items-center gap-1.5">
                        <LogIn size={12} />
                        {r.clockIn}
                      </span>
                    ) : (
                      <span className="text-sm text-slate-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {r.clockOut ? (
                      <span className="text-sm font-mono text-violet-400 flex items-center gap-1.5">
                        <LogOut size={12} />
                        {r.clockOut}
                      </span>
                    ) : (
                      <span className="text-sm text-slate-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {r.hoursWorked ? (
                      <span className="text-sm font-semibold text-slate-300">{r.hoursWorked}h</span>
                    ) : r.clockIn && !r.clockOut ? (
                      <span className="text-xs text-blue-400 animate-pulse">Active</span>
                    ) : (
                      <span className="text-sm text-slate-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-slate-500 bg-[#0f1117] border border-[#1e2536] px-2 py-1 rounded-md">
                      {r.method}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 whitespace-nowrap">
                      {canClockIn && (
                        <button
                          onClick={() => setModal({ open: true, type: 'in', staff: r })}
                          className="text-xs bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 px-2 py-1 rounded-lg font-medium transition-colors flex items-center gap-1"
                        >
                          <LogIn size={10} /> In
                        </button>
                      )}
                      {canClockOut && (
                        <button
                          onClick={() => setModal({ open: true, type: 'out', staff: r })}
                          className="text-xs bg-violet-500/15 text-violet-400 hover:bg-violet-500/25 px-2 py-1 rounded-lg font-medium transition-colors flex items-center gap-1"
                        >
                          <LogOut size={10} /> Out
                        </button>
                      )}
                      <button
                        onClick={() => setDrawer(r)}
                        className="text-xs bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 px-2 py-1 rounded-lg font-medium transition-colors flex items-center gap-1"
                      >
                        <ChevronRight size={10} /> History
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-14 text-center">
            <Users size={28} className="text-slate-700 mx-auto mb-2" />
            <p className="text-slate-500 text-sm">No staff match your filters</p>
          </div>
        )}
      </div>

      {/* Clock modals */}
      {modal?.open && modal.type === 'in' && (
        <ClockModal
          type="in"
          staff={modal.staff}
          onClose={() => setModal(null)}
          onSave={(id, time, note) => handleClockIn(id, time, note)}
        />
      )}
      {modal?.open && modal.type === 'out' && (
        <ClockModal
          type="out"
          staff={modal.staff}
          onClose={() => setModal(null)}
          onSave={(id, time) => handleClockOut(id, time)}
        />
      )}
      {modal?.open && modal.type === 'manual' && (
        <ClockModal type="manual" onClose={() => setModal(null)} onSave={() => {}} />
      )}

      {/* History drawer */}
      {drawer && <HistoryDrawer staff={drawer} onClose={() => setDrawer(null)} />}
    </div>
  );
}
