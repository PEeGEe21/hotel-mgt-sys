'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Download,
  Loader2,
  Palette,
  Pencil,
  Plus,
  Printer,
  Receipt,
  Search,
  WalletCards,
} from 'lucide-react';
import {
  CreateFinanceInvoiceInput,
  FinanceInvoice,
  useCreateFinanceInvoice,
  useFinanceInvoices,
  useUpdateFinanceInvoice,
} from '@/hooks/finance/useFinance';
import { useAccounts } from '@/hooks/finance/useLedger';
import { useHotelProfile, useUpdateHotelProfile } from '@/hooks/hotel/useHotelProfile';
import { useReservations } from '@/hooks/useReservations';
import { usePosOrders } from '@/hooks/pos/usePosOrders';
import { useFacilityBookings } from '@/hooks/facility/useFacilityBooking';
import { useFacilityRequisitions } from '@/hooks/facility/useFacilityRequisition';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  DrawerTitle,
} from '@/components/ui/drawer';

type InvoiceStatus = 'Unpaid' | 'Partial' | 'Paid' | 'Overdue' | 'Refunded';
type SourceType = 'MANUAL' | 'RESERVATION' | 'POS' | 'FACILITY' | 'REQUISITION';

type InvoiceFormState = {
  sourceType: SourceType;
  counterpartyName: string;
  notes: string;
  dueAt: string;
  subtotal: string;
  tax: string;
  discount: string;
  reservationId: string;
  posOrderId: string;
  facilityBookingId: string;
  requisitionId: string;
  recordInitialPayment: boolean;
  initialPaymentAmount: string;
  initialPaymentMethod: string;
  initialPaymentReference: string;
  initialPaymentNote: string;
  initialPaymentPaidAt: string;
  debitAccountCode: string;
  creditAccountCode: string;
  initialPaymentDebitAccountCode: string;
  initialPaymentCreditAccountCode: string;
};

type EditInvoiceFormState = {
  counterpartyName: string;
  notes: string;
  dueAt: string;
};

const STATUS_CONFIG: Record<
  InvoiceStatus,
  { color: string; bg: string; border: string; dot: string }
> = {
  Unpaid: {
    color: 'text-blue-400',
    bg: 'bg-blue-500/15',
    border: 'border-blue-500/30',
    dot: 'bg-blue-400',
  },
  Partial: {
    color: 'text-amber-400',
    bg: 'bg-amber-500/15',
    border: 'border-amber-500/30',
    dot: 'bg-amber-400',
  },
  Paid: {
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/15',
    border: 'border-emerald-500/30',
    dot: 'bg-emerald-400',
  },
  Overdue: {
    color: 'text-red-400',
    bg: 'bg-red-500/15',
    border: 'border-red-500/30',
    dot: 'bg-red-400',
  },
  Refunded: {
    color: 'text-slate-500',
    bg: 'bg-slate-600/15',
    border: 'border-slate-600/30',
    dot: 'bg-slate-500',
  },
};

const SOURCE_OPTIONS: { value: SourceType; label: string; hint: string }[] = [
  { value: 'MANUAL', label: 'Manual', hint: 'Type billed-to details yourself' },
  { value: 'RESERVATION', label: 'Reservation', hint: 'Link a guest stay invoice' },
  { value: 'POS', label: 'POS', hint: 'Link a restaurant or retail order' },
  { value: 'FACILITY', label: 'Facility', hint: 'Link a spa, hall, or amenity booking' },
  {
    value: 'REQUISITION',
    label: 'Requisition',
    hint: 'Create an expense invoice from approved requests',
  },
];

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'CARD', label: 'Card' },
  { value: 'BANK_TRANSFER', label: 'Transfer' },
  { value: 'POS', label: 'POS' },
  { value: 'MOBILE_MONEY', label: 'Mobile Money' },
  { value: 'OTHER', label: 'Other' },
];

const ALL_STATUSES: InvoiceStatus[] = ['Unpaid', 'Partial', 'Paid', 'Overdue', 'Refunded'];

function buildDefaultForm(): InvoiceFormState {
  return {
    sourceType: 'MANUAL',
    counterpartyName: '',
    notes: '',
    dueAt: '',
    subtotal: '',
    tax: '0',
    discount: '0',
    reservationId: '',
    posOrderId: '',
    facilityBookingId: '',
    requisitionId: '',
    recordInitialPayment: false,
    initialPaymentAmount: '',
    initialPaymentMethod: 'CASH',
    initialPaymentReference: '',
    initialPaymentNote: '',
    initialPaymentPaidAt: new Date().toISOString().slice(0, 10),
    debitAccountCode: '',
    creditAccountCode: '',
    initialPaymentDebitAccountCode: '',
    initialPaymentCreditAccountCode: '',
  };
}

function StatusBadge({ status }: { status: InvoiceStatus }) {
  const s = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${s.bg} ${s.color} ${s.border}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {status}
    </span>
  );
}

function fmtMoney(n: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(n);
}

function invoiceStatus(inv: any): InvoiceStatus {
  if (inv.status === 'OVERDUE') return 'Overdue';
  if (inv.paymentStatus === 'PAID') return 'Paid';
  if (inv.paymentStatus === 'PARTIAL') return 'Partial';
  if (inv.paymentStatus === 'REFUNDED') return 'Refunded';
  return 'Unpaid';
}

function invoiceType(inv: any) {
  if (inv.type === 'RESERVATION') return 'Reservation';
  if (inv.type === 'POS') return 'POS';
  if (inv.type === 'FACILITY') return 'Facility';
  if (inv.type === 'REQUISITION') return 'Requisition';
  return 'Manual';
}

function invoiceParty(inv: any) {
  const guest = inv.reservation?.guest ?? inv.posOrder?.reservation?.guest;
  if (guest) return `${guest.firstName} ${guest.lastName}`;
  if (inv.counterpartyName) return inv.counterpartyName;
  if (inv.requisition?.facility?.name) return inv.requisition.facility.name;
  if (inv.posOrder?.roomNo) return `Room ${inv.posOrder.roomNo}`;
  if (inv.posOrder?.tableNo) return `Table ${inv.posOrder.tableNo}`;
  return 'Walk-in';
}

function invoiceDescription(inv: any) {
  if (inv.requisition?.title) return inv.requisition.title;
  if (inv.reservation?.room?.number) return `Room ${inv.reservation.room.number} stay`;
  if (inv.reservation?.reservationNo) return `Reservation ${inv.reservation.reservationNo}`;
  if (inv.posOrder?.orderNo) return `POS ${inv.posOrder.orderNo}`;
  return inv.notes || 'Invoice';
}

function fieldClassName(disabled = false) {
  return `w-full rounded-lg border border-[#1e2536] bg-[#0f1117] px-3 py-2.5 text-sm text-slate-200 outline-none transition-colors focus:border-blue-500 ${
    disabled ? 'cursor-not-allowed opacity-60' : ''
  }`;
}

export default function InvoicesPage() {
  const [view, setView] = useState<'invoices' | 'appearance'>('invoices');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'All'>('All');
  const [typeFilter, setTypeFilter] = useState<
    'All' | 'Reservation' | 'POS' | 'Facility' | 'Manual' | 'Requisition'
  >('All');
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showAdvancedLedger, setShowAdvancedLedger] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState<InvoiceFormState>(buildDefaultForm());
  const [selectedInvoice, setSelectedInvoice] = useState<FinanceInvoice | null>(null);
  const [editInvoiceForm, setEditInvoiceForm] = useState<EditInvoiceFormState>({
    counterpartyName: '',
    notes: '',
    dueAt: '',
  });
  const [linkSearch, setLinkSearch] = useState('');
  const [appearanceForm, setAppearanceForm] = useState({
    accentColor: '#1d4ed8',
    headerTitle: 'Invoice',
    footerNote: 'Thank you for your business.',
    showLogo: true,
    showTaxBreakdown: true,
    showNotes: true,
  });

  const { data, isLoading } = useFinanceInvoices();
  const { data: hotelProfile } = useHotelProfile();
  const { data: accounts = [] } = useAccounts();
  const reservationLookup = useReservations({
    search: linkSearch || undefined,
    limit: 8,
  });
  const posLookup = usePosOrders(
    {
      search: linkSearch || undefined,
      limit: 8,
    },
    { refetchInterval: false },
  );
  const facilityBookingLookup = useFacilityBookings({
    search: linkSearch || undefined,
    limit: 8,
  });
  const requisitionLookup = useFacilityRequisitions({
    search: linkSearch || undefined,
    limit: 8,
    status: 'APPROVED',
  });
  const createInvoice = useCreateFinanceInvoice();
  const updateInvoice = useUpdateFinanceInvoice(selectedInvoice?.id || '');
  const updateHotelProfile = useUpdateHotelProfile();
  const invoices = data?.invoices ?? [];

  useEffect(() => {
    if (!hotelProfile?.invoiceTemplateSettings) return;
    setAppearanceForm({
      accentColor: hotelProfile.invoiceTemplateSettings.accentColor,
      headerTitle: hotelProfile.invoiceTemplateSettings.headerTitle,
      footerNote: hotelProfile.invoiceTemplateSettings.footerNote,
      showLogo: hotelProfile.invoiceTemplateSettings.showLogo,
      showTaxBreakdown: hotelProfile.invoiceTemplateSettings.showTaxBreakdown,
      showNotes: hotelProfile.invoiceTemplateSettings.showNotes,
    });
  }, [hotelProfile?.invoiceTemplateSettings]);

  const normalized = useMemo(
    () =>
      invoices.map((inv) => ({
        id: inv.id,
        number: inv.invoiceNo,
        party: invoiceParty(inv),
        type: invoiceType(inv),
        date: new Date(inv.issuedAt).toISOString().slice(0, 10),
        due: inv.dueAt ? new Date(inv.dueAt).toISOString().slice(0, 10) : '—',
        amount: inv.total,
        paid: inv.paidAmount,
        status: invoiceStatus(inv),
        description: invoiceDescription(inv),
      })),
    [invoices],
  );

  const filtered = useMemo(
    () =>
      normalized.filter((invoice) => {
        const matchesSearch = `${invoice.number} ${invoice.party} ${invoice.description}`
          .toLowerCase()
          .includes(search.toLowerCase());
        const matchesStatus = statusFilter === 'All' || invoice.status === statusFilter;
        const matchesType = typeFilter === 'All' || invoice.type === typeFilter;
        return matchesSearch && matchesStatus && matchesType;
      }),
    [normalized, search, statusFilter, typeFilter],
  );

  const totals = useMemo(
    () => ({
      total: normalized.reduce((sum, invoice) => sum + invoice.amount, 0),
      paid: normalized
        .filter((invoice) => invoice.status === 'Paid')
        .reduce((sum, invoice) => sum + invoice.amount, 0),
      outstanding: normalized
        .filter((invoice) => invoice.status !== 'Paid' && invoice.status !== 'Refunded')
        .reduce((sum, invoice) => sum + (invoice.amount - invoice.paid), 0),
      overdue: normalized
        .filter((invoice) => invoice.status === 'Overdue')
        .reduce((sum, invoice) => sum + (invoice.amount - invoice.paid), 0),
    }),
    [normalized],
  );

  const rangeLabel = data?.range
    ? new Date(data.range.from).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    : '—';

  const selectedReservation = useMemo(
    () =>
      (reservationLookup.data?.reservations ?? []).find(
        (item) => item.id === invoiceForm.reservationId,
      ) ?? null,
    [reservationLookup.data?.reservations, invoiceForm.reservationId],
  );
  const selectedPosOrder = useMemo(
    () => (posLookup.data?.orders ?? []).find((item) => item.id === invoiceForm.posOrderId) ?? null,
    [posLookup.data?.orders, invoiceForm.posOrderId],
  );
  const selectedFacilityBooking = useMemo(
    () =>
      (facilityBookingLookup.data?.bookings ?? []).find(
        (item) => item.id === invoiceForm.facilityBookingId,
      ) ?? null,
    [facilityBookingLookup.data?.bookings, invoiceForm.facilityBookingId],
  );
  const selectedRequisition = useMemo(
    () =>
      (requisitionLookup.data?.requisitions ?? []).find(
        (item) => item.id === invoiceForm.requisitionId,
      ) ?? null,
    [requisitionLookup.data?.requisitions, invoiceForm.requisitionId],
  );

  useEffect(() => {
    if (invoiceForm.sourceType === 'RESERVATION' && selectedReservation) {
      setInvoiceForm((current) => ({
        ...current,
        counterpartyName:
          current.counterpartyName ||
          `${selectedReservation.guest?.firstName ?? ''} ${selectedReservation.guest?.lastName ?? ''}`.trim(),
        notes: current.notes || `Reservation ${selectedReservation.reservationNo}`,
        subtotal:
          current.subtotal ||
          String(
            Number(selectedReservation.totalAmount ?? selectedReservation.room?.baseRate ?? 0),
          ),
      }));
    }
  }, [invoiceForm.sourceType, selectedReservation]);

  useEffect(() => {
    if (invoiceForm.sourceType === 'POS' && selectedPosOrder) {
      const posName = selectedPosOrder.reservation?.guest
        ? `${selectedPosOrder.reservation.guest.firstName} ${selectedPosOrder.reservation.guest.lastName}`.trim()
        : selectedPosOrder.roomNo
          ? `Room ${selectedPosOrder.roomNo}`
          : selectedPosOrder.tableNo
            ? `Table ${selectedPosOrder.tableNo}`
            : `POS ${selectedPosOrder.orderNo}`;
      setInvoiceForm((current) => ({
        ...current,
        counterpartyName: current.counterpartyName || posName,
        notes: current.notes || `POS ${selectedPosOrder.orderNo}`,
        subtotal: current.subtotal || String(Number(selectedPosOrder.total ?? 0)),
      }));
    }
  }, [invoiceForm.sourceType, selectedPosOrder]);

  useEffect(() => {
    if (invoiceForm.sourceType === 'FACILITY' && selectedFacilityBooking) {
      setInvoiceForm((current) => ({
        ...current,
        counterpartyName:
          current.counterpartyName ||
          selectedFacilityBooking.guestName ||
          selectedFacilityBooking.facility?.name ||
          '',
        notes:
          current.notes ||
          selectedFacilityBooking.notes ||
          selectedFacilityBooking.facility?.name ||
          '',
        subtotal: current.subtotal || String(Number(selectedFacilityBooking.amount ?? 0)),
      }));
    }
  }, [invoiceForm.sourceType, selectedFacilityBooking]);

  useEffect(() => {
    if (invoiceForm.sourceType === 'REQUISITION' && selectedRequisition) {
      setInvoiceForm((current) => ({
        ...current,
        counterpartyName:
          current.counterpartyName ||
          selectedRequisition.facility?.name ||
          selectedRequisition.title,
        notes: current.notes || selectedRequisition.description || selectedRequisition.title,
        subtotal: String(Number(selectedRequisition.estimatedTotal ?? 0)),
        tax: '0',
        discount: '0',
      }));
    }
  }, [invoiceForm.sourceType, selectedRequisition]);

  const computedSubtotal = Number(invoiceForm.subtotal || 0);
  const computedTax = Number(invoiceForm.tax || 0);
  const computedDiscount = Number(invoiceForm.discount || 0);
  const total = Math.max(computedSubtotal + computedTax - computedDiscount, 0);
  const initialPaymentAmount = Number(invoiceForm.initialPaymentAmount || 0);
  const derivedStatus: InvoiceStatus =
    invoiceForm.recordInitialPayment && initialPaymentAmount >= total && total > 0
      ? 'Paid'
      : invoiceForm.recordInitialPayment && initialPaymentAmount > 0
        ? 'Partial'
        : 'Unpaid';

  const handleExport = () => {
    window.open('/api/proxy/finance/invoices/export', '_blank', 'noopener,noreferrer');
  };

  const handlePrint = (id: string) => {
    window.open(`/api/proxy/finance/invoices/${id}/print`, 'invoice', 'width=960,height=720');
  };

  const handleOpenEdit = (invoiceId: string) => {
    const invoice = invoices.find((item) => item.id === invoiceId);
    if (!invoice) return;
    setSelectedInvoice(invoice);
    setEditInvoiceForm({
      counterpartyName: invoice.counterpartyName || '',
      notes: invoice.notes || '',
      dueAt: invoice.dueAt ? new Date(invoice.dueAt).toISOString().slice(0, 10) : '',
    });
    setShowEdit(true);
  };

  const handleUpdateInvoice = async () => {
    await updateInvoice.mutateAsync({
      counterpartyName: editInvoiceForm.counterpartyName,
      notes: editInvoiceForm.notes || undefined,
      dueAt: editInvoiceForm.dueAt || undefined,
    });
    setShowEdit(false);
    setSelectedInvoice(null);
  };

  const handleSourceChange = (sourceType: SourceType) => {
    setInvoiceForm((current) => ({
      ...buildDefaultForm(),
      sourceType,
      dueAt: current.dueAt,
      initialPaymentPaidAt: current.initialPaymentPaidAt,
    }));
    setLinkSearch('');
  };

  const handleCreateInvoice = async () => {
    const payload: CreateFinanceInvoiceInput = {
      type: invoiceForm.sourceType,
      sourceType: invoiceForm.sourceType,
      counterpartyName: invoiceForm.counterpartyName,
      notes: invoiceForm.notes || undefined,
      dueAt: invoiceForm.dueAt || undefined,
      subtotal: Number(invoiceForm.subtotal || 0),
      tax: invoiceForm.sourceType === 'REQUISITION' ? 0 : Number(invoiceForm.tax || 0),
      discount: invoiceForm.sourceType === 'REQUISITION' ? 0 : Number(invoiceForm.discount || 0),
      reservationId: invoiceForm.reservationId || undefined,
      posOrderId: invoiceForm.posOrderId || undefined,
      facilityBookingId: invoiceForm.facilityBookingId || undefined,
      requisitionId: invoiceForm.requisitionId || undefined,
      debitAccountCode: invoiceForm.debitAccountCode || undefined,
      creditAccountCode: invoiceForm.creditAccountCode || undefined,
      recordInitialPayment: invoiceForm.recordInitialPayment,
      initialPaymentAmount: invoiceForm.recordInitialPayment
        ? Number(invoiceForm.initialPaymentAmount || 0)
        : undefined,
      initialPaymentMethod: invoiceForm.recordInitialPayment
        ? invoiceForm.initialPaymentMethod
        : undefined,
      initialPaymentReference: invoiceForm.initialPaymentReference || undefined,
      initialPaymentNote: invoiceForm.initialPaymentNote || undefined,
      initialPaymentPaidAt: invoiceForm.recordInitialPayment
        ? invoiceForm.initialPaymentPaidAt || undefined
        : undefined,
      initialPaymentDebitAccountCode: invoiceForm.initialPaymentDebitAccountCode || undefined,
      initialPaymentCreditAccountCode: invoiceForm.initialPaymentCreditAccountCode || undefined,
    };

    await createInvoice.mutateAsync(payload);
    setInvoiceForm(buildDefaultForm());
    setLinkSearch('');
    setShowAdvancedLedger(false);
    setShowCreate(false);
  };

  const handleSaveAppearance = async () => {
    await updateHotelProfile.mutateAsync({
      invoiceTemplateSettings: appearanceForm,
    });
  };

  const linkResults =
    invoiceForm.sourceType === 'RESERVATION'
      ? (reservationLookup.data?.reservations ?? [])
      : invoiceForm.sourceType === 'POS'
        ? (posLookup.data?.orders ?? [])
        : invoiceForm.sourceType === 'FACILITY'
          ? (facilityBookingLookup.data?.bookings ?? [])
          : invoiceForm.sourceType === 'REQUISITION'
            ? (requisitionLookup.data?.requisitions ?? [])
            : [];

  const isLinkLoading =
    invoiceForm.sourceType === 'RESERVATION'
      ? reservationLookup.isLoading
      : invoiceForm.sourceType === 'POS'
        ? posLookup.isLoading
        : invoiceForm.sourceType === 'FACILITY'
          ? facilityBookingLookup.isLoading
          : requisitionLookup.isLoading;

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Invoices</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              {isLoading ? 'Loading invoices…' : `${normalized.length} invoices · ${rangeLabel}`}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 rounded-lg border border-[#1e2536] bg-[#161b27] px-3 py-2 text-sm font-medium text-slate-300 transition-all hover:border-slate-500"
            >
              <Download size={13} /> Export
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
            >
              <Plus size={15} /> New Invoice
            </button>
          </div>
        </div>

        <div className="flex w-fit gap-1 rounded-xl border border-[#1e2536] bg-[#161b27] p-1">
          {[
            { key: 'invoices', label: 'Invoices', icon: Receipt },
            { key: 'appearance', label: 'Appearance', icon: Palette },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setView(key as 'invoices' | 'appearance')}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                view === key
                  ? 'bg-blue-600/20 text-blue-400'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {view === 'invoices' ? (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                { label: 'Total Invoiced', value: fmtMoney(totals.total), color: 'text-slate-200' },
                { label: 'Collected', value: fmtMoney(totals.paid), color: 'text-emerald-400' },
                {
                  label: 'Outstanding',
                  value: fmtMoney(totals.outstanding),
                  color: 'text-amber-400',
                },
                { label: 'Overdue', value: fmtMoney(totals.overdue), color: 'text-red-400' },
              ].map(({ label, value, color }) => (
                <div
                  key={label}
                  className="rounded-xl border border-[#1e2536] bg-[#161b27] px-4 py-4"
                >
                  <p className="mb-1 text-xs uppercase tracking-wider text-slate-500">{label}</p>
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              {(['All', ...ALL_STATUSES] as const).map((status) => {
                const active = statusFilter === status;
                const count =
                  status === 'All'
                    ? normalized.length
                    : normalized.filter((invoice) => invoice.status === status).length;
                const cfg = status !== 'All' ? STATUS_CONFIG[status] : null;

                return (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status as any)}
                    className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                      active
                        ? cfg
                          ? `${cfg.bg} ${cfg.border} ${cfg.color}`
                          : 'border-blue-500/30 bg-blue-600/20 text-blue-400'
                        : 'border-[#1e2536] bg-[#161b27] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {cfg ? <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} /> : null}
                    {status}
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] ${active ? 'bg-white/20' : 'bg-white/5'}`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex min-w-48 flex-1 items-center gap-2 rounded-lg border border-[#1e2536] bg-[#161b27] px-3 py-2">
                <Search size={14} className="shrink-0 text-slate-500" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search invoice, guest, description..."
                  className="flex-1 bg-transparent text-sm text-slate-300 outline-none placeholder:text-slate-600"
                />
              </div>
              <div className="flex gap-1 rounded-lg border border-[#1e2536] bg-[#161b27] p-1">
                {(['All', 'Reservation', 'POS', 'Facility', 'Manual', 'Requisition'] as const).map(
                  (type) => (
                    <button
                      key={type}
                      onClick={() => setTypeFilter(type)}
                      className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                        typeFilter === type
                          ? 'bg-blue-600/20 text-blue-400'
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {type}
                    </button>
                  ),
                )}
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-[#1e2536] bg-[#161b27]">
              <table className="w-full min-w-[760px]">
                <thead className="border-b border-[#1e2536] bg-[#0f1117]/50">
                  <tr>
                    {[
                      'Number',
                      'Type',
                      'Party',
                      'Description',
                      'Date',
                      'Due',
                      'Amount',
                      'Paid',
                      'Balance',
                      'Status',
                      'Actions',
                    ].map((heading) => (
                      <th
                        key={heading}
                        className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((invoice) => {
                    const balance = invoice.amount - invoice.paid;
                    return (
                      <tr
                        key={invoice.id}
                        className="border-b border-[#1e2536] transition-colors last:border-0 hover:bg-white/[0.02]"
                      >
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-400">
                          {invoice.number}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-300">{invoice.type}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-200">
                          {invoice.party}
                        </td>
                        <td className="max-w-[180px] truncate px-4 py-3 text-xs text-slate-500">
                          {invoice.description}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                          {invoice.date}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                          {invoice.due}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold text-slate-200">
                          {fmtMoney(invoice.amount)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-emerald-400">
                          {fmtMoney(invoice.paid)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-amber-300">
                          {balance > 0 ? fmtMoney(balance) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={invoice.status} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleOpenEdit(invoice.id)}
                              className="inline-flex items-center gap-1 rounded-lg border border-[#1e2536] bg-white/5 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-white/10"
                            >
                              <Pencil size={12} />
                              Edit
                            </button>
                            <button
                              onClick={() => handlePrint(invoice.id)}
                              className="inline-flex items-center gap-1 rounded-lg border border-[#1e2536] bg-white/5 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-white/10"
                            >
                              <Printer size={12} />
                              Print
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {isLoading ? (
                <div className="py-14 text-center">
                  <Loader2 size={28} className="mx-auto mb-2 animate-spin text-slate-600" />
                  <p className="text-sm text-slate-500">Loading invoices…</p>
                </div>
              ) : null}
              {!isLoading && filtered.length === 0 ? (
                <div className="py-14 text-center">
                  <Receipt size={28} className="mx-auto mb-2 text-slate-700" />
                  <p className="text-sm text-slate-500">No invoices match your filters</p>
                </div>
              ) : null}
            </div>
          </>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
            <div className="space-y-4 rounded-2xl border border-[#1e2536] bg-[#161b27] p-5">
              <div>
                <h2 className="text-lg font-semibold text-white">Invoice Look</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Control how printed invoices look hotel-wide.
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
                  Accent Color
                </label>
                <input
                  type="color"
                  value={appearanceForm.accentColor}
                  onChange={(event) =>
                    setAppearanceForm((current) => ({
                      ...current,
                      accentColor: event.target.value,
                    }))
                  }
                  className="h-11 w-full rounded-lg border border-[#1e2536] bg-[#0f1117] px-2"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
                  Header Title
                </label>
                <input
                  value={appearanceForm.headerTitle}
                  onChange={(event) =>
                    setAppearanceForm((current) => ({
                      ...current,
                      headerTitle: event.target.value,
                    }))
                  }
                  className={fieldClassName()}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
                  Footer Note
                </label>
                <textarea
                  rows={4}
                  value={appearanceForm.footerNote}
                  onChange={(event) =>
                    setAppearanceForm((current) => ({ ...current, footerNote: event.target.value }))
                  }
                  className={fieldClassName()}
                />
              </div>

              {[
                ['showLogo', 'Show hotel logo'],
                ['showTaxBreakdown', 'Show tax breakdown'],
                ['showNotes', 'Show notes block'],
              ].map(([key, label]) => (
                <label
                  key={key}
                  className="flex items-center justify-between rounded-lg border border-[#1e2536] bg-[#0f1117] px-3 py-3 text-sm text-slate-300"
                >
                  <span>{label}</span>
                  <input
                    type="checkbox"
                    checked={(appearanceForm as any)[key]}
                    onChange={(event) =>
                      setAppearanceForm((current) => ({ ...current, [key]: event.target.checked }))
                    }
                    className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-blue-500"
                  />
                </label>
              ))}

              <button
                onClick={handleSaveAppearance}
                disabled={updateHotelProfile.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-60"
              >
                {updateHotelProfile.isPending ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : null}
                Save Appearance
              </button>
            </div>

            <div
              className="rounded-[28px] border border-slate-800/80 p-6"
              style={{
                background: `linear-gradient(145deg, ${appearanceForm.accentColor}18, rgba(15,17,23,0.96) 38%)`,
              }}
            >
              <div className="rounded-[24px] border border-white/10 bg-[#f8fafc] p-6 text-slate-900 shadow-2xl">
                <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-5">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Preview</p>
                    <h3
                      className="mt-2 text-2xl font-semibold"
                      style={{ color: appearanceForm.accentColor }}
                    >
                      {appearanceForm.headerTitle}
                    </h3>
                    <p className="mt-2 text-sm text-slate-500">
                      {hotelProfile?.name ?? 'Your Hotel'} · 000123
                    </p>
                  </div>
                  {appearanceForm.showLogo ? (
                    <div
                      className="grid h-14 w-14 place-items-center rounded-2xl text-xs font-semibold text-white"
                      style={{ backgroundColor: appearanceForm.accentColor }}
                    >
                      Logo
                    </div>
                  ) : null}
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl bg-slate-100 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Billed To</p>
                    <p className="mt-2 font-medium text-slate-800">Guest / Company Name</p>
                    <p className="mt-1 text-sm text-slate-500">Source-linked or manual entry</p>
                  </div>
                  <div className="rounded-2xl bg-slate-100 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                      Status Logic
                    </p>
                    <p className="mt-2 font-medium text-slate-800">Unpaid / Partial / Paid</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Derived from initial payment and later settlements
                    </p>
                  </div>
                </div>

                <div className="mt-6 rounded-2xl border border-slate-200">
                  <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 text-sm">
                    <span>Subtotal</span>
                    <span>{fmtMoney(180000)}</span>
                  </div>
                  {appearanceForm.showTaxBreakdown ? (
                    <>
                      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 text-sm">
                        <span>Tax</span>
                        <span>{fmtMoney(15000)}</span>
                      </div>
                      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 text-sm">
                        <span>Discount</span>
                        <span>{fmtMoney(5000)}</span>
                      </div>
                    </>
                  ) : null}
                  <div className="flex items-center justify-between px-4 py-4 text-base font-semibold">
                    <span>Total</span>
                    <span style={{ color: appearanceForm.accentColor }}>{fmtMoney(190000)}</span>
                  </div>
                </div>

                {appearanceForm.showNotes ? (
                  <div className="mt-6 rounded-2xl bg-slate-100 p-4 text-sm text-slate-600">
                    Notes and special invoice messaging appear here when present.
                  </div>
                ) : null}

                <div className="mt-6 border-t border-slate-200 pt-4 text-sm text-slate-500">
                  {appearanceForm.footerNote}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <Drawer
        open={showEdit}
        onOpenChange={(open) => {
          setShowEdit(open);
          if (!open) setSelectedInvoice(null);
        }}
        direction="right"
      >
        <DrawerOverlay className="bg-black/70 backdrop-blur-sm" />
        <DrawerContent className="flex flex-col h-full w-full max-w-xl overflow-y-auto border-l border-[#1e2536] bg-[#11131b] text-white shadow-2xl sm:!max-w-xl">
          <DrawerHeader className="border-b border-[#1e2536] px-6 py-5">
            <DrawerTitle className="text-xl font-semibold text-white">Edit Invoice</DrawerTitle>
            <p className="mt-1 text-sm text-slate-500">
              Update billed-to details, due date, and notes without changing payment history.
            </p>
          </DrawerHeader>

          <div className="space-y-6 p-6">
            {selectedInvoice ? (
              <div className="rounded-2xl border border-[#1e2536] bg-[#161b27] p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Invoice</span>
                  <span className="font-semibold text-white">{selectedInvoice.invoiceNo}</span>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <div className="rounded-xl bg-[#0f1117] px-3 py-3">
                    <p className="text-xs uppercase tracking-wider text-slate-500">Status</p>
                    <div className="mt-2">
                      <StatusBadge status={invoiceStatus(selectedInvoice)} />
                    </div>
                  </div>
                  <div className="rounded-xl bg-[#0f1117] px-3 py-3">
                    <p className="text-xs uppercase tracking-wider text-slate-500">Total</p>
                    <p className="mt-1 text-sm font-semibold text-slate-100">
                      {fmtMoney(selectedInvoice.total)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#0f1117] px-3 py-3">
                    <p className="text-xs uppercase tracking-wider text-slate-500">Outstanding</p>
                    <p className="mt-1 text-sm font-semibold text-amber-300">
                      {fmtMoney(selectedInvoice.balance)}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
                  Billed To
                </label>
                <input
                  value={editInvoiceForm.counterpartyName}
                  onChange={(event) =>
                    setEditInvoiceForm((current) => ({
                      ...current,
                      counterpartyName: event.target.value,
                    }))
                  }
                  className={fieldClassName()}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
                  Due Date
                </label>
                <input
                  type="date"
                  value={editInvoiceForm.dueAt}
                  onChange={(event) =>
                    setEditInvoiceForm((current) => ({
                      ...current,
                      dueAt: event.target.value,
                    }))
                  }
                  className={fieldClassName()}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
                  Notes
                </label>
                <textarea
                  rows={4}
                  value={editInvoiceForm.notes}
                  onChange={(event) =>
                    setEditInvoiceForm((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                  className={fieldClassName()}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-[#1e2536] bg-[#161b27] p-4 text-sm text-slate-400">
              Payment status stays tied to real payments. To settle an unpaid or overdue invoice,
              use the payments screen.
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-[#1e2536] pt-2">
              <button
                onClick={() => setShowEdit(false)}
                className="rounded-lg border border-[#1e2536] px-4 py-2 text-sm text-slate-300 transition-colors hover:border-slate-500"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateInvoice}
                disabled={updateInvoice.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-60"
              >
                {updateInvoice.isPending ? <Loader2 size={15} className="animate-spin" /> : null}
                Save Changes
              </button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      <Drawer open={showCreate} onOpenChange={setShowCreate} direction="right">
        <DrawerOverlay className="bg-black/70 backdrop-blur-sm" />
        <DrawerContent className="flex flex-col h-full w-full max-w-xl overflow-y-auto border-l border-[#1e2536] bg-[#11131b] text-white shadow-2xl sm:!max-w-xl">
          <DrawerHeader className="border-b border-[#1e2536] px-6 py-5">
            <DrawerTitle className="text-xl font-semibold text-white">Create Invoice</DrawerTitle>
            <p className="mt-1 text-sm text-slate-500">
              Link a reservation, POS order, facility booking, or approved requisition, or create a
              manual invoice.
            </p>
          </DrawerHeader>

          <div className="space-y-6 p-6">
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5 overflow-x-auto">
              {SOURCE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleSourceChange(option.value)}
                  className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                    invoiceForm.sourceType === option.value
                      ? 'border-blue-500/40 bg-blue-500/10'
                      : 'border-[#1e2536] bg-[#161b27] hover:border-slate-500'
                  }`}
                >
                  <p className="text-sm font-semibold text-white">{option.label}</p>
                  <p className="mt-2 text-xs text-slate-500">{option.hint}</p>
                </button>
              ))}
            </div>

            {invoiceForm.sourceType !== 'MANUAL' ? (
              <div className="rounded-2xl border border-[#1e2536] bg-[#161b27] p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Link Source</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Search and choose the record this invoice should be attached to.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-[#1e2536] bg-[#0f1117] px-3 py-2">
                  <Search size={14} className="text-slate-500" />
                  <input
                    value={linkSearch}
                    onChange={(event) => setLinkSearch(event.target.value)}
                    placeholder={`Search ${invoiceForm.sourceType.toLowerCase()}...`}
                    className="flex-1 bg-transparent text-sm text-slate-200 outline-none placeholder:text-slate-600"
                  />
                </div>
                <div className="mt-3 space-y-2">
                  {isLinkLoading ? (
                    <div className="flex items-center gap-2 rounded-xl border border-[#1e2536] bg-[#0f1117] px-3 py-3 text-sm text-slate-500">
                      <Loader2 size={14} className="animate-spin" /> Loading matches…
                    </div>
                  ) : null}
                  {!isLinkLoading && linkResults.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-[#1e2536] px-3 py-4 text-sm text-slate-500">
                      No records found for this source yet.
                    </div>
                  ) : null}
                  {!isLinkLoading &&
                    linkResults.map((item: any) => {
                      const selected =
                        (invoiceForm.sourceType === 'RESERVATION' &&
                          invoiceForm.reservationId === item.id) ||
                        (invoiceForm.sourceType === 'POS' && invoiceForm.posOrderId === item.id) ||
                        (invoiceForm.sourceType === 'FACILITY' &&
                          invoiceForm.facilityBookingId === item.id) ||
                        (invoiceForm.sourceType === 'REQUISITION' &&
                          invoiceForm.requisitionId === item.id);
                      const title =
                        invoiceForm.sourceType === 'RESERVATION'
                          ? `${item.reservationNo} · ${item.guest?.firstName ?? ''} ${item.guest?.lastName ?? ''}`.trim()
                          : invoiceForm.sourceType === 'POS'
                            ? `${item.orderNo} · ${item.roomNo ? `Room ${item.roomNo}` : item.tableNo ? `Table ${item.tableNo}` : item.type}`
                            : invoiceForm.sourceType === 'FACILITY'
                              ? `${item.facility?.name ?? 'Facility'} · ${item.guestName ?? item.roomNo ?? item.id}`
                              : `${item.title} · ${item.facility?.name ?? 'Facility'}`;
                      const meta =
                        invoiceForm.sourceType === 'RESERVATION'
                          ? fmtMoney(Number(item.totalAmount ?? item.room?.baseRate ?? 0))
                          : invoiceForm.sourceType === 'POS'
                            ? fmtMoney(Number(item.total ?? 0))
                            : invoiceForm.sourceType === 'FACILITY'
                              ? fmtMoney(Number(item.amount ?? 0))
                              : fmtMoney(Number(item.estimatedTotal ?? 0));

                      return (
                        <button
                          key={item.id}
                          onClick={() =>
                            setInvoiceForm((current) => ({
                              ...current,
                              reservationId:
                                invoiceForm.sourceType === 'RESERVATION' ? item.id : '',
                              posOrderId: invoiceForm.sourceType === 'POS' ? item.id : '',
                              facilityBookingId:
                                invoiceForm.sourceType === 'FACILITY' ? item.id : '',
                              requisitionId:
                                invoiceForm.sourceType === 'REQUISITION' ? item.id : '',
                            }))
                          }
                          className={`w-full rounded-xl border px-3 py-3 text-left transition-all ${
                            selected
                              ? 'border-blue-500/40 bg-blue-500/10'
                              : 'border-[#1e2536] bg-[#0f1117] hover:border-slate-500'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium text-slate-100">{title}</p>
                              <p className="mt-1 text-xs text-slate-500">
                                {invoiceForm.sourceType === 'REQUISITION'
                                  ? item.status
                                  : item.notes || item.description || 'Linked source'}
                              </p>
                            </div>
                            <span className="text-xs font-semibold text-slate-300">{meta}</span>
                          </div>
                        </button>
                      );
                    })}
                </div>
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
                  Billed To
                </label>
                <input
                  value={invoiceForm.counterpartyName}
                  onChange={(event) =>
                    setInvoiceForm((current) => ({
                      ...current,
                      counterpartyName: event.target.value,
                    }))
                  }
                  placeholder="Guest, company, supplier, or payer"
                  className={fieldClassName()}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
                  Due Date
                </label>
                <input
                  type="date"
                  value={invoiceForm.dueAt}
                  onChange={(event) =>
                    setInvoiceForm((current) => ({ ...current, dueAt: event.target.value }))
                  }
                  className={fieldClassName()}
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
                  Notes
                </label>
                <textarea
                  rows={3}
                  value={invoiceForm.notes}
                  onChange={(event) =>
                    setInvoiceForm((current) => ({ ...current, notes: event.target.value }))
                  }
                  placeholder="Describe what this invoice covers"
                  className={fieldClassName()}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
                  Subtotal
                </label>
                <input
                  type="number"
                  min="0"
                  value={invoiceForm.subtotal}
                  disabled={invoiceForm.sourceType === 'REQUISITION'}
                  onChange={(event) =>
                    setInvoiceForm((current) => ({ ...current, subtotal: event.target.value }))
                  }
                  className={fieldClassName(invoiceForm.sourceType === 'REQUISITION')}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
                  Tax
                </label>
                <input
                  type="number"
                  min="0"
                  value={invoiceForm.tax}
                  disabled={invoiceForm.sourceType === 'REQUISITION'}
                  onChange={(event) =>
                    setInvoiceForm((current) => ({ ...current, tax: event.target.value }))
                  }
                  className={fieldClassName(invoiceForm.sourceType === 'REQUISITION')}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
                  Discount
                </label>
                <input
                  type="number"
                  min="0"
                  value={invoiceForm.discount}
                  disabled={invoiceForm.sourceType === 'REQUISITION'}
                  onChange={(event) =>
                    setInvoiceForm((current) => ({ ...current, discount: event.target.value }))
                  }
                  className={fieldClassName(invoiceForm.sourceType === 'REQUISITION')}
                />
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-2xl border border-[#1e2536] bg-[#161b27] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Payment at Creation</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Leave this off for unpaid invoices, or turn it on to mark partial or paid by
                      posting the first payment now.
                    </p>
                  </div>
                  <label className="inline-flex items-center gap-2 text-sm text-slate-300">
                    <input
                      type="checkbox"
                      checked={invoiceForm.recordInitialPayment}
                      onChange={(event) =>
                        setInvoiceForm((current) => ({
                          ...current,
                          recordInitialPayment: event.target.checked,
                          initialPaymentAmount: event.target.checked
                            ? current.initialPaymentAmount || String(total)
                            : '',
                        }))
                      }
                      className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-blue-500"
                    />
                    Record payment now
                  </label>
                </div>

                {invoiceForm.recordInitialPayment ? (
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
                        Amount Paid
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={invoiceForm.initialPaymentAmount}
                        onChange={(event) =>
                          setInvoiceForm((current) => ({
                            ...current,
                            initialPaymentAmount: event.target.value,
                          }))
                        }
                        className={fieldClassName()}
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
                        Payment Method
                      </label>
                      <select
                        value={invoiceForm.initialPaymentMethod}
                        onChange={(event) =>
                          setInvoiceForm((current) => ({
                            ...current,
                            initialPaymentMethod: event.target.value,
                          }))
                        }
                        className={fieldClassName()}
                      >
                        {PAYMENT_METHODS.map((method) => (
                          <option key={method.value} value={method.value}>
                            {method.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
                        Reference
                      </label>
                      <input
                        value={invoiceForm.initialPaymentReference}
                        onChange={(event) =>
                          setInvoiceForm((current) => ({
                            ...current,
                            initialPaymentReference: event.target.value,
                          }))
                        }
                        className={fieldClassName()}
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
                        Paid Date
                      </label>
                      <input
                        type="date"
                        value={invoiceForm.initialPaymentPaidAt}
                        onChange={(event) =>
                          setInvoiceForm((current) => ({
                            ...current,
                            initialPaymentPaidAt: event.target.value,
                          }))
                        }
                        className={fieldClassName()}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
                        Payment Note
                      </label>
                      <textarea
                        rows={2}
                        value={invoiceForm.initialPaymentNote}
                        onChange={(event) =>
                          setInvoiceForm((current) => ({
                            ...current,
                            initialPaymentNote: event.target.value,
                          }))
                        }
                        className={fieldClassName()}
                      />
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="rounded-2xl border border-[#1e2536] bg-[#161b27] p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <WalletCards size={16} />
                  Invoice Summary
                </div>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Source</span>
                    <span className="text-slate-200">{invoiceForm.sourceType}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Total</span>
                    <span className="text-lg font-semibold text-white">{fmtMoney(total)}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Initial payment</span>
                    <span className="text-slate-200">
                      {invoiceForm.recordInitialPayment ? fmtMoney(initialPaymentAmount) : 'None'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Expected status</span>
                    <StatusBadge status={derivedStatus} />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[#1e2536] bg-[#161b27] p-4">
              <button
                onClick={() => setShowAdvancedLedger((current) => !current)}
                className="text-sm font-semibold text-blue-400"
              >
                {showAdvancedLedger ? 'Hide' : 'Show'} Advanced Ledger Overrides
              </button>
              <p className="mt-1 text-xs text-slate-500">
                Leave this alone for default posting. Use it only when finance wants specific debit
                and credit accounts.
              </p>

              {showAdvancedLedger ? (
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
                      Invoice Debit Account
                    </label>
                    <select
                      value={invoiceForm.debitAccountCode}
                      onChange={(event) =>
                        setInvoiceForm((current) => ({
                          ...current,
                          debitAccountCode: event.target.value,
                        }))
                      }
                      className={fieldClassName()}
                    >
                      <option value="">Use default</option>
                      {accounts.map((account) => (
                        <option key={account.code} value={account.code}>
                          {account.code} · {account.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
                      Invoice Credit Account
                    </label>
                    <select
                      value={invoiceForm.creditAccountCode}
                      onChange={(event) =>
                        setInvoiceForm((current) => ({
                          ...current,
                          creditAccountCode: event.target.value,
                        }))
                      }
                      className={fieldClassName()}
                    >
                      <option value="">Use default</option>
                      {accounts.map((account) => (
                        <option key={account.code} value={account.code}>
                          {account.code} · {account.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {invoiceForm.recordInitialPayment ? (
                    <>
                      <div>
                        <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
                          Payment Debit Account
                        </label>
                        <select
                          value={invoiceForm.initialPaymentDebitAccountCode}
                          onChange={(event) =>
                            setInvoiceForm((current) => ({
                              ...current,
                              initialPaymentDebitAccountCode: event.target.value,
                            }))
                          }
                          className={fieldClassName()}
                        >
                          <option value="">Use default</option>
                          {accounts.map((account) => (
                            <option key={account.code} value={account.code}>
                              {account.code} · {account.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
                          Payment Credit Account
                        </label>
                        <select
                          value={invoiceForm.initialPaymentCreditAccountCode}
                          onChange={(event) =>
                            setInvoiceForm((current) => ({
                              ...current,
                              initialPaymentCreditAccountCode: event.target.value,
                            }))
                          }
                          className={fieldClassName()}
                        >
                          <option value="">Use default</option>
                          {accounts.map((account) => (
                            <option key={account.code} value={account.code}>
                              {account.code} · {account.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-[#1e2536] pt-2">
              <button
                onClick={() => setShowCreate(false)}
                className="rounded-lg border border-[#1e2536] px-4 py-2 text-sm text-slate-300 transition-colors hover:border-slate-500"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateInvoice}
                disabled={createInvoice.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-60"
              >
                {createInvoice.isPending ? <Loader2 size={15} className="animate-spin" /> : null}
                Create Invoice
              </button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
