'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CalendarCheck,
  List,
  Calendar,
  Search,
  Plus,
  ChevronRight,
  ChevronLeft,
  Users,
  BedDouble,
  Loader2,
} from 'lucide-react';
import { STATUS_CONFIG, SOURCE_COLORS, type ReservationStatus } from '@/lib/reservations-data';
import { useReservations, type ApiReservation } from '@/hooks/useReservations';
import { useDebounce } from '@/hooks/useDebounce';
import Pagination from '@/components/ui/pagination';
import NewReservationModal from './_components/NewReservationModal';
import { usePermissions } from '@/hooks/usePermissions';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtMoney(n: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(n);
}
function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const ALL_STATUSES: ReservationStatus[] = [
  'PENDING',
  'CONFIRMED',
  'CHECKED_IN',
  'CHECKED_OUT',
  'CANCELLED',
  'NO_SHOW',
];
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: ReservationStatus }) {
  const s = STATUS_CONFIG[status];
  return (
    <span
      className={`text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1.5 w-fit border ${s.bg} ${s.color} ${s.border}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
      {s.label}
    </span>
  );
}

// ─── Calendar View ────────────────────────────────────────────────────────────
function CalendarView({
  reservations,
  onSelect,
}: {
  reservations: ApiReservation[];
  onSelect: (id: string) => void;
}) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () =>
    month === 0 ? (setMonth(11), setYear((y) => y - 1)) : setMonth((m) => m - 1);
  const nextMonth = () =>
    month === 11 ? (setMonth(0), setYear((y) => y + 1)) : setMonth((m) => m + 1);

  const isToday = (d: number) =>
    today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;

  const getResForDay = (day: number) => {
    const date = new Date(year, month, day);
    return reservations.filter(
      (r) =>
        r.status !== 'CANCELLED' &&
        r.status !== 'NO_SHOW' &&
        new Date(r.checkIn) <= date &&
        new Date(r.checkOut) > date,
    );
  };

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="bg-[#161b27] border border-[#1e2536] rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e2536]">
        <button
          onClick={prevMonth}
          className="w-8 h-8 rounded-lg bg-[#0f1117] border border-[#1e2536] flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ChevronLeft size={15} />
        </button>
        <p className="text-sm font-bold text-white">
          {MONTHS[month]} {year}
        </p>
        <button
          onClick={nextMonth}
          className="w-8 h-8 rounded-lg bg-[#0f1117] border border-[#1e2536] flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ChevronRight size={15} />
        </button>
      </div>
      <div className="grid grid-cols-7 border-b border-[#1e2536]">
        {DAYS.map((d) => (
          <div
            key={d}
            className="py-2 text-center text-xs font-medium text-slate-500 uppercase tracking-wider"
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          if (!day)
            return <div key={`e${i}`} className="h-24 border-r border-b border-[#1e2536]" />;
          const dayRes = getResForDay(day);
          return (
            <div
              key={day}
              className={`h-24 border-r border-b border-[#1e2536] p-1.5 flex flex-col gap-0.5 ${isToday(day) ? 'bg-blue-500/5' : 'hover:bg-white/[0.01]'} transition-colors`}
            >
              <span
                className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full shrink-0 ${isToday(day) ? 'bg-blue-500 text-white' : 'text-slate-400'}`}
              >
                {day}
              </span>
              <div className="flex flex-col gap-0.5 overflow-hidden flex-1">
                {dayRes.slice(0, 2).map((r) => {
                  const s = STATUS_CONFIG[r.status];
                  return (
                    <button
                      key={r.id}
                      onClick={() => onSelect(r.id)}
                      className={`text-[10px] font-medium px-1.5 py-0.5 rounded truncate text-left hover:opacity-80 transition-opacity ${s.bg} ${s.color}`}
                    >
                      {r.guest?.firstName} · {r.room?.number}
                    </button>
                  );
                })}
                {dayRes.length > 2 && (
                  <span className="text-[10px] text-slate-600 px-1">+{dayRes.length - 2} more</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ReservationsPage() {
  const router = useRouter();
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReservationStatus | 'All'>('All');
  const [page, setPage] = useState(1);
  const [showNew, setShowNew] = useState(false);
  const [limit, setLimit] = useState(20);
  const { can } = usePermissions();

  const debouncedSearch = useDebounce(search, 400);
  const resetPage = () => setPage(1);

  const { data, isLoading, isFetching } = useReservations({
    status: statusFilter !== 'All' ? statusFilter : undefined,
    search: debouncedSearch || undefined,
    page,
    limit,
  });

  const reservations = data?.reservations ?? [];
  const stats = data?.stats;

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              Reservations
              {isFetching && !isLoading && (
                <Loader2 size={14} className="animate-spin text-slate-500" />
              )}
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              {data?.total ?? '—'} total
              {stats &&
                ` · ${stats.arrivals} arrival${stats.arrivals !== 1 ? 's' : ''} · ${stats.departures} departure${stats.departures !== 1 ? 's' : ''} today`}
            </p>
          </div>
          {can('create:reservations') && (
            <button
              onClick={() => setShowNew(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            >
              <Plus size={15} /> New Reservation
            </button>
          )}
        </div>

        {/* Today's stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              label: "Today's Arrivals",
              value: stats?.arrivals,
              color: 'text-blue-400',
              bg: 'bg-blue-500/10   border-blue-500/20',
            },
            {
              label: "Today's Departures",
              value: stats?.departures,
              color: 'text-violet-400',
              bg: 'bg-violet-500/10 border-violet-500/20',
            },
            {
              label: 'In House',
              value: stats?.inHouse,
              color: 'text-emerald-400',
              bg: 'bg-emerald-500/10 border-emerald-500/20',
            },
            {
              label: 'Pending Confirm',
              value: stats?.pending,
              color: 'text-amber-400',
              bg: 'bg-amber-500/10  border-amber-500/20',
            },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={`${bg} border rounded-xl px-4 py-4`}>
              <p className={`text-2xl font-bold ${color}`}>{value ?? '—'}</p>
              <p className="text-xs text-slate-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Status pills */}
        <div className="flex flex-wrap gap-2">
          {(['All', ...ALL_STATUSES] as const).map((s) => {
            const active = statusFilter === s;
            const cfg = s !== 'All' ? STATUS_CONFIG[s] : null;
            return (
              <button
                key={s}
                onClick={() => {
                  setStatusFilter(s as any);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5 ${active ? (cfg ? `${cfg.bg} ${cfg.border} ${cfg.color}` : 'bg-blue-600/20 border-blue-500/30 text-blue-400') : 'bg-[#161b27] border-[#1e2536] text-slate-400 hover:text-slate-200'}`}
              >
                {cfg && <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />}
                {s === 'All' ? 'All' : cfg!.label}
              </button>
            );
          })}
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-3 items-center">
          <select
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              resetPage();
            }}
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
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search guest, room, reservation no…"
              className="bg-transparent text-sm text-slate-300 placeholder:text-slate-600 outline-none flex-1"
            />
          </div>
          <div className="flex bg-[#161b27] border border-[#1e2536] rounded-lg p-1 gap-0.5">
            <button
              onClick={() => setView('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${view === 'list' ? 'bg-blue-600/20 text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <List size={14} /> List
            </button>
            <button
              onClick={() => setView('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${view === 'calendar' ? 'bg-blue-600/20 text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <Calendar size={14} /> Calendar
            </button>
          </div>
        </div>

        {/* List */}
        {view === 'list' && (
          <div className="bg-[#161b27] border border-[#1e2536] rounded-xl overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 size={24} className="animate-spin text-slate-500" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead className="border-b border-[#1e2536] bg-[#0f1117]/50">
                    <tr>
                      {[
                        '#',
                        'Reservation',
                        'Guest',
                        'Room',
                        'Check-in',
                        'Check-out',
                        'Guests',
                        'Total',
                        'Balance',
                        'Source',
                        'Status',
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
                    {reservations.map((r, index) => {
                      const balance = Number(r.totalAmount) - Number(r.paidAmount);
                      const nights = Math.ceil(
                        (new Date(r.checkOut).getTime() - new Date(r.checkIn).getTime()) /
                          86_400_000,
                      );
                      return (
                        <tr
                          key={r.id}
                          onClick={() => router.push(`/reservations/${r.id}`)}
                          className="border-b border-[#1e2536] last:border-0 hover:bg-white/[0.02] transition-colors cursor-pointer"
                        >
                          <td className="px-4 py-3 text-xs text-slate-600">
                            {(page - 1) * limit + index + 1}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500 font-mono whitespace-nowrap">
                            {r.reservationNo}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500/30 to-violet-500/30 border border-white/10 flex items-center justify-center text-xs font-bold text-white shrink-0">
                                {r.guest?.firstName?.[0]}
                                {r.guest?.lastName?.[0]}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-slate-200 capitalize">
                                  {r.guest?.firstName} {r.guest?.lastName}
                                </p>
                                {r.company && (
                                  <p className="text-[10px] text-slate-500">{r.company.name}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm font-bold text-white">Room {r.room?.number}</p>
                            <p className="text-xs text-slate-500">{r.room?.type}</p>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                            {fmt(r.checkIn)}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                            {fmt(r.checkOut)}
                            <span className="text-slate-600 ml-1">({nights}n)</span>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                            <span className="flex items-center gap-1">
                              <Users size={11} className="text-slate-600" />
                              {r.adults + r.children}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-slate-200 whitespace-nowrap">
                            {fmtMoney(Number(r.totalAmount))}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {balance > 0 ? (
                              <span className="text-xs text-red-400">Owes {fmtMoney(balance)}</span>
                            ) : (
                              <span className="text-xs text-emerald-400">Paid</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`text-xs font-medium whitespace-nowrap ${SOURCE_COLORS[r.source] ?? 'text-slate-400'}`}
                            >
                              {r.source}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={r.status} />
                          </td>
                          <td className="px-4 py-3">
                            <ChevronRight size={16} className="text-slate-600" />
                          </td>
                        </tr>
                      );
                    })}
                    {reservations.length === 0 && !isLoading && (
                      <tr>
                        <td colSpan={12} className="py-16 text-center">
                          <CalendarCheck size={32} className="text-slate-700 mx-auto mb-3" />
                          <p className="text-slate-500 text-sm">
                            No reservations match your filters
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {data?.meta && reservations.length > 0 && (
              <Pagination meta={data.meta} currentPage={page} handlePageChange={setPage} />
            )}
          </div>
        )}

        {/* Calendar */}
        {view === 'calendar' && (
          <CalendarView
            reservations={reservations}
            onSelect={(id) => router.push(`/reservations/${id}`)}
          />
        )}
      </div>

      <NewReservationModal isOpen={showNew} onClose={() => setShowNew(false)} />
    </>
  );
}
