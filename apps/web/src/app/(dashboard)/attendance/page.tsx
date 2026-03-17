'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Search,
  LogIn,
  LogOut,
  Download,
  ChevronRight,
  Users,
  Pencil,
  Calendar as CalendarIcon,
} from 'lucide-react';
import Link from 'next/link';
import Pagination from '@/components/ui/pagination';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { AttendanceStatus, StaffRecord } from '@/lib/attendance-data';
import ClockModal from './_components/ClockModal';
import HistoryDrawer from './_components/HistoryDrawer';
import StatusBadge from './_components/StatusBadge';
import { format } from 'date-fns';
import { useDebounce } from '@/hooks/useDebounce';
import {
  useAdminClockIn,
  useAdminClockOut,
  useAttendanceList,
  type AttendanceStats,
} from '@/hooks/useAttendance';
import { useDepartments } from '@/hooks/useDepartments';

const emptyStats: AttendanceStats = {
  present: 0,
  late: 0,
  absent: 0,
  leave: 0,
  clockedOut: 0,
  inHouse: 0,
  notClocked: 0,
};

function formatTime(value?: string | null) {
  if (!value) return '—';
  const dt = new Date(value);
  return dt.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' });
}

function formatMethod(value?: string | null) {
  if (!value) return '—';
  return value
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AttendancePage() {
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput.trim(), 300);
  const [deptFilter, setDeptFilter] = useState('All Departments');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [pendingDate, setPendingDate] = useState<Date | undefined>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [modal, setModal] = useState<{
    open: boolean;
    type: 'in' | 'out' | 'manual';
    staff?: StaffRecord;
  } | null>(null);
  const [limit, setLimit] = useState(10);
  const [page, setPage] = useState(1);
  const [drawer, setDrawer] = useState<StaffRecord | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [error, setError] = useState('');

  const { data, isLoading, error: listError } = useAttendanceList({
    page,
    limit,
    search: debouncedSearch || undefined,
    department: deptFilter !== 'All Departments' ? deptFilter : undefined,
    date: selectedDate ?? new Date(),
  });
  const records = data?.data ?? [];
  const stats = data?.stats ?? emptyStats;
  const { data: deptList = [] } = useDepartments();
  const departments = ['All Departments', ...deptList.map((d) => d.name)];
  const meta = data?.meta ?? null;
  const adminClockIn = useAdminClockIn();
  const adminClockOut = useAdminClockOut();
  const listErrorMsg =
    (listError as any)?.response?.data?.message ?? (listError as any)?.message ?? '';

  const todayLabel = useMemo(() => {
    if (!selectedDate) return new Date().toISOString().slice(0, 10);
    return format(selectedDate, 'yyyy-MM-dd');
  }, [selectedDate]);

  useEffect(() => {
    setPage(1);
  }, [limit, debouncedSearch, deptFilter, selectedDate?.getTime()]);

  useEffect(() => {
    if (!departments.includes(deptFilter)) {
      setDeptFilter('All Departments');
    }
  }, [departments, deptFilter]);

  const staffOptions = useMemo(
    () =>
      records.map((r) => ({
        id: r.id,
        name: r.name,
        department: r.department,
        position: r.position,
        status: r.status as AttendanceStatus,
      })),
    [records],
  );

  const handleClockIn = async (staffId: string, time: string, note: string) => {
    if (!staffId) return;
    const [hours, minutes] = time.split(':').map((v) => Number(v));
    const timestamp = new Date();
    timestamp.setHours(hours, minutes, 0, 0);
    await adminClockIn.mutateAsync({
      staffId,
      timestamp: timestamp.toISOString(),
      note: note || undefined,
    });
  };

  const handleClockOut = async (staffId: string, time: string, note: string) => {
    if (!staffId) return;
    const [hours, minutes] = time.split(':').map((v) => Number(v));
    const timestamp = new Date();
    timestamp.setHours(hours, minutes, 0, 0);
    await adminClockOut.mutateAsync({
      staffId,
      timestamp: timestamp.toISOString(),
      note: note || undefined,
    });
  };

  const refreshAfterAction = async (action: Promise<void>) => {
    try {
      await action;
      setModal(null);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Unable to update attendance.';
      setError(msg);
    }
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Attendance</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Today — {todayLabel} · {meta?.total ?? 0} staff scheduled
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
            <Link
              href="/attendance/clock"
              target="_blank"
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            >
              <LogIn size={14} /> Clock In
            </Link>
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
              label: 'Not Clocked',
              value: stats.notClocked,
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
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="bg-[#161b27] border border-[#1e2536] rounded-lg px-3 py-2 text-sm text-slate-300 outline-none focus:border-blue-500 transition-colors"
          >
            {[5, 10, 20, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n} per page
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2 bg-[#161b27] border border-[#1e2536] rounded-lg px-3 py-2 flex-1 min-w-48">
            <Search size={14} className="text-slate-500 shrink-0" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search staff..."
              className="bg-transparent text-sm text-slate-300 placeholder:text-slate-600 outline-none flex-1"
            />
          </div>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-2 bg-[#161b27] border border-[#1e2536] rounded-lg px-3 py-2 text-sm text-slate-300 hover:border-slate-500 transition-colors">
                <CalendarIcon size={14} className="text-slate-500" />
                {selectedDate ? format(selectedDate, 'LLL dd, y') : <span>Pick date</span>}
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="w-auto min-w-52 p-0 bg-[#161b27] border border-[#1e2536]"
              align="start"
            >
              <Calendar
                className="bg-[#161b27] border border-[#1e2536] text-white min-w-full"
                mode="single"
                defaultMonth={pendingDate}
                selected={pendingDate}
                onSelect={setPendingDate}
              />
              <div className="flex items-center gap-2 p-3 border-t border-[#1e2536]">
                <button
                  onClick={() => {
                    const nextDate = pendingDate ?? new Date();
                    setSelectedDate(nextDate);
                    setCalendarOpen(false);
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg py-2 text-xs font-semibold transition-colors"
                >
                  Apply
                </button>
                <button
                  onClick={() => {
                    const today = new Date();
                    setPendingDate(today);
                    setSelectedDate(today);
                    setCalendarOpen(false);
                  }}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg py-2 text-xs font-medium transition-colors"
                >
                  Today
                </button>
              </div>
            </PopoverContent>
          </Popover>
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="bg-[#161b27] border border-[#1e2536] rounded-lg px-3 py-2 text-sm text-slate-300 outline-none focus:border-blue-500 transition-colors"
          >
            {departments.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="bg-[#161b27] border border-[#1e2536] rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-[#1e2536] bg-[#0f1117]/50">
              <tr>
                {['Staff', 'Department', 'Clock In', 'Clock Out', 'Hours', 'Status', 'Method', ''].map(
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
              {records.map((r) => {
                const canClockIn = !r.clockInAt && r.status !== 'Absent' && r.status !== 'Leave';
                const canClockOut = !!r.clockInAt && !r.clockOutAt;
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
                      {r.clockInAt ? (
                        <span className="text-sm font-mono text-emerald-400 flex items-center gap-1.5">
                          <LogIn size={12} />
                          {formatTime(r.clockInAt)}
                        </span>
                      ) : (
                        <span className="text-sm text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {r.clockOutAt ? (
                        <span className="text-sm font-mono text-violet-400 flex items-center gap-1.5">
                          <LogOut size={12} />
                          {formatTime(r.clockOutAt)}
                        </span>
                      ) : (
                        <span className="text-sm text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {r.hoursWorked ? (
                        <span className="text-sm font-semibold text-slate-300">{r.hoursWorked}h</span>
                      ) : r.clockInAt && !r.clockOutAt ? (
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
                        {formatMethod(r.method)}
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
                          onClick={() => {
                            setDrawer(r);
                            setDrawerOpen(true);
                          }}
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
          {/* {isLoading && (
            <div className="py-10 text-center text-slate-500 text-sm">Loading attendance…</div>
          )} */}
          {!isLoading && records.length === 0 && (
            <div className="py-14 text-center">
              <Users size={28} className="text-slate-700 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">
                {error || listErrorMsg || 'No staff match your filters'}
              </p>
            </div>
          )}
          {meta && (
            <Pagination meta={meta} currentPage={page} handlePageChange={setPage} />
          )}
        </div>
      </div>

      {/* Clock modals */}
      {modal?.open && modal.type === 'in' && (
        <ClockModal
          type="in"
          staff={modal.staff}
          staffOptions={staffOptions}
          onClose={() => setModal(null)}
          onSave={(id, time, note) => refreshAfterAction(handleClockIn(id, time, note))}
        />
      )}
      {modal?.open && modal.type === 'out' && (
        <ClockModal
          type="out"
          staff={modal.staff}
          staffOptions={staffOptions}
          onClose={() => setModal(null)}
          onSave={(id, time, note) => refreshAfterAction(handleClockOut(id, time, note))}
        />
      )}

      {modal?.open && modal.type === 'manual' && (
        <ClockModal
          type="manual"
          staffOptions={staffOptions}
          onClose={() => setModal(null)}
          onSave={(id, time, note) => refreshAfterAction(handleClockIn(id, time, note))}
        />
      )}

      {/* History drawer */}
      <HistoryDrawer
        isOpen={drawerOpen}
        staff={drawer}
        onClose={() => {
          setDrawer(null);
          setDrawerOpen(false);
        }}
      />
    </>
  );
}
