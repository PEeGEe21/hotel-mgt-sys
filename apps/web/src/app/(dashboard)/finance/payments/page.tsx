'use client';

import { useState, useMemo } from 'react';
import { Search, Download, Plus, Loader2 } from 'lucide-react';
import { useFinancePayments, FinancePayment } from '@/hooks/useFinance';

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

function fmtMoney(n: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(n);
}

function paymentMethodLabel(p: FinancePayment): PaymentMethod {
  const raw = p.method?.toUpperCase();
  if (raw === 'CASH') return 'Cash';
  if (raw === 'CARD') return 'Card';
  if (raw === 'POS') return 'POS';
  if (raw === 'BANK_TRANSFER') return 'Transfer';
  if (raw === 'MOBILE_MONEY') return 'Mobile Money';
  if (raw === 'ROOM_CHARGE') return 'Room Charge';
  return 'Other';
}

function paymentDirection(p: FinancePayment): PaymentDir {
  const type = p.invoice?.type;
  return type === 'RESERVATION' || type === 'POS' ? 'Received' : 'Disbursed';
}

function paymentParty(p: FinancePayment) {
  const guest = p.invoice?.reservation?.guest ?? p.invoice?.posOrder?.reservation?.guest;
  if (guest) return `${guest.firstName} ${guest.lastName}`;
  if (p.invoice?.posOrder?.roomNo) return `Room ${p.invoice.posOrder.roomNo}`;
  if (p.invoice?.posOrder?.tableNo) return `Table ${p.invoice.posOrder.tableNo}`;
  return 'Walk-in';
}

function paymentDescription(p: FinancePayment) {
  if (p.invoice?.invoiceNo) return `Invoice ${p.invoice.invoiceNo}`;
  if (p.invoice?.posOrder?.orderNo) return `POS ${p.invoice.posOrder.orderNo}`;
  return 'Payment';
}

export default function PaymentsPage() {
  const [search, setSearch] = useState('');
  const [dirFilter, setDirFilter] = useState<PaymentDir | 'All'>('All');

  const { data, isLoading } = useFinancePayments();
  const payments = data?.payments ?? [];

  const normalized = useMemo(
    () =>
      payments.map((p) => ({
        id: p.id,
        date: new Date(p.paidAt).toISOString().slice(0, 10),
        ref: p.reference || p.invoice?.invoiceNo || '—',
        party: paymentParty(p),
        description: paymentDescription(p),
        method: paymentMethodLabel(p),
        direction: paymentDirection(p),
        amount: p.amount,
      })),
    [payments],
  );

  const filtered = useMemo(
    () =>
      normalized.filter((p) => {
        const ms = `${p.ref} ${p.party} ${p.description}`
          .toLowerCase()
          .includes(search.toLowerCase());
        const md = dirFilter === 'All' || p.direction === dirFilter;
        return ms && md;
      }),
    [normalized, search, dirFilter],
  );

  const totals = {
    received: normalized
      .filter((p) => p.direction === 'Received')
      .reduce((s, p) => s + p.amount, 0),
    disbursed: normalized
      .filter((p) => p.direction === 'Disbursed')
      .reduce((s, p) => s + p.amount, 0),
  };

  const rangeLabel = data?.range
    ? new Date(data.range.from).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    : '—';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Payments</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {isLoading ? 'Loading payments…' : `${normalized.length} transactions · ${rangeLabel}`}
          </p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 bg-[#161b27] border border-[#1e2536] hover:border-slate-500 text-slate-300 px-3 py-2 rounded-lg text-sm font-medium transition-all">
            <Download size={13} /> Export
          </button>
          <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
            <Plus size={15} /> Record Payment
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: 'Total Received',
            value: `${fmtMoney(totals.received).toLocaleString()}`,
            color: 'text-emerald-400',
          },
          {
            label: 'Total Disbursed',
            value: `${fmtMoney(totals.disbursed).toLocaleString()}`,
            color: 'text-red-400',
          },
          {
            label: 'Net Cash Flow',
            value: `${fmtMoney(totals.received - totals.disbursed).toLocaleString()}`,
            color: 'text-blue-400',
          },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-[#161b27] border border-[#1e2536] rounded-xl px-4 py-4">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 bg-[#161b27] border border-[#1e2536] rounded-lg px-3 py-2 flex-1 min-w-48">
          <Search size={14} className="text-slate-500 shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search payments..."
            className="bg-transparent text-sm text-slate-300 placeholder:text-slate-600 outline-none flex-1"
          />
        </div>
        <div className="flex bg-[#161b27] border border-[#1e2536] rounded-lg p-1 gap-0.5">
          {(['All', 'Received', 'Disbursed'] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDirFilter(d as any)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${dirFilter === d ? (d === 'Received' ? 'bg-emerald-500/20 text-emerald-400' : d === 'Disbursed' ? 'bg-red-500/20 text-red-400' : 'bg-blue-600/20 text-blue-400') : 'text-slate-500 hover:text-slate-300'}`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[#161b27] border border-[#1e2536] rounded-xl overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead className="border-b border-[#1e2536] bg-[#0f1117]/50">
            <tr>
              {['Date', 'Ref', 'Party', 'Description', 'Method', 'Direction', 'Amount'].map((h) => (
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
            {filtered.map((p) => (
              <tr
                key={p.id}
                className="border-b border-[#1e2536] last:border-0 hover:bg-white/[0.02] transition-colors"
              >
                <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{p.date}</td>
                <td className="px-4 py-3 text-xs font-mono text-slate-400">{p.ref}</td>
                <td className="px-4 py-3 text-sm font-medium text-slate-200 whitespace-nowrap">
                  {p.party}
                </td>
                <td className="px-4 py-3 text-xs text-slate-500 max-w-[180px] truncate">
                  {p.description}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-md font-medium border ${METHOD_COLORS[p.method]}`}
                  >
                    {p.method}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs font-semibold ${p.direction === 'Received' ? 'text-emerald-400' : 'text-red-400'}`}
                  >
                    {p.direction}
                  </span>
                </td>
                <td
                  className={`px-4 py-3 text-sm font-bold whitespace-nowrap ${p.direction === 'Received' ? 'text-emerald-400' : 'text-red-400'}`}
                >
                  {p.direction === 'Received' ? '+' : '-'} {fmtMoney(p.amount).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {isLoading && (
          <div className="py-14 text-center">
            <Loader2 size={28} className="text-slate-600 mx-auto mb-2 animate-spin" />
            <p className="text-slate-500 text-sm">Loading payments…</p>
          </div>
        )}
        {!isLoading && filtered.length === 0 && (
          <div className="py-14 text-center">
            <p className="text-slate-500 text-sm">No payments match your filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
