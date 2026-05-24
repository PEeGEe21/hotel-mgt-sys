'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Star,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  BedDouble,
  Calendar,
  DollarSign,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  MessageSquare,
  Loader2,
  Building2,
  Users,
  Shield,
  ChevronRight,
  Check,
  X,
} from 'lucide-react';
import { useGuest, useToggleVip } from '@/hooks/useGuests';
import { useReservationFolioItems, type FolioItem } from '@/hooks/useFolioItems';
import { useAddFolioItem, useCheckOut } from '@/hooks/useReservations';
import openToast from '@/components/ToastComponent';
import EditGuestModal from '../_components/EditGuestModal';
import DeleteConfirm from '../_components/DeleteConfirm';
import NewReservationModal from '../../reservations/_components/NewReservationModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// ─── Types ────────────────────────────────────────────────────────────────────
type Reservation = {
  id: string;
  reservationNo: string;
  checkIn: string;
  checkOut: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  paidAmount: number;
  bookingType: string;
  adults: number;
  children: number;
  room: { id: string; number: string; type: string; floor?: { name: string } };
  company?: { id: string; name: string } | null;
  groupBooking?: { id: string; groupNo: string; name: string } | null;
  folioItems: FolioItem[];
};

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
function fmtMoney(n: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(n);
}
function nightCount(checkIn: string, checkOut: string) {
  return Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86_400_000);
}

const RES_STATUS: Record<string, string> = {
  CONFIRMED: 'bg-blue-500/15 text-blue-400',
  CHECKED_IN: 'bg-emerald-500/15 text-emerald-400',
  CHECKED_OUT: 'bg-slate-500/15 text-slate-400',
  PENDING: 'bg-amber-500/15 text-amber-400',
  CANCELLED: 'bg-rose-500/15 text-rose-400',
  NO_SHOW: 'bg-orange-500/15 text-orange-400',
};

const FOLIO_TYPE_STYLE: Record<string, string> = {
  ROOM: 'bg-blue-500/15 text-blue-400',
  FOOD: 'bg-emerald-500/15 text-emerald-400',
  SPA: 'bg-violet-500/15 text-violet-400',
  LAUNDRY: 'bg-cyan-500/15 text-cyan-400',
  MISC: 'bg-amber-500/15 text-amber-400',
};

const FOLIO_CATEGORIES = ['ROOM', 'FOOD', 'LAUNDRY', 'SPA', 'MISC'];

function AddFolioChargeModal({
  reservationId,
  onClose,
}: {
  reservationId: string;
  onClose: () => void;
}) {
  const addItem = useAddFolioItem(reservationId);
  const [form, setForm] = useState({
    description: '',
    amount: '',
    category: 'MISC',
    quantity: 1,
  });
  const [error, setError] = useState('');

  const inputCls =
    'w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-blue-500 transition-colors';

  const handleSave = async () => {
    if (!form.description.trim()) return setError('Description is required.');
    if (!form.amount || Number(form.amount) <= 0) return setError('Amount is required.');
    setError('');
    try {
      await addItem.mutateAsync({
        description: form.description.trim(),
        amount: Number(form.amount),
        category: form.category,
        quantity: form.quantity,
      });
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to add charge.');
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-[#1e2536] bg-[#161b27] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#1e2536] px-5 pb-4 pt-5">
          <h2 className="text-base font-bold text-white">Add Folio Charge</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-4 px-5 py-4">
          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
              Description
            </label>
            <input
              value={form.description}
              onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))}
              placeholder="e.g. Room service charge"
              className={inputCls}
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
                Amount (NGN)
              </label>
              <input
                type="number"
                min={0}
                value={form.amount}
                onChange={(e) => setForm((current) => ({ ...current, amount: e.target.value }))}
                placeholder="5000"
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
                Qty
              </label>
              <input
                type="number"
                min={1}
                value={form.quantity}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    quantity: Math.max(1, Number(e.target.value) || 1),
                  }))
                }
                className={inputCls}
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
              Category
            </label>
            <select
              value={form.category}
              onChange={(e) => setForm((current) => ({ ...current, category: e.target.value }))}
              className={inputCls}
            >
              {FOLIO_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
          {error ? (
            <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
              {error}
            </p>
          ) : null}
        </div>
        <div className="flex gap-3 px-5 pb-5">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-[#1e2536] px-4 py-2.5 text-sm text-slate-400 transition-colors hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={addItem.isPending}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
          >
            {addItem.isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Add Charge
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function ConfirmCheckOutModal({
  guestName,
  isPending,
  onClose,
  onConfirm,
}: {
  guestName: string;
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="bg-[#161b27] border border-[#1e2536] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden p-0"
      >
        <DialogHeader className="flex flex-row items-center justify-between border-b border-[#1e2536] px-5 pb-4 pt-5">
          <DialogTitle className="text-base font-bold text-white">Check Out Guest</DialogTitle>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
            <X size={18} />
          </button>
        </DialogHeader>
        <div className="px-5 py-4">
          <p className="text-sm leading-6 text-slate-400">
            This will check out {guestName} from the active reservation and close the current stay.
          </p>
        </div>
        <div className="flex gap-3 px-5 pb-5">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-[#1e2536] px-4 py-2.5 text-sm text-slate-400 transition-colors hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-500 disabled:opacity-50"
          >
            {isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            Check Out
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function GuestDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const guestId = id as string;

  const { data: guest, isLoading, isError } = useGuest(guestId);
  const toggleVip = useToggleVip(guestId);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showNewReservation, setShowNewReservation] = useState(false);
  const [showAddCharge, setShowAddCharge] = useState(false);
  const [showCheckOutConfirm, setShowCheckOutConfirm] = useState(false);

  const reservations = (guest?.reservations ?? []) as Reservation[];
  const checkedInRes = reservations.find((r) => r.status === 'CHECKED_IN');
  const checkOut = useCheckOut(checkedInRes?.id ?? '');
  const activeRes = reservations.find((r) => r.status === 'CHECKED_IN' || r.status === 'CONFIRMED');
  const totalStays = guest?._count?.reservations ?? reservations.length;
  const lifetimeValue = (guest as any)?.lifetimeValue ?? 0;

  const {
    data: activeFolioPages,
    isLoading: isFolioLoading,
    hasNextPage: hasMoreFolio,
    fetchNextPage: loadMoreFolio,
    isFetchingNextPage: isLoadingMoreFolio,
  } = useReservationFolioItems(activeRes?.id ?? '', { limit: 5, enabled: !!activeRes });
  const activeFolio = activeFolioPages?.pages.flatMap((p) => p.items) ?? ([] as FolioItem[]);
  const folioTotal = activeFolio.reduce((s, f) => s + Number(f.amount), 0);

  if (isLoading)
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin text-slate-500" />
      </div>
    );
  if (isError || !guest)
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Users size={40} className="text-slate-700" />
        <p className="text-slate-500">Guest not found</p>
        <button
          onClick={() => router.push('/guests')}
          className="text-blue-400 text-sm hover:underline"
        >
          Back to Guests
        </button>
      </div>
    );

  const statusLabel =
    activeRes?.status === 'CHECKED_IN'
      ? { label: 'Checked In', cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' }
      : activeRes?.status === 'CONFIRMED'
        ? { label: 'Reserved', cls: 'bg-blue-500/15    text-blue-400    border-blue-500/20' }
        : reservations.length > 0
          ? { label: 'Checked Out', cls: 'bg-slate-500/15   text-slate-400   border-slate-500/20' }
          : { label: 'No Stays', cls: 'bg-slate-500/10   text-slate-600   border-slate-500/10' };

  return (
    <div className="space-y-6 max-w-full">
      {/* Back + Header */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex items-start gap-4">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-lg bg-[#161b27] border border-[#1e2536] flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors shrink-0"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="flex min-w-0 items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/40 to-violet-500/40 border border-white/10 flex items-center justify-center text-xl font-bold text-white shrink-0">
              {guest.firstName[0]}
              {guest.lastName[0]}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-white">
                  {guest.firstName} {guest.lastName}
                </h1>
                {guest.isVip && (
                  <span className="flex items-center gap-1 bg-amber-500/15 text-amber-400 border border-amber-500/20 text-xs px-2.5 py-1 rounded-full font-semibold">
                    <Star size={10} className="fill-amber-400" /> VIP
                  </span>
                )}
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-medium border ${statusLabel.cls}`}
                >
                  {statusLabel.label}
                </span>
                {activeRes && (
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <BedDouble size={11} /> Room {activeRes.room.number}
                  </span>
                )}
              </div>
              <p className="text-slate-500 text-sm mt-0.5">
                {guest.nationality && `${guest.nationality} · `}
                {totalStays} stay{totalStays !== 1 ? 's' : ''} · {fmtMoney(lifetimeValue)} lifetime
                value
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end shrink-0">
          <button
            onClick={() => {
              toggleVip.mutate(undefined, {
                onSuccess: () =>
                  openToast('success', guest.isVip ? 'VIP status removed' : 'Marked as VIP'),
                onError: () => openToast('error', 'Could not update VIP status'),
              });
            }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${guest.isVip ? 'bg-amber-500/15 border-amber-500/30 text-amber-400 hover:bg-amber-500/25' : 'bg-[#161b27] border-[#1e2536] text-slate-400 hover:text-amber-400 hover:border-amber-500/30'}`}
          >
            <Star size={12} className={guest.isVip ? 'fill-amber-400' : ''} />
            {guest.isVip ? 'VIP' : 'Mark VIP'}
          </button>
          <button
            onClick={() => setShowEdit(true)}
            className="flex items-center gap-2 bg-[#161b27] border border-[#1e2536] hover:border-blue-500/40 text-slate-300 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Edit2 size={14} /> Edit
          </button>
          <button
            onClick={() => setShowDelete(true)}
            className="flex items-center gap-2 bg-red-600/10 border border-red-500/20 hover:bg-red-600/20 text-red-400 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </div>

      {/* 3-column layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* ── Left column ── */}
        <div className="space-y-5">
          {/* Contact Info */}
          <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5">
            <h2 className="text-xs text-slate-500 uppercase tracking-widest font-medium mb-4">
              Contact Information
            </h2>
            <div className="space-y-3">
              {[
                { icon: Phone, label: 'Phone', value: guest.phone },
                { icon: Mail, label: 'Email', value: guest.email ?? '—' },
                { icon: MapPin, label: 'Nationality', value: guest.nationality ?? '—' },
                { icon: CreditCard, label: guest.idType ?? 'ID', value: guest.idNumber ?? '—' },
                {
                  icon: Shield,
                  label: 'Date of Birth',
                  value: guest.dateOfBirth ? fmt(guest.dateOfBirth) : '—',
                },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#0f1117] border border-[#1e2536] flex items-center justify-center shrink-0">
                    <Icon size={13} className="text-slate-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-slate-600">{label}</p>
                    <p className="text-sm text-slate-300 truncate">{value}</p>
                  </div>
                </div>
              ))}
              {guest.address && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#0f1117] border border-[#1e2536] flex items-center justify-center shrink-0">
                    <MapPin size={13} className="text-slate-500" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-600">Address</p>
                    <p className="text-sm text-slate-300 leading-snug">{guest.address}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5">
            <h2 className="text-xs text-slate-500 uppercase tracking-widest font-medium mb-4">
              Guest Stats
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Total Stays', value: totalStays, color: 'text-blue-400' },
                { label: 'Total Spent', value: fmtMoney(lifetimeValue), color: 'text-emerald-400' },
                {
                  label: 'Avg / Stay',
                  value: totalStays > 0 ? fmtMoney(lifetimeValue / totalStays) : '—',
                  color: 'text-violet-400',
                },
                {
                  label: 'Total Nights',
                  value: reservations
                    .filter((r) => r.status === 'CHECKED_OUT')
                    .reduce((s, r) => s + nightCount(r.checkIn, r.checkOut), 0),
                  color: 'text-amber-400',
                },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-[#0f1117] border border-[#1e2536] rounded-lg p-3">
                  <p className="text-xs text-slate-600 mb-1">{label}</p>
                  <p className={`text-sm font-bold ${color}`}>{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Current Stay */}
          {activeRes && (
            <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5">
              <h2 className="text-xs text-slate-500 uppercase tracking-widest font-medium mb-4">
                Current Stay
              </h2>
              <button
                onClick={() => router.push(`/rooms/${activeRes?.room?.id}`)}
                className="w-full flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 group"
              >
                <BedDouble size={20} className="text-emerald-400 shrink-0" />
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-base font-bold text-white">Room {activeRes.room.number}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {fmt(activeRes.checkIn)} → {fmt(activeRes.checkOut)}
                    {activeRes.room.floor && ` · ${activeRes.room.floor.name}`}
                  </p>
                </div>
                <span className="text-slate-500 group-hover:text-slate-300 transition-colors shrink-0">
                  <ChevronRight size={16} />
                </span>
              </button>
              {activeRes.company && (
                <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-3">
                  <Building2 size={11} /> Corporate: {activeRes.company.name}
                </p>
              )}
              {activeRes.groupBooking && (
                <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-2">
                  <Users size={11} /> Group: {activeRes.groupBooking.name}
                </p>
              )}
            </div>
          )}

          {/* Notes */}
          {guest.notes && (
            <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5">
              <h2 className="text-xs text-slate-500 uppercase tracking-widest font-medium mb-3 flex items-center gap-2">
                <MessageSquare size={12} /> Notes & Preferences
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed bg-amber-500/5 border border-amber-500/15 rounded-lg p-3 flex items-start gap-2">
                <AlertTriangle size={13} className="text-amber-400 shrink-0 mt-0.5" />
                {guest.notes}
              </p>
            </div>
          )}
        </div>

        {/* ── Right column (2 wide) ── */}
        <div className="xl:col-span-2 space-y-5">
          {/* Current Folio */}
          <div className="bg-[#161b27] border border-[#1e2536] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#1e2536] flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <FileText size={14} className="text-blue-400" />
                {activeRes ? `Active Folio — ${activeRes.reservationNo}` : 'Current Folio'}
              </h2>
              {activeRes ? (
                <button className="text-xs bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 px-3 py-1 rounded-lg font-medium transition-colors">
                  + Add Charge
                </button>
              ) : (
                <span className="text-xs text-slate-500">No active stay</span>
              )}
            </div>

            {isFolioLoading && activeRes ? (
              <div className="py-10 text-center">
                <Loader2 size={20} className="animate-spin text-slate-500 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">Loading folio…</p>
              </div>
            ) : activeFolio.length > 0 ? (
              <>
                <table className="w-full">
                  <thead className="border-b border-[#1e2536] bg-[#0f1117]/40">
                    <tr>
                      {['Description', 'Date', 'Category', 'Amount'].map((h) => (
                        <th
                          key={h}
                          className="text-xs text-slate-500 uppercase tracking-wider font-medium px-4 py-2.5 text-left"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {activeFolio.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b border-[#1e2536] last:border-0 hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="px-4 py-3 text-sm text-slate-300">{item.description}</td>
                        <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                          {fmt(item.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-xs px-2 py-1 rounded-full font-medium ${FOLIO_TYPE_STYLE[item.category] ?? 'bg-slate-500/15 text-slate-400'}`}
                          >
                            {item.category}
                          </span>
                        </td>
                        <td
                          className={`px-4 py-3 text-sm font-medium ${Number(item.amount) < 0 ? 'text-emerald-400' : 'text-slate-200'}`}
                        >
                          {Number(item.amount) < 0 ? '-' : ''}
                          {fmtMoney(Math.abs(Number(item.amount)))}
                          {Number(item.amount) < 0 && (
                            <span className="text-xs font-normal text-slate-500 ml-1">
                              (payment)
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="px-5 py-3 bg-[#0f1117]/40 border-t border-[#1e2536] flex items-center justify-between">
                  <div>
                    <span className="text-sm text-slate-500">Outstanding Balance</span>
                    {activeRes && (
                      <p className="text-xs text-slate-600 mt-0.5">
                        Total: {fmtMoney(activeRes.totalAmount)} · Paid:{' '}
                        {fmtMoney(activeRes.paidAmount)}
                      </p>
                    )}
                  </div>
                  <span
                    className={`text-lg font-bold ${folioTotal > 0 ? 'text-white' : 'text-emerald-400'}`}
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
              </>
            ) : (
              <div className="py-10 text-center">
                <DollarSign size={24} className="text-slate-700 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">
                  {activeRes ? 'No charges on this folio yet' : 'No active reservation'}
                </p>
              </div>
            )}
          </div>

          {/* Stay History */}
          <div className="bg-[#161b27] border border-[#1e2536] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#1e2536] flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Calendar size={14} className="text-violet-400" /> Stay History
              </h2>
              <span className="text-xs text-slate-500">
                {reservations.length} reservation{reservations.length !== 1 ? 's' : ''}
              </span>
            </div>

            {reservations.length > 0 ? (
              <div className="divide-y divide-[#1e2536]">
                {reservations.map((res) => {
                  const n = nightCount(res.checkIn, res.checkOut);
                  const label = res.company?.name ?? res.groupBooking?.name;
                  return (
                    <div
                      key={res.id}
                      onClick={() => router.push(`/reservations/${res.id}`)}
                      className="flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-[#0f1117] border border-[#1e2536] flex items-center justify-center shrink-0">
                          <BedDouble size={15} className="text-slate-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-200 group-hover:text-blue-400 transition-colors">
                            Room {res.room.number}
                            <span className="text-slate-600 font-normal"> · {res.room.type}</span>
                            {label && (
                              <span className="text-slate-600 font-normal"> · {label}</span>
                            )}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                            <Calendar size={10} />
                            {fmt(res.checkIn)} → {fmt(res.checkOut)} · {n} night{n !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-4">
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1 ${RES_STATUS[res.status] ?? 'bg-slate-500/15 text-slate-400'}`}
                        >
                          {res.status === 'CHECKED_IN' && <CheckCircle2 size={10} />}
                          {res.status.replace('_', ' ')}
                        </span>
                        <div className="text-right">
                          <p className="text-sm font-bold text-slate-200">
                            {fmtMoney(Number(res.totalAmount))}
                          </p>
                          {res.paidAmount < res.totalAmount && (
                            <p className="text-xs text-amber-400">
                              {fmtMoney(Number(res.totalAmount) - Number(res.paidAmount))} due
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-10 text-center">
                <Calendar size={24} className="text-slate-700 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">No stay history yet</p>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              {
                label: 'New Reservation',
                icon: BedDouble,
                color: 'text-blue-400',
                bg: 'bg-blue-500/10    border-blue-500/20    hover:bg-blue-500/15',
                action: () => setShowNewReservation(true),
                disabled: false,
              },
              {
                label: 'Add Folio Charge',
                icon: DollarSign,
                color: 'text-emerald-400',
                bg: 'bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/15',
                action: () => {
                  if (!activeRes) {
                    openToast('error', 'This guest does not have an active reservation.');
                    return;
                  }
                  setShowAddCharge(true);
                },
                disabled: !activeRes,
              },
              {
                label: 'Check Out',
                icon: Clock,
                color: 'text-amber-400',
                bg: 'bg-amber-500/10  border-amber-500/20  hover:bg-amber-500/15',
                action: async () => {
                  if (!checkedInRes) {
                    openToast('error', 'This guest is not currently checked in.');
                    return;
                  }
                  setShowCheckOutConfirm(true);
                },
                disabled: !checkedInRes || checkOut.isPending,
              },
            ].map(({ label, icon: Icon, color, bg, action, disabled }) => (
              <button
                key={label}
                onClick={action}
                disabled={disabled}
                className={`${bg} border rounded-xl p-4 flex flex-col items-center gap-2 transition-colors disabled:cursor-not-allowed disabled:opacity-50`}
              >
                <Icon size={20} className={color} />
                <span className="text-xs text-slate-300 font-medium text-center">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <EditGuestModal isOpen={showEdit} guest={guest} onClose={() => setShowEdit(false)} />
      <DeleteConfirm isOpen={showDelete} guest={guest} onClose={() => setShowDelete(false)} />
      <NewReservationModal
        isOpen={showNewReservation}
        onClose={() => setShowNewReservation(false)}
        prefillGuest={{
          id: guest.id,
          firstName: guest.firstName,
          lastName: guest.lastName,
        }}
      />
      {activeRes && showAddCharge ? (
        <AddFolioChargeModal
          reservationId={activeRes.id}
          onClose={() => setShowAddCharge(false)}
        />
      ) : null}
      {showCheckOutConfirm && checkedInRes ? (
        <ConfirmCheckOutModal
          guestName={`${guest.firstName} ${guest.lastName}`}
          isPending={checkOut.isPending}
          onClose={() => setShowCheckOutConfirm(false)}
          onConfirm={async () => {
            await checkOut.mutateAsync();
            setShowCheckOutConfirm(false);
          }}
        />
      ) : null}
    </div>
  );
}
