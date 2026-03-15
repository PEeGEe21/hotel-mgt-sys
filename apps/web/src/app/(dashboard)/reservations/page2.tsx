'use client';

import { useState, useMemo } from 'react';
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
  X,
  Check,
  AlertCircle,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import {
  reservations as seedReservations,
  STATUS_CONFIG,
  SOURCE_COLORS,
  type ReservationStatus,
  type Reservation,
} from '@/lib/reservations-data';
import { rooms } from '@/lib/rooms-data';

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

function StatusBadge({ status }: { status: ReservationStatus }) {
  const s = STATUS_CONFIG[status];
  return (
    <span
      className={`text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1.5 w-fit border ${s.bg} ${s.color} ${s.border}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
      {status}
    </span>
  );
}

// ─── New Reservation Modal ─────────────────────────────────────────────────────
function NewReservationModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    guestName: '',
    guestEmail: '',
    guestPhone: '',
    roomId: '',
    checkIn: '',
    checkOut: '',
    adults: 2,
    children: 0,
    source: 'Direct',
    notes: '',
  });

  const selectedRoom = rooms.find((r) => r.id === form.roomId);
  const nights =
    form.checkIn && form.checkOut
      ? Math.max(
          0,
          Math.ceil(
            (new Date(form.checkOut).getTime() - new Date(form.checkIn).getTime()) / 86400000,
          ),
        )
      : 0;
  const total = selectedRoom ? nights * selectedRoom.baseRate : 0;
  const availableRooms = rooms.filter(
    (r) => r.status === 'Available'.toUpperCase() || r.status === 'Reserved'.toUpperCase(),
  );
  const canNext1 = form.guestName.trim() && form.guestEmail.trim();
  const canNext2 = form.roomId && form.checkIn && form.checkOut && nights > 0;

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    setSaving(false);
    onClose();
  };

  const inputCls =
    'w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-blue-500 transition-colors';
  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
      <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
        {label}
      </label>
      {children}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#161b27] border border-[#1e2536] rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[#1e2536]">
          <div>
            <h2 className="text-base font-bold text-white">New Reservation</h2>
            <p className="text-xs text-slate-500 mt-0.5">Step {step} of 3</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
            <X size={18} />
          </button>
        </div>

        {/* Step indicators */}
        <div className="flex px-6 pt-4 pb-2 gap-2">
          {[
            { n: 1, label: 'Guest' },
            { n: 2, label: 'Room & Dates' },
            { n: 3, label: 'Confirm' },
          ].map(({ n, label }) => (
            <div key={n} className="flex items-center gap-2 flex-1">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${step > n ? 'bg-emerald-500 text-white' : step === n ? 'bg-blue-600 text-white' : 'bg-[#0f1117] border border-[#1e2536] text-slate-500'}`}
              >
                {step > n ? <Check size={12} /> : n}
              </div>
              <span
                className={`text-xs font-medium ${step === n ? 'text-slate-200' : 'text-slate-600'}`}
              >
                {label}
              </span>
              {n < 3 && (
                <div className={`flex-1 h-px ${step > n ? 'bg-emerald-500/40' : 'bg-[#1e2536]'}`} />
              )}
            </div>
          ))}
        </div>

        <div className="px-6 py-4 space-y-4 min-h-[280px]">
          {step === 1 && (
            <>
              <Field label="Guest Name">
                <input
                  value={form.guestName}
                  onChange={(e) => setForm((f) => ({ ...f, guestName: e.target.value }))}
                  placeholder="Full name"
                  className={inputCls}
                />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Email">
                  <input
                    type="email"
                    value={form.guestEmail}
                    onChange={(e) => setForm((f) => ({ ...f, guestEmail: e.target.value }))}
                    placeholder="email@example.com"
                    className={inputCls}
                  />
                </Field>
                <Field label="Phone">
                  <input
                    value={form.guestPhone}
                    onChange={(e) => setForm((f) => ({ ...f, guestPhone: e.target.value }))}
                    placeholder="+234 800 000 0000"
                    className={inputCls}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Field label="Adults">
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={form.adults}
                    onChange={(e) => setForm((f) => ({ ...f, adults: Number(e.target.value) }))}
                    className={inputCls}
                  />
                </Field>
                <Field label="Children">
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={form.children}
                    onChange={(e) => setForm((f) => ({ ...f, children: Number(e.target.value) }))}
                    className={inputCls}
                  />
                </Field>
                <Field label="Source">
                  <select
                    value={form.source}
                    onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
                    className={inputCls}
                  >
                    {['Direct', 'Booking.com', 'Expedia', 'Walk-in', 'Phone', 'Airbnb'].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </Field>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Check-in">
                  <input
                    type="date"
                    value={form.checkIn}
                    onChange={(e) => setForm((f) => ({ ...f, checkIn: e.target.value }))}
                    className={inputCls}
                  />
                </Field>
                <Field label="Check-out">
                  <input
                    type="date"
                    value={form.checkOut}
                    onChange={(e) => setForm((f) => ({ ...f, checkOut: e.target.value }))}
                    className={inputCls}
                  />
                </Field>
              </div>
              <Field label="Select Room">
                <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                  {availableRooms.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setForm((f) => ({ ...f, roomId: r.id }))}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm transition-all ${form.roomId === r.id ? 'bg-blue-600/20 border-blue-500/30 text-blue-400' : 'bg-[#0f1117] border-[#1e2536] text-slate-300 hover:border-slate-600'}`}
                    >
                      <span className="flex items-center gap-2">
                        <BedDouble
                          size={13}
                          className={form.roomId === r.id ? 'text-blue-400' : 'text-slate-500'}
                        />
                        <span className="font-semibold">Room {r.number}</span>
                        <span className="text-xs text-slate-500">
                          {r.type} · {r.beds}
                        </span>
                      </span>
                      <span className="font-bold">
                        ${r.baseRate}
                        <span className="text-xs font-normal text-slate-500">/n</span>
                      </span>
                    </button>
                  ))}
                </div>
              </Field>
              {nights > 0 && selectedRoom && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg px-4 py-3 flex items-center justify-between">
                  <span className="text-sm text-blue-300">
                    {nights} nights × ${selectedRoom.baseRate}
                  </span>
                  <span className="text-base font-bold text-white">${total.toLocaleString()}</span>
                </div>
              )}
              <Field label="Special Requests">
                <input
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Any special requests..."
                  className={inputCls}
                />
              </Field>
            </>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="bg-[#0f1117] border border-[#1e2536] rounded-xl p-4 space-y-3">
                <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-3">
                  Reservation Summary
                </p>
                {[
                  { label: 'Guest', value: form.guestName },
                  { label: 'Contact', value: form.guestEmail },
                  {
                    label: 'Room',
                    value: selectedRoom
                      ? `Room ${selectedRoom.number} — ${selectedRoom.type}`
                      : '—',
                  },
                  { label: 'Check-in', value: form.checkIn },
                  { label: 'Check-out', value: form.checkOut },
                  { label: 'Duration', value: `${nights} nights` },
                  {
                    label: 'Guests',
                    value: `${form.adults} adults${form.children > 0 ? ` + ${form.children} children` : ''}`,
                  },
                  { label: 'Source', value: form.source },
                  { label: 'Total', value: `$${total.toLocaleString()}`, bold: true },
                ].map(({ label, value, bold }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">{label}</span>
                    <span
                      className={`text-sm ${bold ? 'text-white font-bold text-base' : 'text-slate-200 font-medium'}`}
                    >
                      {value}
                    </span>
                  </div>
                ))}
              </div>
              {form.notes && (
                <div className="flex items-start gap-2 text-xs text-amber-400/80 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                  <AlertCircle size={13} className="shrink-0 mt-0.5" />
                  {form.notes}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-[#1e2536]">
          {step > 1 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors"
            >
              <ChevronLeft size={14} /> Back
            </button>
          )}
          <button
            onClick={onClose}
            className="bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg py-2.5 px-4 text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          {step < 3 && (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={step === 1 ? !canNext1 : !canNext2}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg py-2.5 text-sm font-semibold transition-colors"
            >
              Next <ArrowRight size={14} />
            </button>
          )}
          {step === 3 && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-70 text-white rounded-lg py-2.5 text-sm font-semibold transition-colors"
            >
              {saving ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Saving…
                </>
              ) : (
                <>
                  <Check size={14} /> Confirm Reservation
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Calendar View ─────────────────────────────────────────────────────────────
function CalendarView({
  reservations,
  onSelect,
}: {
  reservations: Reservation[];
  onSelect: (id: string) => void;
}) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else setMonth((m) => m + 1);
  };

  const isToday = (day: number) =>
    today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;

  const getResForDay = (day: number) => {
    const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return reservations.filter(
      (r) =>
        r.status !== 'CANCELLED' &&
        r.status !== 'NO_SHOW' &&
        r.checkIn <= date &&
        r.checkOut > date,
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
            return <div key={`e${i}`} className="h-28 border-r border-b border-[#1e2536]" />;
          const dayRes = getResForDay(day);
          return (
            <div
              key={day}
              className={`h-28 border-r border-b border-[#1e2536] p-1.5 flex flex-col gap-0.5 ${isToday(day) ? 'bg-blue-500/5' : 'hover:bg-white/[0.01]'} transition-colors`}
            >
              <span
                className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full shrink-0 ${isToday(day) ? 'bg-blue-500 text-white' : 'text-slate-400'}`}
              >
                {day}
              </span>
              <div className="flex flex-col gap-0.5 overflow-hidden flex-1">
                {dayRes.slice(0, 3).map((r) => {
                  const s = STATUS_CONFIG[r.status];
                  return (
                    <button
                      key={r.id}
                      onClick={() => onSelect(r.id)}
                      className={`text-[10px] font-medium px-1.5 py-0.5 rounded truncate text-left hover:opacity-80 transition-opacity ${s.bg} ${s.color}`}
                    >
                      {r.guestName.split(' ')[0]} · {r.roomNumber}
                    </button>
                  );
                })}
                {dayRes.length > 3 && (
                  <span className="text-[10px] text-slate-600 px-1">+{dayRes.length - 3} more</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function ReservationsPage() {
  const router = useRouter();
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReservationStatus | 'All'>('All');
  const [showNew, setShowNew] = useState(false);
  const [reservations] = useState<Reservation[]>(seedReservations);

  const filtered = useMemo(
    () =>
      reservations.filter((r) => {
        const matchSearch = `${r.guestName} ${r.roomNumber} ${r.id}`
          .toLowerCase()
          .includes(search.toLowerCase());
        const matchStatus = statusFilter === 'All' || r.status === statusFilter;
        return matchSearch && matchStatus;
      }),
    [reservations, search, statusFilter],
  );

  const today = '2026-03-12';
  const stats = {
    arrivals: reservations.filter(
      (r) => r.checkIn === today && (r.status === 'CONFIRMED' || r.status === 'PENDING'),
    ).length,
    departures: reservations.filter((r) => r.checkOut === today && r.status === 'CHECKED_IN')
      .length,
    inHouse: reservations.filter((r) => r.status === 'CHECKED_IN').length,
    pending: reservations.filter((r) => r.status === 'PENDING').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Reservations</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {reservations.length} total · {stats.arrivals} arrivals · {stats.departures} departures
            today
          </p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
        >
          <Plus size={15} /> New Reservation
        </button>
      </div>

      {/* Today strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: "Today's Arrivals",
            value: stats.arrivals,
            color: 'text-blue-400',
            bg: 'bg-blue-500/10 border-blue-500/20',
          },
          {
            label: "Today's Departures",
            value: stats.departures,
            color: 'text-violet-400',
            bg: 'bg-violet-500/10 border-violet-500/20',
          },
          {
            label: 'In House',
            value: stats.inHouse,
            color: 'text-emerald-400',
            bg: 'bg-emerald-500/10 border-emerald-500/20',
          },
          {
            label: 'Pending Confirm',
            value: stats.pending,
            color: 'text-amber-400',
            bg: 'bg-amber-500/10 border-amber-500/20',
          },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`${bg} border rounded-xl px-4 py-4`}>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Status pills */}
      <div className="flex flex-wrap gap-2">
        {(['All', ...ALL_STATUSES] as const).map((s) => {
          const active = statusFilter === s;
          const count =
            s === 'All' ? reservations.length : reservations.filter((r) => r.status === s).length;
          const cfg = s !== 'All' ? STATUS_CONFIG[s] : null;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5 ${active ? (cfg ? `${cfg.bg} ${cfg.border} ${cfg.color}` : 'bg-blue-600/20 border-blue-500/30 text-blue-400') : 'bg-[#161b27] border-[#1e2536] text-slate-400 hover:text-slate-200'}`}
            >
              {cfg && <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />}
              {s}
              <span
                className={`px-1.5 py-0.5 rounded-md text-[10px] ${active ? 'bg-white/20' : 'bg-white/5'}`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 bg-[#161b27] border border-[#1e2536] rounded-lg px-3 py-2 flex-1 min-w-48">
          <Search size={14} className="text-slate-500 shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search guest, room, ID..."
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
        <div className="bg-[#161b27] border border-[#1e2536] rounded-xl overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="border-b border-[#1e2536] bg-[#0f1117]/50">
              <tr>
                {[
                  'ID',
                  'Guest',
                  'Room',
                  'Check-in',
                  'Check-out',
                  'Nights',
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
              {filtered.map((r) => {
                const balance = r.totalAmount - r.amountPaid;
                return (
                  <tr
                    key={r.id}
                    onClick={() => router.push(`/reservations/${r.id}`)}
                    className="border-b border-[#1e2536] last:border-0 hover:bg-white/[0.02] transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3 text-xs text-slate-500 font-mono whitespace-nowrap">
                      {r.id}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-200 whitespace-nowrap">
                      {r.guestName}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-bold text-white">{r.roomNumber}</p>
                      <p className="text-xs text-slate-500">{r.roomType}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                      {r.checkIn}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                      {r.checkOut}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-400 text-center">{r.nights}</td>
                    <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                      <span className="flex items-center gap-1">
                        <Users size={11} className="text-slate-600" />
                        {r.adults + r.children}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-200 whitespace-nowrap">
                      ${r.totalAmount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {balance > 0 ? (
                        <span className="text-xs text-red-400">Owes ${balance}</span>
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
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={12} className="py-16 text-center">
                    <CalendarCheck size={32} className="text-slate-700 mx-auto mb-3" />
                    <p className="text-slate-500 text-sm">No reservations match your filters</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Calendar */}
      {view === 'calendar' && (
        <CalendarView
          reservations={filtered}
          onSelect={(id) => router.push(`/reservations/${id}`)}
        />
      )}

      {showNew && <NewReservationModal onClose={() => setShowNew(false)} />}
    </div>
  );
}
