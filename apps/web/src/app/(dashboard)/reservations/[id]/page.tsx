'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  CalendarCheck,
  BedDouble,
  Users,
  DollarSign,
  Pencil,
  X,
  Check,
  CheckCircle2,
  XCircle,
  LogIn,
  LogOut,
  Clock,
  FileText,
  Plus,
  ChevronRight,
  Loader2,
  AlertTriangle,
  MessageSquare,
  Building2,
  Star,
  MapPin,
  FileSpreadsheet,
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { STATUS_CONFIG, SOURCE_COLORS, type ReservationStatus } from '@/lib/reservations-data';
import {
  useReservation,
  useCheckIn,
  useCheckOut,
  useCancelReservation,
  useNoShow,
  useAddFolioItem,
} from '@/hooks/useReservations';
import { useReservationFolioItems } from '@/hooks/useFolioItems';

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
function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
function nightsBetween(a: string, b: string) {
  return Math.ceil((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
}

const FOLIO_CATEGORIES = ['ROOM', 'FOOD', 'LAUNDRY', 'SPA', 'MISC'];
const FOLIO_STYLE: Record<string, string> = {
  ROOM: 'bg-blue-500/15 text-blue-400',
  FOOD: 'bg-emerald-500/15 text-emerald-400',
  SPA: 'bg-violet-500/15 text-violet-400',
  LAUNDRY: 'bg-cyan-500/15 text-cyan-400',
  MISC: 'bg-amber-500/15 text-amber-400',
};

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

// ─── Add Folio Modal ──────────────────────────────────────────────────────────
function AddFolioModal({ reservationId, onClose }: { reservationId: string; onClose: () => void }) {
  const addItem = useAddFolioItem(reservationId);
  const [form, setForm] = useState({ description: '', amount: '', category: 'MISC', quantity: 1 });
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!form.description.trim()) return setError('Description is required.');
    if (!form.amount || Number(form.amount) === 0) return setError('Amount is required.');
    setError('');
    try {
      await addItem.mutateAsync({
        description: form.description,
        amount: Number(form.amount),
        category: form.category,
        quantity: form.quantity,
      });
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to add charge.');
    }
  };

  const inputCls =
    'w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-blue-500 transition-colors';

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#161b27] border border-[#1e2536] rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#1e2536]">
          <h2 className="text-base font-bold text-white">Add Folio Charge</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
              Description
            </label>
            <input
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="e.g. Room service — Jollof Rice"
              className={inputCls}
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
                Amount (₦)
              </label>
              <input
                type="number"
                min={0}
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder="5000"
                className={inputCls}
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
                Qty
              </label>
              <input
                type="number"
                min={1}
                value={form.quantity}
                onChange={(e) => setForm((f) => ({ ...f, quantity: Number(e.target.value) }))}
                className={inputCls}
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
              Category
            </label>
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className={inputCls}
            >
              {FOLIO_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>
        <div className="flex gap-3 px-5 pb-5">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg border border-[#1e2536] text-slate-400 text-sm hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={addItem.isPending}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
          >
            {addItem.isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Check size={14} />
            )}
            Add Charge
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ─── Tab ──────────────────────────────────────────────────────────────────────
function Tab({
  label,
  active,
  icon: Icon,
  onClick,
}: {
  label: string;
  active: boolean;
  icon: any;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap border ${active ? 'bg-blue-600/20 text-blue-400 border-blue-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border-transparent'}`}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
type ActiveTab = 'overview' | 'folio' | 'timeline';

export default function ReservationDetailPage() {
  const router = useRouter();
  const { id } = useParams();
  const resId = id as string;

  const { data: res, isLoading, isError } = useReservation(resId);
  const checkIn = useCheckIn(resId);
  const checkOut = useCheckOut(resId);
  const cancel = useCancelReservation(resId);
  const noShow = useNoShow(resId);
  const {
    data: folioPages,
    isLoading: isFolioLoading,
    hasNextPage: hasMoreFolio,
    fetchNextPage: loadMoreFolio,
    isFetchingNextPage: isLoadingMoreFolio,
  } = useReservationFolioItems(resId, { limit: 5, enabled: !!resId });

  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [showFolio, setShowFolio] = useState(false);

  if (isLoading)
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin text-slate-500" />
      </div>
    );
  if (isError || !res)
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <CalendarCheck size={40} className="text-slate-700" />
        <p className="text-slate-500">Reservation not found</p>
        <button
          onClick={() => router.push('/reservations')}
          className="text-blue-400 text-sm hover:underline"
        >
          Back to Reservations
        </button>
      </div>
    );

  const nights = nightsBetween(res.checkIn, res.checkOut);
  const balance = Number(res.totalAmount) - Number(res.paidAmount);
  const folioItems = folioPages?.pages.flatMap((p) => p.items) ?? [];
  const folioTotal = folioItems.reduce((s, f) => s + Number(f.amount), 0);
  const s = STATUS_CONFIG[res.status];

  // Timeline from reservation events (derived from available data)
  const timeline = [
    {
      label: 'Reservation created',
      date: res.createdAt,
      icon: CalendarCheck,
      color: 'text-blue-400',
    },
    res.status !== 'PENDING'
      ? {
          label: 'Status: ' + STATUS_CONFIG[res.status].label,
          date: res.updatedAt,
          icon: CheckCircle2,
          color: s.color,
        }
      : null,
  ].filter(Boolean) as any[];

  const actionBtn = () => {
    if (res.status === 'CONFIRMED' || res.status === 'PENDING')
      return (
        <button
          onClick={() => checkIn.mutate()}
          disabled={checkIn.isPending}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
        >
          {checkIn.isPending ? <Loader2 size={14} className="animate-spin" /> : <LogIn size={14} />}
          Check In
        </button>
      );
    if (res.status === 'CHECKED_IN')
      return (
        <button
          onClick={() => checkOut.mutate()}
          disabled={checkOut.isPending}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
        >
          {checkOut.isPending ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <LogOut size={14} />
          )}
          Check Out
        </button>
      );
    return null;
  };

  return (
    <div className="space-y-6 max-w-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-lg bg-[#161b27] border border-[#1e2536] flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors shrink-0"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-white tracking-tight">
                {res.guest?.firstName} {res.guest?.lastName}
              </h1>
              {res.guest?.isVip && (
                <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  <Star size={10} className="fill-amber-400" /> VIP
                </span>
              )}
              <StatusBadge status={res.status} />
            </div>
            <p className="text-slate-500 text-sm mt-0.5 flex items-center gap-2">
              <span className="font-mono text-slate-600">{res.reservationNo}</span>
              · <MapPin size={12} /> Room {res.room?.number}·{' '}
              <span className={SOURCE_COLORS[res.source] ?? 'text-slate-400'}>{res.source}</span>
              {res.company && (
                <span className="flex items-center gap-1">
                  <Building2 size={11} /> {res.company.name}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {(res.status === 'CONFIRMED' || res.status === 'PENDING') && (
            <button
              onClick={() => {
                if (confirm('Mark as no-show?')) noShow.mutate();
              }}
              disabled={noShow.isPending}
              className="flex items-center gap-2 bg-[#161b27] border border-[#1e2536] hover:border-orange-500/30 text-slate-400 hover:text-orange-400 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              No Show
            </button>
          )}
          {!['CHECKED_IN', 'CHECKED_OUT', 'CANCELLED'].includes(res.status) && (
            <button
              onClick={() => {
                if (confirm('Cancel this reservation?')) cancel.mutate();
              }}
              disabled={cancel.isPending}
              className="flex items-center gap-2 bg-[#161b27] border border-[#1e2536] hover:border-red-500/30 text-slate-400 hover:text-red-400 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <XCircle size={14} /> Cancel
            </button>
          )}
          {actionBtn()}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Check-in', value: fmt(res.checkIn), sub: 'Arrival' },
          {
            label: 'Check-out',
            value: fmt(res.checkOut),
            sub: `${nights} night${nights !== 1 ? 's' : ''}`,
          },
          {
            label: 'Total',
            value: fmtMoney(Number(res.totalAmount)),
            sub: balance > 0 ? `Owes ${fmtMoney(balance)}` : 'Fully paid',
          },
          {
            label: 'Guests',
            value: String(res.adults + res.children),
            sub: `${res.adults} adult${res.adults !== 1 ? 's' : ''}${res.children ? ` + ${res.children} child${res.children !== 1 ? 'ren' : ''}` : ''}`,
          },
        ].map(({ label, value, sub }) => (
          <div key={label} className="bg-[#161b27] border border-[#1e2536] rounded-xl px-4 py-4">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{label}</p>
            <p className="text-xl font-bold text-white">{value}</p>
            <p
              className={`text-xs mt-0.5 ${label === 'Total' && balance > 0 ? 'text-red-400' : 'text-slate-600'}`}
            >
              {sub}
            </p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#161b27] border border-[#1e2536] rounded-xl p-1 w-fit">
        <Tab
          label="Overview"
          active={activeTab === 'overview'}
          icon={CalendarCheck}
          onClick={() => setActiveTab('overview')}
        />
        <Tab
          label="Folio"
          active={activeTab === 'folio'}
          icon={DollarSign}
          onClick={() => setActiveTab('folio')}
        />
        <Tab
          label="Timeline"
          active={activeTab === 'timeline'}
          icon={Clock}
          onClick={() => setActiveTab('timeline')}
        />
      </div>

      {/* ── Overview ── */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="md:col-span-2 space-y-5">
            {/* Guest */}
            <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5">
              <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-4">
                Guest
              </p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500/30 to-violet-500/30 border border-white/10 flex items-center justify-center text-lg font-bold text-white shrink-0">
                  {res.guest?.firstName?.[0]}
                  {res.guest?.lastName?.[0]}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => router.push(`/guests/${res.guestId}`)}
                      className="text-base font-bold text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
                    >
                      {res.guest?.firstName} {res.guest?.lastName} <ChevronRight size={14} />
                    </button>
                    {res.guest?.isVip && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                        VIP
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">{res.guest?.phone}</p>
                </div>
              </div>
              {res.company && (
                <div className="mt-3 pt-3 border-t border-[#1e2536]">
                  <p className="text-xs text-slate-500 flex items-center gap-1.5">
                    <Building2 size={11} /> Corporate: {res.company.name}
                    {res.company.contactName && (
                      <span className="text-slate-600">· {res.company.contactName}</span>
                    )}
                  </p>
                </div>
              )}
              {res.groupBooking && (
                <div className="mt-2">
                  <p className="text-xs text-slate-500 flex items-center gap-1.5">
                    <Users size={11} /> Group: {res.groupBooking.name} ({res.groupBooking.groupNo})
                  </p>
                </div>
              )}
              {/* Additional guests */}
              {res.guests && res.guests.length > 1 && (
                <div className="mt-3 pt-3 border-t border-[#1e2536]">
                  <p className="text-xs text-slate-500 mb-2">Additional guests</p>
                  <div className="space-y-1.5">
                    {res.guests
                      .filter((g) => g.role !== 'PRIMARY')
                      .map((rg) => (
                        <div key={rg.id} className="flex items-center gap-2 text-sm text-slate-400">
                          <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                            {rg.guest.firstName[0]}
                            {rg.guest.lastName[0]}
                          </div>
                          {rg.guest.firstName} {rg.guest.lastName}
                          <span className="text-[10px] text-slate-600">{rg.role}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* Booking details */}
            <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5">
              <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-4">
                Booking Details
              </p>
              <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                {[
                  { label: 'Reservation No', value: res.reservationNo },
                  { label: 'Source', value: res.source },
                  { label: 'Room', value: `Room ${res.room?.number}` },
                  { label: 'Room Type', value: res.room?.type ?? '—' },
                  { label: 'Floor', value: res.room?.floor?.name ?? '—' },
                  { label: 'Booking Type', value: res.bookingType },
                  { label: 'Check-in', value: fmt(res.checkIn) },
                  { label: 'Check-out', value: fmt(res.checkOut) },
                  { label: 'Duration', value: `${nights} night${nights !== 1 ? 's' : ''}` },
                  { label: 'Adults', value: String(res.adults) },
                  { label: 'Children', value: String(res.children) },
                  {
                    label: 'Rate / Night',
                    value: res.room?.baseRate ? fmtMoney(Number(res.room.baseRate)) : '—',
                  },
                  { label: 'Total Amount', value: fmtMoney(Number(res.totalAmount)) },
                  { label: 'Paid', value: fmtMoney(Number(res.paidAmount)) },
                  { label: 'Balance', value: balance > 0 ? fmtMoney(balance) : 'Settled' },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-xs text-slate-600">{label}</p>
                    <p className="text-sm text-slate-200 font-medium mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
              {res.specialRequests && (
                <div className="mt-4 pt-4 border-t border-[#1e2536] flex items-start gap-2">
                  <AlertTriangle size={13} className="text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-400/90">{res.specialRequests}</p>
                </div>
              )}
              {res.notes && (
                <div className="mt-3 flex items-start gap-2">
                  <MessageSquare size={13} className="text-slate-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-500">{res.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Right */}
          <div className="space-y-5">
            {/* Payment */}
            <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5">
              <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-4">
                Payment
              </p>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500">Total charged</span>
                  <span className="text-sm font-semibold text-slate-200">
                    {fmtMoney(Number(res.totalAmount))}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500">Amount paid</span>
                  <span className="text-sm font-semibold text-emerald-400">
                    {fmtMoney(Number(res.paidAmount))}
                  </span>
                </div>
                <div className="h-px bg-[#1e2536]" />
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400 font-medium">Balance due</span>
                  <span
                    className={`text-base font-bold ${balance > 0 ? 'text-red-400' : 'text-emerald-400'}`}
                  >
                    {balance > 0 ? fmtMoney(balance) : 'Paid ✓'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500">Payment status</span>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      res.paymentStatus === 'PAID'
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : res.paymentStatus === 'PARTIAL'
                          ? 'bg-amber-500/15   text-amber-400'
                          : 'bg-red-500/15     text-red-400'
                    }`}
                  >
                    {res.paymentStatus}
                  </span>
                </div>
              </div>
              {balance > 0 && (
                <button className="mt-4 w-full bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/20 text-emerald-400 rounded-lg py-2 text-sm font-semibold transition-colors">
                  + Record Payment
                </button>
              )}
            </div>

            {/* Quick actions */}
            <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5">
              <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-3">
                Quick Actions
              </p>
              <div className="space-y-2">
                {[
                  {
                    label: 'View Room',
                    icon: BedDouble,
                    color: 'text-blue-400    hover:bg-blue-500/10',
                    action: () => router.push(`/rooms/${res.roomId}`),
                  },
                  {
                    label: 'View Guest',
                    icon: Users,
                    color: 'text-violet-400  hover:bg-violet-500/10',
                    action: () => router.push(`/guests/${res.guestId}`),
                  },
                  {
                    label: 'Add Charge',
                    icon: FileText,
                    color: 'text-amber-400   hover:bg-amber-500/10',
                    action: () => setShowFolio(true),
                  },
                ].map(({ label, icon: Icon, color, action }) => (
                  <button
                    key={label}
                    onClick={action}
                    className={`w-full flex items-center gap-2.5 text-sm font-medium text-slate-400 ${color} px-3 py-2 rounded-lg transition-colors text-left`}
                  >
                    <Icon size={14} />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Folio ── */}
      {activeTab === 'folio' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">
                Folio — {res.guest?.firstName} {res.guest?.lastName}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {res.reservationNo} · Room {res.room?.number} · {fmt(res.checkIn)} →{' '}
                {fmt(res.checkOut)}
              </p>
            </div>
            <div className='flex items-center gap-2'>
              <button
                onClick={() => setShowFolio(true)}
                className="flex items-center gap-1.5 text-xs bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 px-3 py-1.5 rounded-lg font-medium transition-colors"
              >
                <Plus size={12} /> Add Charge
              </button>
              <button
                onClick={() => setShowFolio(true)}
                className="flex items-center gap-1.5 text-xs bg-red-500/15 text-red-400 hover:bg-red-500/25 px-3 py-1.5 rounded-lg font-medium transition-colors"
              >
                <FileSpreadsheet size={12} /> Export
              </button>
            </div>
          </div>

          {isFolioLoading ? (
            <div className="py-10 text-center bg-[#161b27] border border-[#1e2536] rounded-xl">
              <Loader2 size={20} className="animate-spin text-slate-500 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">Loading folio…</p>
            </div>
          ) : folioItems.length > 0 ? (
            <div className="bg-[#161b27] border border-[#1e2536] rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="border-b border-[#1e2536] bg-[#0f1117]/50">
                  <tr>
                    {['S/N', 'Date', 'Description', 'Category', 'Qty', 'Amount'].map((h) => (
                      <th
                        key={h}
                        className="text-xs text-slate-500 uppercase tracking-wider font-medium px-4 py-3 text-left whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e2536]">
                  {folioItems.map((f, i) => (
                    <tr key={f.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                        {i + 1}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                        {fmt(f.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-300">{f.description}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${FOLIO_STYLE[f.category] ?? 'bg-slate-500/15 text-slate-400'}`}
                        >
                          {f.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {(f as any).quantity ?? 1}
                      </td>
                      <td
                        className={`px-4 py-3 text-sm font-semibold ${Number(f.amount) < 0 ? 'text-emerald-400' : 'text-slate-200'}`}
                      >
                        {Number(f.amount) < 0 ? '-' : ''}
                        {fmtMoney(Math.abs(Number(f.amount)))}
                        {Number(f.amount) < 0 && (
                          <span className="text-xs font-normal text-slate-500 ml-1">(payment)</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-5 py-3 bg-[#0f1117]/40 border-t border-[#1e2536] flex items-center justify-between">
                <div>
                  <span className="text-sm text-slate-500">Outstanding Balance</span>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Total: {fmtMoney(Number(res.totalAmount))} · Paid:{' '}
                    {fmtMoney(Number(res.paidAmount))}
                  </p>
                </div>
                <span
                  className={`text-xl font-bold ${folioTotal > 0 ? 'text-white' : 'text-emerald-400'}`}
                >
                  {fmtMoney(folioTotal)}
                </span>
              </div>
              {hasMoreFolio && (
                <div className="px-5 py-3 bg-[#0f1117]/40 border-t border-[#1e2536] flex items-center justify-end">
                  <button
                    onClick={() => loadMoreFolio()}
                    disabled={isLoadingMoreFolio}
                    className="text-xs px-3 py-1.5 rounded-lg border border-[#1e2536] text-slate-400 hover:text-white hover:border-slate-500 disabled:opacity-50 transition-colors"
                  >
                    {isLoadingMoreFolio ? 'Loading…' : 'Load more'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="py-12 text-center bg-[#161b27] border border-[#1e2536] rounded-xl">
              <DollarSign size={28} className="text-slate-700 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">No charges yet on this folio</p>
            </div>
          )}
        </div>
      )}

      {/* ── Timeline ── */}
      {activeTab === 'timeline' && (
        <div className="space-y-4">
          <p className="text-sm font-semibold text-white">Activity</p>
          <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5">
            <div className="relative">
              <div className="absolute left-3.5 top-4 bottom-4 w-px bg-[#1e2536]" />
              <div className="space-y-6">
                {timeline.map((item, i) => (
                  <div key={i} className="flex items-start gap-4 relative">
                    <div className="w-7 h-7 rounded-full bg-[#0f1117] border border-[#1e2536] flex items-center justify-center shrink-0 z-10">
                      <item.icon size={12} className={item.color} />
                    </div>
                    <div className="flex-1 pt-0.5">
                      <p className="text-sm text-slate-200 font-medium">{item.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{fmtDateTime(item.date)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {showFolio && <AddFolioModal reservationId={resId} onClose={() => setShowFolio(false)} />}
    </div>
  );
}
