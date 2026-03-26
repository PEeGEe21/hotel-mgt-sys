'use client';

import { useState, useMemo } from 'react';
import { Search, Plus, Download, ChevronRight, Receipt, Loader2 } from 'lucide-react';
import { useFinanceInvoices, FinanceInvoice } from '@/hooks/useFinance';

type InvoiceStatus = 'Unpaid' | 'Partial' | 'Paid' | 'Overdue' | 'Refunded';

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

const ALL_STATUSES: InvoiceStatus[] = ['Unpaid', 'Partial', 'Paid', 'Overdue', 'Refunded'];

function StatusBadge({ status }: { status: InvoiceStatus }) {
  const s = STATUS_CONFIG[status];
  return (
    <span
      className={`text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1.5 w-fit border ${s.bg} ${s.color} ${s.border}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
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

function invoiceStatus(inv: FinanceInvoice): InvoiceStatus {
  if (inv.status === 'OVERDUE') return 'Overdue';
  if (inv.paymentStatus === 'PAID') return 'Paid';
  if (inv.paymentStatus === 'PARTIAL') return 'Partial';
  if (inv.paymentStatus === 'REFUNDED') return 'Refunded';
  return 'Unpaid';
}

function invoiceType(inv: FinanceInvoice) {
  if (inv.type === 'RESERVATION') return 'Reservation';
  if (inv.type === 'POS') return 'POS';
  if (inv.type === 'FACILITY') return 'Facility';
  return 'Manual';
}

function invoiceParty(inv: FinanceInvoice) {
  const guest = inv.reservation?.guest ?? inv.posOrder?.reservation?.guest;
  if (guest) return `${guest.firstName} ${guest.lastName}`;
  if (inv.posOrder?.roomNo) return `Room ${inv.posOrder.roomNo}`;
  if (inv.posOrder?.tableNo) return `Table ${inv.posOrder.tableNo}`;
  return 'Walk-in';
}

function invoiceDescription(inv: FinanceInvoice) {
  if (inv.reservation?.room?.number) return `Room ${inv.reservation.room.number} stay`;
  if (inv.reservation?.reservationNo) return `Reservation ${inv.reservation.reservationNo}`;
  if (inv.posOrder?.orderNo) return `POS ${inv.posOrder.orderNo}`;
  return 'Invoice';
}

export default function InvoicesPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'All'>('All');
  const [typeFilter, setTypeFilter] = useState<
    'All' | 'Reservation' | 'POS' | 'Facility' | 'Manual'
  >('All');

  const { data, isLoading } = useFinanceInvoices();
  const invoices = data?.invoices ?? [];

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
      normalized.filter((i) => {
        const ms = `${i.number} ${i.party} ${i.description}`
          .toLowerCase()
          .includes(search.toLowerCase());
        const mst = statusFilter === 'All' || i.status === statusFilter;
        const mt = typeFilter === 'All' || i.type === typeFilter;
        return ms && mst && mt;
      }),
    [normalized, search, statusFilter, typeFilter],
  );

  const totals = useMemo(
    () => ({
      total: normalized.reduce((s, i) => s + i.amount, 0),
      paid: normalized.filter((i) => i.status === 'Paid').reduce((s, i) => s + i.amount, 0),
      outstanding: normalized
        .filter((i) => i.status !== 'Paid' && i.status !== 'Refunded')
        .reduce((s, i) => s + (i.amount - i.paid), 0),
      overdue: normalized
        .filter((i) => i.status === 'Overdue')
        .reduce((s, i) => s + (i.amount - i.paid), 0),
    }),
    [normalized],
  );

  const rangeLabel = data?.range
    ? new Date(data.range.from).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    : '—';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Invoices</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {isLoading ? 'Loading invoices…' : `${normalized.length} invoices · ${rangeLabel}`}
          </p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 bg-[#161b27] border border-[#1e2536] hover:border-slate-500 text-slate-300 px-3 py-2 rounded-lg text-sm font-medium transition-all">
            <Download size={13} /> Export
          </button>
          <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
            <Plus size={15} /> New Invoice
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: 'Total Invoiced',
            value: `${fmtMoney(totals.total).toLocaleString()}`,
            color: 'text-slate-200',
          },
          {
            label: 'Collected',
            value: `${fmtMoney(totals.paid).toLocaleString()}`,
            color: 'text-emerald-400',
          },
          {
            label: 'Outstanding',
            value: `${fmtMoney(totals.outstanding).toLocaleString()}`,
            color: 'text-amber-400',
          },
          {
            label: 'Overdue',
            value: `${fmtMoney(totals.overdue).toLocaleString()}`,
            color: 'text-red-400',
          },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-[#161b27] border border-[#1e2536] rounded-xl px-4 py-4">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {(['All', ...ALL_STATUSES] as const).map((s) => {
          const active = statusFilter === s;
          const count =
            s === 'All' ? normalized.length : normalized.filter((i) => i.status === s).length;
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
                className={`px-1.5 py-0.5 rounded text-[10px] ${active ? 'bg-white/20' : 'bg-white/5'}`}
              >
                {count}
              </span>
            </button>
          );
        })}
        <div className="ml-auto flex gap-1 bg-[#161b27] border border-[#1e2536] rounded-lg p-1">
          {(['All', 'Reservation', 'POS', 'Facility', 'Manual'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${typeFilter === t ? 'bg-blue-600/20 text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 bg-[#161b27] border border-[#1e2536] rounded-lg px-3 py-2">
        <Search size={14} className="text-slate-500 shrink-0" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search invoice, guest, description..."
          className="bg-transparent text-sm text-slate-300 placeholder:text-slate-600 outline-none flex-1"
        />
      </div>

      <div className="bg-[#161b27] border border-[#1e2536] rounded-xl overflow-x-auto">
        <table className="w-full min-w-[700px]">
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
            {filtered.map((inv) => {
              const balance = inv.amount - inv.paid;
              return (
                <tr
                  key={inv.id}
                  className="border-b border-[#1e2536] last:border-0 hover:bg-white/[0.02] cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 text-xs font-mono text-slate-400 whitespace-nowrap">
                    {inv.number}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-md font-medium border ${inv.type === 'Reservation' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : inv.type === 'POS' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-violet-500/10 border-violet-500/20 text-violet-400'}`}
                    >
                      {inv.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-slate-200 whitespace-nowrap">
                    {inv.party}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 max-w-[160px] truncate">
                    {inv.description}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{inv.date}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{inv.due}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-slate-200 whitespace-nowrap">
                    {fmtMoney(inv.amount).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-emerald-400 whitespace-nowrap">
                    {fmtMoney(inv.paid).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {balance > 0 ? (
                      <span className="text-xs text-red-400">
                        {fmtMoney(balance).toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-xs text-emerald-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={inv.status} />
                  </td>
                  <td className="px-4 py-3">
                    <ChevronRight size={14} className="text-slate-600" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {isLoading && (
          <div className="py-14 text-center">
            <Loader2 size={28} className="text-slate-600 mx-auto mb-2 animate-spin" />
            <p className="text-slate-500 text-sm">Loading invoices…</p>
          </div>
        )}
        {!isLoading && filtered.length === 0 && (
          <div className="py-14 text-center">
            <Receipt size={28} className="text-slate-700 mx-auto mb-2" />
            <p className="text-slate-500 text-sm">No invoices match your filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
