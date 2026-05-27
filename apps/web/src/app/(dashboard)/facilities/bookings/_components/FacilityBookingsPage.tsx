'use client';

import { useEffect, useState } from 'react';
import { Plus, Search, X, BadgeCheck, CircleSlash } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import {
  useApproveFacilityBooking,
  useCreateFacilityBookingInvoice,
  FacilityBooking,
  useCancelFacilityBooking,
  useCreateFacilityBooking,
  useFacilityBookings,
  useGenerateFacilityPaymentReference,
  usePostFacilityBookingToRoom,
  useRecordFacilityBookingPayment,
} from '@/hooks/facility/useFacilityBooking';
import { useFacilities } from '@/hooks/facility/useFacility';
import Pagination from '@/components/ui/pagination';
import { usePermissions } from '@/hooks/usePermissions';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  DrawerTitle,
} from '@/components/ui/drawer';
import TableScroll from '@/components/ui/table-scroll';

const statusStyle: Record<string, string> = {
  PENDING: 'bg-amber-500/15 text-amber-400',
  CONFIRMED: 'bg-blue-500/15 text-blue-400',
  IN_PROGRESS: 'bg-indigo-500/15 text-indigo-400',
  COMPLETED: 'bg-emerald-500/15 text-emerald-400',
  CANCELLED: 'bg-slate-500/15 text-slate-400',
  NO_SHOW: 'bg-rose-500/15 text-rose-400',
};

const chargeStyle: Record<string, string> = {
  ROOM_CHARGE: 'bg-cyan-500/15 text-cyan-400',
  DIRECT_PAYMENT: 'bg-amber-500/15 text-amber-400',
  COMPLIMENTARY: 'bg-slate-500/15 text-slate-400',
};

function toDate(value?: string) {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

function toTime(value?: string) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(11, 16);
}

function buildBookingDateTime(date?: string, time?: string) {
  if (!date || !time) return null;
  const value = new Date(`${date}T${time}:00.000Z`);
  return Number.isNaN(value.getTime()) ? null : value;
}

function calculateFacilityBookingAmount(args: {
  baseRate?: number | null;
  rateUnit?: string | null;
  startDate?: string;
  startTime?: string;
  endDate?: string;
  endTime?: string;
  chargeType?: string;
}) {
  if ((args.chargeType ?? '').toUpperCase() === 'COMPLIMENTARY') return 0;

  const baseRate = args.baseRate ?? null;
  if (baseRate === null || !Number.isFinite(baseRate) || baseRate < 0) return 0;

  const start = buildBookingDateTime(args.startDate, args.startTime);
  const end = buildBookingDateTime(args.endDate, args.endTime);
  const rateUnit = (args.rateUnit ?? 'FLAT').toUpperCase();

  if (!start || !end || end <= start) {
    return rateUnit === 'PER_SESSION' || rateUnit === 'FLAT' ? baseRate : 0;
  }

  const durationMs = end.getTime() - start.getTime();
  const durationMins = Math.max(1, Math.round(durationMs / 60000));
  const hours = Math.max(1, Math.ceil(durationMins / 60));
  const days = Math.max(1, Math.ceil(durationMs / 86_400_000));

  if (rateUnit === 'PER_HOUR') return baseRate * hours;
  if (rateUnit === 'PER_DAY') return baseRate * days;
  if (rateUnit === 'PER_SESSION' || rateUnit === 'FLAT') return baseRate;
  return baseRate;
}

function defaultLocalDateTimeValue() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

export default function FacilityBookingsPage() {
  const { can } = usePermissions();
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<'All' | string>('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [showCancel, setShowCancel] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<FacilityBooking | null>(null);
  const [showApprovalFlow, setShowApprovalFlow] = useState(false);
  const [approvalTarget, setApprovalTarget] = useState<FacilityBooking | null>(null);
  const [approvalInvoiceId, setApprovalInvoiceId] = useState<string | null>(null);
  const [approvalStep, setApprovalStep] = useState<'approve' | 'pay'>('approve');
  const [showPayment, setShowPayment] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState<FacilityBooking | null>(null);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [showAdd, setShowAdd] = useState(false);

  const debouncedSearch = useDebounce(search, 400);
  const resetPage = () => setPage(1);

  const { data, isLoading, refetch } = useFacilityBookings({
    search: debouncedSearch || undefined,
    page,
    limit,
    status: statusFilter === 'All' ? undefined : statusFilter,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });
  const createBooking = useCreateFacilityBooking();
  const approveBooking = useApproveFacilityBooking();
  const createInvoice = useCreateFacilityBookingInvoice();
  const generatePaymentReference = useGenerateFacilityPaymentReference();
  const recordPayment = useRecordFacilityBookingPayment();
  const postToRoom = usePostFacilityBookingToRoom();
  const cancelBooking = useCancelFacilityBooking();
  const { data: facilitiesData } = useFacilities({ page: 1, limit: 100 });

  const bookings = data?.bookings ?? [];
  const facilities = facilitiesData?.facilities ?? [];
  const canCreateBooking = can('create:facilities');
  const [amountEdited, setAmountEdited] = useState(false);

  const [form, setForm] = useState({
    facilityId: '',
    guestName: '',
    roomNo: '',
    reservationId: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    pax: 1,
    amount: 0,
    chargeType: 'ROOM_CHARGE',
    notes: '',
  });

  const selectedFacility = facilities.find((facility) => facility.id === form.facilityId);

  useEffect(() => {
    if (!form.facilityId || amountEdited) return;
    const amount = calculateFacilityBookingAmount({
      baseRate: selectedFacility?.baseRate,
      rateUnit: selectedFacility?.rateUnit,
      startDate: form.startDate,
      startTime: form.startTime,
      endDate: form.endDate,
      endTime: form.endTime,
      chargeType: form.chargeType,
    });

    setForm((current) => (current.amount === amount ? current : { ...current, amount }));
  }, [
    amountEdited,
    form.chargeType,
    form.endDate,
    form.endTime,
    form.facilityId,
    form.startDate,
    form.startTime,
    selectedFacility?.baseRate,
    selectedFacility?.rateUnit,
  ]);

  const [cancelForm, setCancelForm] = useState({
    cancelReason: '',
    refundMethod: 'MANUAL_CREDIT',
  });
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    method: 'CASH',
    reference: '',
    note: '',
    paidAt: defaultLocalDateTimeValue(),
  });

  const resetPaymentForm = () => {
    setPaymentForm({
      amount: '',
      method: 'CASH',
      reference: '',
      note: '',
      paidAt: defaultLocalDateTimeValue(),
    });
  };

  const handleCreate = async () => {
    try {
      setError(null);
      const start = new Date(`${form.startDate}T${form.startTime}:00.000Z`).toISOString();
      const end = new Date(`${form.endDate}T${form.endTime}:00.000Z`).toISOString();
      await createBooking.mutateAsync({
        facilityId: form.facilityId,
        guestName: form.guestName,
        roomNo: form.roomNo || undefined,
        reservationId: form.reservationId || undefined,
        startTime: start,
        endTime: end,
        pax: form.pax,
        amount: Number(form.amount),
        chargeType: form.chargeType,
        notes: form.notes || undefined,
      });
      setShowAdd(false);
      setAmountEdited(false);
      setForm({
        facilityId: '',
        guestName: '',
        roomNo: '',
        reservationId: '',
        startDate: '',
        startTime: '',
        endDate: '',
        endTime: '',
        pax: 1,
        amount: 0,
        chargeType: 'ROOM_CHARGE',
        notes: '',
      });
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? 'Failed to create booking');
    }
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    try {
      setError(null);
      await cancelBooking.mutateAsync({
        id: cancelTarget.id,
        cancelReason: cancelForm.cancelReason || undefined,
        refundMethod: cancelForm.refundMethod,
      });
      setShowCancel(false);
      setCancelTarget(null);
      setCancelForm({ cancelReason: '', refundMethod: 'MANUAL_CREDIT' });
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? 'Failed to cancel booking');
    }
  };

  const openPaymentDrawer = (booking: FacilityBooking) => {
    setPaymentTarget(booking);
    setPaymentForm({
      amount: String(booking.amount ?? 0),
      method: 'CASH',
      reference: '',
      note: '',
      paidAt: defaultLocalDateTimeValue(),
    });
    setShowPayment(true);
  };

  const openApprovalFlow = (booking: FacilityBooking) => {
    setApprovalTarget(booking);
    setApprovalInvoiceId(null);
    setApprovalStep('approve');
    setPaymentForm({
      amount: String(booking.amount ?? 0),
      method: 'CASH',
      reference: '',
      note: '',
      paidAt: defaultLocalDateTimeValue(),
    });
    setShowApprovalFlow(true);
  };

  const closeApprovalFlow = () => {
    setShowApprovalFlow(false);
    setApprovalTarget(null);
    setApprovalInvoiceId(null);
    setApprovalStep('approve');
    resetPaymentForm();
  };

  const handleApproveFlow = async () => {
    if (!approvalTarget) return;

    try {
      setError(null);
      await approveBooking.mutateAsync({ id: approvalTarget.id });

      if (approvalTarget.chargeType === 'DIRECT_PAYMENT') {
        const result = await createInvoice.mutateAsync({ id: approvalTarget.id });
        const nextInvoiceId =
          result?.invoice?.id ??
          result?.id ??
          null;
        setApprovalInvoiceId(nextInvoiceId);
        setApprovalStep('pay');
        return;
      }

      closeApprovalFlow();
      await refetch();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? 'Failed to approve booking');
    }
  };

  const handleRecordPayment = async () => {
    if (!paymentTarget) return;

    try {
      setError(null);
      await recordPayment.mutateAsync({
        id: paymentTarget.id,
        amount: Number(paymentForm.amount),
        method: paymentForm.method,
        reference: paymentForm.reference || undefined,
        note: paymentForm.note || undefined,
        paidAt: paymentForm.paidAt || undefined,
      });
      setShowPayment(false);
      setPaymentTarget(null);
      resetPaymentForm();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? 'Failed to record payment');
    }
  };

  const handleRecordApprovalPayment = async () => {
    if (!approvalTarget) return;

    try {
      setError(null);
      await recordPayment.mutateAsync({
        id: approvalTarget.id,
        amount: Number(paymentForm.amount),
        method: paymentForm.method,
        reference: paymentForm.reference || undefined,
        note: paymentForm.note || undefined,
        paidAt: paymentForm.paidAt || undefined,
      });
      closeApprovalFlow();
      await refetch();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? 'Failed to record payment');
    }
  };

  const handleGeneratePaymentReference = async () => {
    try {
      const result = await generatePaymentReference.mutateAsync();
      setPaymentForm((current) => ({ ...current, reference: result.reference }));
    } catch {
      // toast handled in hook
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Facility Bookings</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Manage facility reservations and guest bookings
              {isLoading && <span className="ml-2 text-xs text-slate-600">Loading…</span>}
              {error && <span className="ml-2 text-xs text-red-400">{error}</span>}
            </p>
          </div>
          {canCreateBooking ? (
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            >
              <Plus size={15} /> New Booking
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-3 justify-between w-full">
          <div className="flex flex-wrap gap-3 items-center">
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                resetPage();
              }}
              className="bg-[#161b27] border border-[#1e2536] rounded-lg px-3 py-2 text-sm text-slate-300 outline-none focus:border-blue-500 transition-colors"
            >
              {[5, 10, 20, 50].map((n) => (
                <option key={n} value={n}>
                  {n} per page
                </option>
              ))}
            </select>
            <div className="flex items-center gap-2 bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2 w-72">
              <Search size={14} className="text-slate-500 shrink-0" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search facilities..."
                className="bg-transparent text-sm text-slate-300 placeholder:text-slate-600 outline-none flex-1"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2 text-sm text-slate-200"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2 text-sm text-slate-200"
            />
            <button
              onClick={() => refetch()}
              className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-3 py-2 rounded-lg"
            >
              Apply
            </button>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {['All', 'PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'].map(
            (s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${statusFilter === s ? 'bg-blue-600/20 border-blue-500/30 text-blue-400' : 'bg-[#161b27] border-[#1e2536] text-slate-400 hover:text-slate-200'}`}
              >
                {s}
              </button>
            ),
          )}
        </div>

        <div className="bg-[#161b27] border border-[#1e2536] rounded-xl">
          <TableScroll>
            <table className="w-full min-w-[900px]">
              <thead className="border-b border-[#1e2536] bg-[#0f1117]/50">
                <tr>
                  {[
                    '#',
                    'Facility',
                    'Guest',
                    'Room',
                    'Start',
                    'End',
                    'Charge',
                    'Amount',
                    'Status',
                    'Paid',
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
                {bookings.length === 0 && (
                  <tr className="border-b border-[#1e2536] last:border-0 text-center">
                    <td colSpan={11} className="px-4 py-3 text-sm text-slate-500">
                      {isLoading ? 'Loading bookings' : 'No bookings found'}
                    </td>
                  </tr>
                )}
                {bookings.map((b, i) => (
                  <tr
                    key={b.id}
                    className="border-b border-[#1e2536] last:border-0 hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-slate-500">{i + 1}</td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-200 whitespace-nowrap">
                      {b?.facility?.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-400 whitespace-nowrap">
                      {b.guestName}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                      {b.roomNo ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                      {toDate(b.startTime)} {toTime(b.startTime)}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                      {toDate(b.endTime)} {toTime(b.endTime)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-medium ${chargeStyle[b.chargeType] ?? 'bg-slate-500/15 text-slate-400'}`}
                      >
                        {b.chargeType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-200 whitespace-nowrap">
                      ₦{b.amount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusStyle[b.status] ?? 'bg-slate-500/15 text-slate-400'}`}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {b.isPaid ? (
                        <BadgeCheck size={16} className="text-emerald-400" />
                      ) : (
                        <CircleSlash size={16} className="text-slate-500" />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {b.status === 'PENDING' ? (
                          <button
                            onClick={() => openApprovalFlow(b)}
                            disabled={approveBooking.isPending}
                            className="text-xs bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 px-2 py-1 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Approve
                          </button>
                        ) : null}
                        {b.status === 'CONFIRMED' &&
                        b.chargeType === 'DIRECT_PAYMENT' &&
                        !b.invoiceId ? (
                          <button
                            onClick={() => createInvoice.mutate({ id: b.id })}
                            disabled={createInvoice.isPending}
                            className="text-xs bg-cyan-500/15 text-cyan-400 hover:bg-cyan-500/25 px-2 py-1 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Invoice
                          </button>
                        ) : null}
                        {b.status === 'CONFIRMED' &&
                        b.chargeType === 'DIRECT_PAYMENT' &&
                        !!b.invoiceId &&
                        !b.isPaid ? (
                          <button
                            onClick={() => openPaymentDrawer(b)}
                            disabled={recordPayment.isPending}
                            className="text-xs bg-violet-500/15 text-violet-400 hover:bg-violet-500/25 px-2 py-1 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Mark Paid
                          </button>
                        ) : null}
                        {b.status === 'CONFIRMED' &&
                        b.chargeType === 'ROOM_CHARGE' &&
                        !!b.reservationId &&
                        !b.hasRoomFolioPosting ? (
                          <button
                            onClick={() => postToRoom.mutate({ id: b.id })}
                            disabled={postToRoom.isPending}
                            className="text-xs bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 px-2 py-1 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Post To Room
                          </button>
                        ) : null}
                        <button
                          onClick={() => {
                            setCancelTarget(b);
                            setShowCancel(true);
                          }}
                          disabled={b.status === 'CANCELLED' || cancelBooking.isPending}
                          className="text-xs bg-red-500/15 text-red-400 hover:bg-red-500/25 px-2 py-1 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        </div>

        {data?.meta && bookings.length > 0 && (
          <Pagination meta={data.meta} currentPage={page} handlePageChange={setPage} />
        )}
      </div>

      <Drawer
        open={showApprovalFlow}
        onOpenChange={(open) => {
          if (!open) closeApprovalFlow();
          else setShowApprovalFlow(open);
        }}
        direction="right"
      >
        <DrawerOverlay className="bg-black/50 backdrop-blur-sm data-[state=open]:animate-fadeIn" />
        <DrawerContent className="flex h-full w-full max-w-md flex-col border-l border-[#1e2536] bg-[#161b27] sm:!max-w-md">
          <DrawerHeader className="flex flex-row items-center justify-between border-b border-[#1e2536] px-5 py-4">
            <DrawerTitle className="text-base font-bold text-white">
              <h2 className="text-lg font-bold text-white">
                {approvalStep === 'approve' ? 'Approve Booking' : 'Invoice Created'}
              </h2>
            </DrawerTitle>
            <button onClick={closeApprovalFlow} className="text-slate-500 hover:text-slate-300">
              <X size={18} />
            </button>
          </DrawerHeader>
          <div className="flex-1 overflow-y-auto p-5">
            <div className="space-y-4">
              <div className="rounded-xl border border-[#1e2536] bg-[#0f1117] p-4">
                <p className="text-sm font-semibold text-white">
                  {approvalTarget?.facility?.name ?? 'Facility booking'}
                </p>
                <p className="mt-1 text-xs text-slate-400">{approvalTarget?.guestName ?? 'Guest'}</p>
                <p className="mt-2 text-xs text-slate-500">
                  {approvalStep === 'approve'
                    ? 'Approve this pending booking and proceed with settlement if needed.'
                    : `Invoice${approvalInvoiceId ? ` ${approvalInvoiceId}` : ''} created. You can record payment now without leaving this flow.`}
                </p>
              </div>

              {approvalStep === 'pay' ? (
                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
                      Amount
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={paymentForm.amount}
                      onChange={(e) =>
                        setPaymentForm((current) => ({ ...current, amount: e.target.value }))
                      }
                      className="w-full rounded-lg border border-[#1e2536] bg-[#0f1117] px-3 py-2.5 text-sm text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
                      Method
                    </label>
                    <select
                      value={paymentForm.method}
                      onChange={(e) =>
                        setPaymentForm((current) => ({ ...current, method: e.target.value }))
                      }
                      className="w-full rounded-lg border border-[#1e2536] bg-[#0f1117] px-3 py-2.5 text-sm text-slate-200"
                    >
                      {['CASH', 'CARD', 'BANK_TRANSFER', 'POS'].map((method) => (
                        <option key={method} value={method}>
                          {method}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
                      Reference
                    </label>
                    <div className="flex gap-2">
                      <input
                        value={paymentForm.reference}
                        onChange={(e) =>
                          setPaymentForm((current) => ({ ...current, reference: e.target.value }))
                        }
                        placeholder="Transaction reference"
                        className="w-full rounded-lg border border-[#1e2536] bg-[#0f1117] px-3 py-2.5 text-sm text-slate-200"
                      />
                      <button
                        type="button"
                        onClick={handleGeneratePaymentReference}
                        disabled={generatePaymentReference.isPending}
                        className="shrink-0 rounded-lg border border-[#29406f] bg-[#17233b] px-3 py-2.5 text-xs font-semibold text-slate-100 transition-colors hover:bg-[#1d2d4a] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Generate
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
                      Paid At
                    </label>
                    <input
                      type="datetime-local"
                      value={paymentForm.paidAt}
                      onChange={(e) =>
                        setPaymentForm((current) => ({ ...current, paidAt: e.target.value }))
                      }
                      className="w-full rounded-lg border border-[#1e2536] bg-[#0f1117] px-3 py-2.5 text-sm text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
                      Note
                    </label>
                    <textarea
                      value={paymentForm.note}
                      onChange={(e) =>
                        setPaymentForm((current) => ({ ...current, note: e.target.value }))
                      }
                      rows={4}
                      className="w-full rounded-lg border border-[#1e2536] bg-[#0f1117] px-3 py-2.5 text-sm text-slate-200"
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </div>
          <div className="flex gap-3 border-t border-[#1e2536] px-5 py-4">
            <button
              onClick={closeApprovalFlow}
              className="flex-1 rounded-lg bg-white/5 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-white/10"
            >
              {approvalStep === 'pay' ? 'Finish Later' : 'Cancel'}
            </button>
            {approvalStep === 'approve' ? (
              <button
                onClick={handleApproveFlow}
                disabled={approveBooking.isPending || createInvoice.isPending}
                className="flex-1 rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Approve And Proceed
              </button>
            ) : (
              <button
                onClick={handleRecordApprovalPayment}
                disabled={recordPayment.isPending}
                className="flex-1 rounded-lg bg-violet-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Mark Paid
              </button>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      <Drawer
        open={showAdd && canCreateBooking}
        onOpenChange={() => setShowAdd(false)}
        direction="right"
      >
        <DrawerOverlay className="bg-black/50 backdrop-blur-sm data-[state=open]:animate-fadeIn" />
        <DrawerContent className="flex h-full w-full max-w-xl flex-col border-l border-[#1e2536] bg-[#161b27] sm:!max-w-xl">
          <DrawerHeader className="flex flex-row items-center justify-between border-b border-[#1e2536] px-5 py-4">
            <DrawerTitle className="text-base font-bold text-white">
              <h2 className="text-lg font-bold text-white">New Booking</h2>
            </DrawerTitle>
            <button
              onClick={() => setShowAdd(false)}
              className="text-slate-500 hover:text-slate-300"
            >
              <X size={18} />
            </button>
          </DrawerHeader>
          <div className="flex-1 overflow-y-auto p-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
                  Facility
                </label>
                <select
                  value={form.facilityId}
                  onChange={(e) => {
                    setAmountEdited(false);
                    setForm({ ...form, facilityId: e.target.value });
                  }}
                  className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200"
                >
                  <option value="">Select facility</option>
                  {facilities.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
                  Guest Name
                </label>
                <input
                  value={form.guestName}
                  onChange={(e) => setForm({ ...form, guestName: e.target.value })}
                  className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
                  Room No
                </label>
                <input
                  value={form.roomNo}
                  onChange={(e) => setForm({ ...form, roomNo: e.target.value })}
                  className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
                  Start Date
                </label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
                  Start Time
                </label>
                <input
                  type="time"
                  value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                  className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
                  End Date
                </label>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
                  End Time
                </label>
                <input
                  type="time"
                  value={form.endTime}
                  onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                  className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
                  Pax
                </label>
                <input
                  type="number"
                  value={form.pax}
                  onChange={(e) => setForm({ ...form, pax: Number(e.target.value) })}
                  className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
                  Charge Type
                </label>
                <select
                  value={form.chargeType}
                  onChange={(e) => {
                    setAmountEdited(false);
                    setForm({ ...form, chargeType: e.target.value });
                  }}
                  className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200"
                >
                  {['ROOM_CHARGE', 'DIRECT_PAYMENT', 'COMPLIMENTARY'].map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
                  Amount
                </label>
                <input
                  type="number"
                  value={form.amount}
                  onChange={(e) => {
                    setAmountEdited(true);
                    setForm({ ...form, amount: Number(e.target.value) });
                  }}
                  className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200"
                />
                <p className="mt-1 text-xs text-slate-500">
                  {selectedFacility?.baseRate
                    ? `Prefilled from ${selectedFacility.name} ${selectedFacility.rateUnit?.toLowerCase() ?? 'flat'} pricing.`
                    : 'No default facility price set.'}
                </p>
              </div>
              <div>
                <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
                  Reservation ID
                </label>
                <input
                  value={form.reservationId}
                  onChange={(e) => setForm({ ...form, reservationId: e.target.value })}
                  className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200"
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
                  Notes
                </label>
                <input
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowAdd(false)}
                className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg py-2.5 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={createBooking.isPending}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg py-2.5 text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {createBooking.isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      <Drawer
        open={showPayment}
        onOpenChange={(open) => {
          setShowPayment(open);
          if (!open) setPaymentTarget(null);
        }}
        direction="right"
      >
        <DrawerOverlay className="bg-black/50 backdrop-blur-sm data-[state=open]:animate-fadeIn" />
        <DrawerContent className="flex h-full w-full max-w-md flex-col border-l border-[#1e2536] bg-[#161b27] sm:!max-w-md">
          <DrawerHeader className="flex flex-row items-center justify-between border-b border-[#1e2536] px-5 py-4">
            <DrawerTitle className="text-base font-bold text-white">
              <h2 className="text-lg font-bold text-white">Record Payment</h2>
            </DrawerTitle>
            <button
              onClick={() => {
                setShowPayment(false);
                setPaymentTarget(null);
              }}
              className="text-slate-500 hover:text-slate-300"
            >
              <X size={18} />
            </button>
          </DrawerHeader>
          <div className="flex-1 overflow-y-auto p-5">
            <div className="space-y-4">
              <div className="rounded-xl border border-[#1e2536] bg-[#0f1117] p-4">
                <p className="text-sm font-semibold text-white">
                  {paymentTarget?.facility?.name ?? 'Facility booking'}
                </p>
                <p className="mt-1 text-xs text-slate-400">{paymentTarget?.guestName ?? 'Guest'}</p>
                <p className="mt-2 text-xs text-slate-500">
                  Invoice-linked payment for a confirmed direct-payment booking.
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
                  Amount
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm((current) => ({ ...current, amount: e.target.value }))}
                  className="w-full rounded-lg border border-[#1e2536] bg-[#0f1117] px-3 py-2.5 text-sm text-slate-200"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
                  Method
                </label>
                <select
                  value={paymentForm.method}
                  onChange={(e) => setPaymentForm((current) => ({ ...current, method: e.target.value }))}
                  className="w-full rounded-lg border border-[#1e2536] bg-[#0f1117] px-3 py-2.5 text-sm text-slate-200"
                >
                  {['CASH', 'CARD', 'BANK_TRANSFER', 'POS'].map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
                  Reference
                </label>
                <div className="flex gap-2">
                  <input
                    value={paymentForm.reference}
                    onChange={(e) =>
                      setPaymentForm((current) => ({ ...current, reference: e.target.value }))
                    }
                    placeholder="Transaction reference"
                    className="w-full rounded-lg border border-[#1e2536] bg-[#0f1117] px-3 py-2.5 text-sm text-slate-200"
                  />
                  <button
                    type="button"
                    onClick={handleGeneratePaymentReference}
                    disabled={generatePaymentReference.isPending}
                    className="shrink-0 rounded-lg border border-[#29406f] bg-[#17233b] px-3 py-2.5 text-xs font-semibold text-slate-100 transition-colors hover:bg-[#1d2d4a] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Generate
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
                  Paid At
                </label>
                <input
                  type="datetime-local"
                  value={paymentForm.paidAt}
                  onChange={(e) => setPaymentForm((current) => ({ ...current, paidAt: e.target.value }))}
                  className="w-full rounded-lg border border-[#1e2536] bg-[#0f1117] px-3 py-2.5 text-sm text-slate-200"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
                  Note
                </label>
                <textarea
                  value={paymentForm.note}
                  onChange={(e) => setPaymentForm((current) => ({ ...current, note: e.target.value }))}
                  rows={4}
                  className="w-full rounded-lg border border-[#1e2536] bg-[#0f1117] px-3 py-2.5 text-sm text-slate-200"
                />
              </div>
            </div>
          </div>
          <div className="flex gap-3 border-t border-[#1e2536] px-5 py-4">
            <button
              onClick={() => {
                setShowPayment(false);
                setPaymentTarget(null);
              }}
              className="flex-1 rounded-lg bg-white/5 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              onClick={handleRecordPayment}
              disabled={recordPayment.isPending}
              className="flex-1 rounded-lg bg-violet-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Save Payment
            </button>
          </div>
        </DrawerContent>
      </Drawer>

      <Drawer
        open={showCancel && Boolean(cancelTarget)}
        onOpenChange={() => setShowCancel(false)}
        direction="right"
      >
        <DrawerOverlay className="bg-black/50 backdrop-blur-sm data-[state=open]:animate-fadeIn" />
        <DrawerContent className="flex h-full w-full max-w-lg flex-col border-l border-[#1e2536] bg-[#161b27] sm:!max-w-lg">
          <DrawerHeader className="flex flex-row items-center justify-between border-b border-[#1e2536] px-5 py-4">
            <DrawerTitle className="text-base font-bold text-white">
              <h2 className="text-lg font-bold text-white">Cancel Booking</h2>
            </DrawerTitle>
            <button
              onClick={() => setShowCancel(false)}
              className="text-slate-500 hover:text-slate-300"
            >
              <X size={18} />
            </button>
          </DrawerHeader>
          <div className="flex-1 overflow-y-auto p-5">
            <div className="space-y-4">
              <div>
                <p className="text-sm text-slate-300">
                  {cancelTarget?.facility?.name ?? 'Facility'} · {cancelTarget?.guestName ?? '—'}
                </p>
                <p className="text-xs text-slate-500">
                  {toDate(cancelTarget?.startTime)} {toTime(cancelTarget?.startTime)}
                </p>
              </div>
              <div>
                <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
                  Cancel Reason
                </label>
                <input
                  value={cancelForm.cancelReason}
                  onChange={(e) => setCancelForm({ ...cancelForm, cancelReason: e.target.value })}
                  className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
                  Refund Method
                </label>
                <select
                  value={cancelForm.refundMethod}
                  onChange={(e) => setCancelForm({ ...cancelForm, refundMethod: e.target.value })}
                  className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200"
                >
                  <option value="MANUAL_CREDIT">MANUAL_CREDIT</option>
                  <option value="AUTO_REVERSE">AUTO_REVERSE</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowCancel(false)}
                className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg py-2.5 text-sm font-medium transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelBooking.isPending}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white rounded-lg py-2.5 text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {cancelBooking.isPending ? 'Cancelling...' : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
