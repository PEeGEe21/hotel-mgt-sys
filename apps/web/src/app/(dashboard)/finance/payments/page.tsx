'use client';

import { useMemo, useState } from 'react';
import { Download, Loader2, Plus, Search } from 'lucide-react';
import {
  useFinanceInvoices,
  useFinancePayments,
  useRecordFinancePayment,
} from '@/hooks/finance/useFinance';
import { useAccounts } from '@/hooks/finance/useLedger';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  DrawerTitle,
} from '@/components/ui/drawer';

type PaymentMethod =
  | 'Cash'
  | 'Card'
  | 'Transfer'
  | 'POS'
  | 'Room Charge'
  | 'Mobile Money'
  | 'Other';
type PaymentDir = 'Received' | 'Disbursed';

const METHOD_COLORS: Record<PaymentMethod, string> = {
  Cash: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  Card: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  Transfer: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  POS: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  'Room Charge': 'text-slate-300 bg-slate-500/10 border-slate-500/20',
  'Mobile Money': 'text-teal-400 bg-teal-500/10 border-teal-500/20',
  Other: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
};

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'CARD', label: 'Card' },
  { value: 'BANK_TRANSFER', label: 'Transfer' },
  { value: 'POS', label: 'POS' },
  { value: 'ROOM_CHARGE', label: 'Room Charge' },
  { value: 'MOBILE_MONEY', label: 'Mobile Money' },
  { value: 'OTHER', label: 'Other' },
];

function fmtMoney(n: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(n);
}

function paymentMethodLabel(payment: any): PaymentMethod {
  const raw = payment.method?.toUpperCase();
  if (raw === 'CASH') return 'Cash';
  if (raw === 'CARD') return 'Card';
  if (raw === 'POS') return 'POS';
  if (raw === 'BANK_TRANSFER') return 'Transfer';
  if (raw === 'MOBILE_MONEY') return 'Mobile Money';
  if (raw === 'ROOM_CHARGE') return 'Room Charge';
  return 'Other';
}

function paymentDirection(payment: any): PaymentDir {
  const type = payment.invoice?.type;
  return type === 'RESERVATION' || type === 'POS' || type === 'FACILITY' || type === 'MANUAL'
    ? 'Received'
    : 'Disbursed';
}

function paymentParty(payment: any) {
  const guest = payment.invoice?.reservation?.guest ?? payment.invoice?.posOrder?.reservation?.guest;
  if (guest) return `${guest.firstName} ${guest.lastName}`;
  if (payment.invoice?.counterpartyName) return payment.invoice.counterpartyName;
  if (payment.invoice?.requisition?.title) return payment.invoice.requisition.title;
  if (payment.invoice?.posOrder?.roomNo) return `Room ${payment.invoice.posOrder.roomNo}`;
  if (payment.invoice?.posOrder?.tableNo) return `Table ${payment.invoice.posOrder.tableNo}`;
  return 'Walk-in';
}

function paymentDescription(payment: any) {
  if (payment.invoice?.requisition?.title) return payment.invoice.requisition.title;
  if (payment.invoice?.invoiceNo) return `Invoice ${payment.invoice.invoiceNo}`;
  if (payment.invoice?.posOrder?.orderNo) return `POS ${payment.invoice.posOrder.orderNo}`;
  return 'Payment';
}

function fieldClassName() {
  return 'w-full rounded-lg border border-[#1e2536] bg-[#0f1117] px-3 py-2.5 text-sm text-slate-200 outline-none transition-colors focus:border-blue-500';
}

export default function PaymentsPage() {
  const [search, setSearch] = useState('');
  const [dirFilter, setDirFilter] = useState<PaymentDir | 'All'>('All');
  const [showDrawer, setShowDrawer] = useState(false);
  const [showAdvancedLedger, setShowAdvancedLedger] = useState(false);
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [paymentForm, setPaymentForm] = useState({
    invoiceId: '',
    amount: '',
    method: 'CASH',
    reference: '',
    note: '',
    paidAt: new Date().toISOString().slice(0, 10),
    debitAccountCode: '',
    creditAccountCode: '',
  });

  const { data, isLoading } = useFinancePayments();
  const { data: accounts = [] } = useAccounts();
  const recordPayment = useRecordFinancePayment();
  const lookupFrom = useMemo(() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 1);
    return date.toISOString().slice(0, 10);
  }, []);
  const lookupTo = useMemo(() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 1);
    return date.toISOString().slice(0, 10);
  }, []);
  const { data: invoiceLookup, isLoading: invoicesLoading } = useFinanceInvoices({
    search: invoiceSearch || undefined,
    from: lookupFrom,
    to: lookupTo,
    limit: 40,
  });
  const payments = data?.payments ?? [];
  const outstandingInvoices = useMemo(
    () => (invoiceLookup?.invoices ?? []).filter((invoice) => Number(invoice.balance) > 0.009),
    [invoiceLookup?.invoices],
  );

  const normalized = useMemo(
    () =>
      payments.map((payment) => ({
        id: payment.id,
        date: new Date(payment.paidAt).toISOString().slice(0, 10),
        ref: payment.reference || payment.invoice?.invoiceNo || '—',
        party: paymentParty(payment),
        description: paymentDescription(payment),
        method: paymentMethodLabel(payment),
        direction: paymentDirection(payment),
        amount: payment.amount,
      })),
    [payments],
  );

  const filtered = useMemo(
    () =>
      normalized.filter((payment) => {
        const matchesSearch = `${payment.ref} ${payment.party} ${payment.description}`
          .toLowerCase()
          .includes(search.toLowerCase());
        const matchesDirection = dirFilter === 'All' || payment.direction === dirFilter;
        return matchesSearch && matchesDirection;
      }),
    [normalized, search, dirFilter],
  );

  const totals = {
    received: normalized
      .filter((payment) => payment.direction === 'Received')
      .reduce((sum, payment) => sum + payment.amount, 0),
    disbursed: normalized
      .filter((payment) => payment.direction === 'Disbursed')
      .reduce((sum, payment) => sum + payment.amount, 0),
  };

  const selectedInvoice = outstandingInvoices.find(
    (invoice) => invoice.id === paymentForm.invoiceId,
  );

  const rangeLabel = data?.range
    ? new Date(data.range.from).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    : '—';

  const handleExport = () => {
    window.open('/api/proxy/finance/payments/export', '_blank', 'noopener,noreferrer');
  };

  const handleRecordPayment = async () => {
    await recordPayment.mutateAsync({
      invoiceId: paymentForm.invoiceId,
      amount: Number(paymentForm.amount || 0),
      method: paymentForm.method,
      reference: paymentForm.reference || undefined,
      note: paymentForm.note || undefined,
      paidAt: paymentForm.paidAt || undefined,
      debitAccountCode: paymentForm.debitAccountCode || undefined,
      creditAccountCode: paymentForm.creditAccountCode || undefined,
    });
    setPaymentForm({
      invoiceId: '',
      amount: '',
      method: 'CASH',
      reference: '',
      note: '',
      paidAt: new Date().toISOString().slice(0, 10),
      debitAccountCode: '',
      creditAccountCode: '',
    });
    setInvoiceSearch('');
    setShowAdvancedLedger(false);
    setShowDrawer(false);
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Payments</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              {isLoading ? 'Loading payments…' : `${normalized.length} transactions · ${rangeLabel}`}
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
              onClick={() => setShowDrawer(true)}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
            >
              <Plus size={15} /> Record Payment
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total Received', value: fmtMoney(totals.received), color: 'text-emerald-400' },
            { label: 'Total Disbursed', value: fmtMoney(totals.disbursed), color: 'text-red-400' },
            { label: 'Net Cash Flow', value: fmtMoney(totals.received - totals.disbursed), color: 'text-blue-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl border border-[#1e2536] bg-[#161b27] px-4 py-4">
              <p className="mb-1 text-xs uppercase tracking-wider text-slate-500">{label}</p>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex min-w-48 flex-1 items-center gap-2 rounded-lg border border-[#1e2536] bg-[#161b27] px-3 py-2">
            <Search size={14} className="shrink-0 text-slate-500" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search payments..."
              className="flex-1 bg-transparent text-sm text-slate-300 outline-none placeholder:text-slate-600"
            />
          </div>
          <div className="flex gap-1 rounded-lg border border-[#1e2536] bg-[#161b27] p-1">
            {(['All', 'Received', 'Disbursed'] as const).map((direction) => (
              <button
                key={direction}
                onClick={() => setDirFilter(direction as any)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  dirFilter === direction
                    ? direction === 'Received'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : direction === 'Disbursed'
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-blue-600/20 text-blue-400'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {direction}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[#1e2536] bg-[#161b27]">
          <table className="w-full min-w-[600px]">
            <thead className="border-b border-[#1e2536] bg-[#0f1117]/50">
              <tr>
                {['Date', 'Ref', 'Party', 'Description', 'Method', 'Direction', 'Amount'].map((heading) => (
                  <th
                    key={heading}
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((payment) => (
                <tr
                  key={payment.id}
                  className="border-b border-[#1e2536] transition-colors last:border-0 hover:bg-white/[0.02]"
                >
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{payment.date}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs font-mono text-slate-400">{payment.ref}</td>
                  <td className="px-4 py-3 text-sm font-medium text-slate-200">{payment.party}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{payment.description}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full border px-2.5 py-1 text-xs ${METHOD_COLORS[payment.method]}`}>
                      {payment.method}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">{payment.direction}</td>
                  <td
                    className={`whitespace-nowrap px-4 py-3 text-sm font-semibold ${
                      payment.direction === 'Received' ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {fmtMoney(payment.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {isLoading ? (
            <div className="py-14 text-center">
              <Loader2 size={28} className="mx-auto mb-2 animate-spin text-slate-600" />
              <p className="text-sm text-slate-500">Loading payments…</p>
            </div>
          ) : null}
          {!isLoading && filtered.length === 0 ? (
            <div className="py-14 text-center text-sm text-slate-500">No payments match your filters</div>
          ) : null}
        </div>
      </div>

      <Drawer open={showDrawer} onOpenChange={setShowDrawer} direction="right">
        <DrawerOverlay className="bg-black/70 backdrop-blur-sm" />
        <DrawerContent className="flex flex-col h-full w-full max-w-xl sm:!max-w-xl overflow-y-auto border-l border-[#1e2536] bg-[#11131b] text-white shadow-2xl">
          <DrawerHeader className="border-b border-[#1e2536] px-6 py-5">
            <DrawerTitle className="text-xl font-semibold text-white">Record Payment</DrawerTitle>
            <p className="mt-1 text-sm text-slate-500">
              Only invoices with an outstanding balance are available for selection.
            </p>
          </DrawerHeader>

          <div className="space-y-6 p-6">
            <div className="rounded-2xl border border-[#1e2536] bg-[#161b27] p-4">
              <h3 className="text-sm font-semibold text-white">Choose Invoice</h3>
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-[#1e2536] bg-[#0f1117] px-3 py-2">
                <Search size={14} className="text-slate-500" />
                <input
                  value={invoiceSearch}
                  onChange={(event) => setInvoiceSearch(event.target.value)}
                  placeholder="Search invoice, guest, reservation, or order..."
                  className="flex-1 bg-transparent text-sm text-slate-200 outline-none placeholder:text-slate-600"
                />
              </div>
              <div className="mt-3 space-y-2">
                {invoicesLoading ? (
                  <div className="flex items-center gap-2 rounded-xl border border-[#1e2536] bg-[#0f1117] px-3 py-3 text-sm text-slate-500">
                    <Loader2 size={14} className="animate-spin" /> Loading invoices…
                  </div>
                ) : null}
                {!invoicesLoading && outstandingInvoices.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[#1e2536] px-3 py-4 text-sm text-slate-500">
                    No outstanding invoices found.
                  </div>
                ) : null}
                {!invoicesLoading &&
                  outstandingInvoices.map((invoice) => {
                    const selected = paymentForm.invoiceId === invoice.id;
                    return (
                      <button
                        key={invoice.id}
                        onClick={() =>
                          setPaymentForm((current) => ({
                            ...current,
                            invoiceId: invoice.id,
                            amount: String(invoice.balance),
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
                            <p className="text-sm font-medium text-slate-100">
                              {invoice.invoiceNo} · {invoice.counterpartyName || invoice.reservation?.reservationNo || invoice.posOrder?.orderNo || 'Invoice'}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {invoice.type} · Outstanding {fmtMoney(invoice.balance)}
                            </p>
                          </div>
                          <span className="text-xs font-semibold text-slate-300">
                            {fmtMoney(invoice.total)}
                          </span>
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
                  Amount
                </label>
                <input
                  type="number"
                  min="0"
                  value={paymentForm.amount}
                  onChange={(event) =>
                    setPaymentForm((current) => ({ ...current, amount: event.target.value }))
                  }
                  className={fieldClassName()}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
                  Method
                </label>
                <select
                  value={paymentForm.method}
                  onChange={(event) =>
                    setPaymentForm((current) => ({ ...current, method: event.target.value }))
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
                  value={paymentForm.reference}
                  onChange={(event) =>
                    setPaymentForm((current) => ({ ...current, reference: event.target.value }))
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
                  value={paymentForm.paidAt}
                  onChange={(event) =>
                    setPaymentForm((current) => ({ ...current, paidAt: event.target.value }))
                  }
                  className={fieldClassName()}
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
                  Note
                </label>
                <textarea
                  rows={3}
                  value={paymentForm.note}
                  onChange={(event) =>
                    setPaymentForm((current) => ({ ...current, note: event.target.value }))
                  }
                  className={fieldClassName()}
                />
              </div>
            </div>

            {selectedInvoice ? (
              <div className="rounded-2xl border border-[#1e2536] bg-[#161b27] p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Selected Invoice</span>
                  <span className="font-semibold text-white">{selectedInvoice.invoiceNo}</span>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <div className="rounded-xl bg-[#0f1117] px-3 py-3">
                    <p className="text-xs uppercase tracking-wider text-slate-500">Total</p>
                    <p className="mt-1 text-sm font-semibold text-slate-100">{fmtMoney(selectedInvoice.total)}</p>
                  </div>
                  <div className="rounded-xl bg-[#0f1117] px-3 py-3">
                    <p className="text-xs uppercase tracking-wider text-slate-500">Paid</p>
                    <p className="mt-1 text-sm font-semibold text-emerald-400">{fmtMoney(selectedInvoice.paidAmount)}</p>
                  </div>
                  <div className="rounded-xl bg-[#0f1117] px-3 py-3">
                    <p className="text-xs uppercase tracking-wider text-slate-500">Outstanding</p>
                    <p className="mt-1 text-sm font-semibold text-amber-300">{fmtMoney(selectedInvoice.balance)}</p>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="rounded-2xl border border-[#1e2536] bg-[#161b27] p-4">
              <button
                onClick={() => setShowAdvancedLedger((current) => !current)}
                className="text-sm font-semibold text-blue-400"
              >
                {showAdvancedLedger ? 'Hide' : 'Show'} Advanced Ledger Overrides
              </button>
              <p className="mt-1 text-xs text-slate-500">
                Keep defaults for standard cash, bank, or receivable settlement. Override only when accounting needs a different posting.
              </p>

              {showAdvancedLedger ? (
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
                      Debit Account
                    </label>
                    <select
                      value={paymentForm.debitAccountCode}
                      onChange={(event) =>
                        setPaymentForm((current) => ({
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
                      Credit Account
                    </label>
                    <select
                      value={paymentForm.creditAccountCode}
                      onChange={(event) =>
                        setPaymentForm((current) => ({
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
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-[#1e2536] pt-2">
              <button
                onClick={() => setShowDrawer(false)}
                className="rounded-lg border border-[#1e2536] px-4 py-2 text-sm text-slate-300 transition-colors hover:border-slate-500"
              >
                Cancel
              </button>
              <button
                onClick={handleRecordPayment}
                disabled={recordPayment.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-60"
              >
                {recordPayment.isPending ? <Loader2 size={15} className="animate-spin" /> : null}
                Record Payment
              </button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
