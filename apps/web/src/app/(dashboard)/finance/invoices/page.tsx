'use client';

import { useState, useMemo } from 'react';
import { Search, Plus, Download, ChevronRight, Receipt, X, Check, Loader2 } from 'lucide-react';

type InvoiceStatus = 'Draft' | 'Sent' | 'Paid' | 'Overdue' | 'Cancelled';
type Invoice = {
  id: string;
  number: string;
  guest: string;
  type: 'Guest' | 'Vendor';
  date: string;
  due: string;
  amount: number;
  paid: number;
  status: InvoiceStatus;
  description: string;
};

const STATUS_CONFIG: Record<
  InvoiceStatus,
  { color: string; bg: string; border: string; dot: string }
> = {
  Draft: {
    color: 'text-slate-400',
    bg: 'bg-slate-500/15',
    border: 'border-slate-500/30',
    dot: 'bg-slate-400',
  },
  Sent: {
    color: 'text-blue-400',
    bg: 'bg-blue-500/15',
    border: 'border-blue-500/30',
    dot: 'bg-blue-400',
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
  Cancelled: {
    color: 'text-slate-500',
    bg: 'bg-slate-600/15',
    border: 'border-slate-600/30',
    dot: 'bg-slate-500',
  },
};

const invoices: Invoice[] = [
  {
    id: 'i1',
    number: 'INV-2026-0041',
    guest: 'Sofia Martins',
    type: 'Guest',
    date: '2026-03-10',
    due: '2026-03-14',
    amount: 3200,
    paid: 3200,
    status: 'Paid',
    description: 'Room 401 · 4 nights',
  },
  {
    id: 'i2',
    number: 'INV-2026-0042',
    guest: 'Fatima Al-Hassan',
    type: 'Guest',
    date: '2026-03-07',
    due: '2026-03-12',
    amount: 1900,
    paid: 1900,
    status: 'Paid',
    description: 'Room 303 · 5 nights',
  },
  {
    id: 'i3',
    number: 'INV-2026-0043',
    guest: 'David Mensah',
    type: 'Guest',
    date: '2026-03-10',
    due: '2026-03-14',
    amount: 600,
    paid: 300,
    status: 'Sent',
    description: 'Room 102 · 4 nights',
  },
  {
    id: 'i4',
    number: 'INV-2026-0044',
    guest: 'Marcus Johnson',
    type: 'Guest',
    date: '2026-03-08',
    due: '2026-03-12',
    amount: 1120,
    paid: 560,
    status: 'Overdue',
    description: 'Room 205 · 4 nights',
  },
  {
    id: 'i5',
    number: 'INV-2026-0045',
    guest: 'Chen Wei',
    type: 'Guest',
    date: '2026-03-13',
    due: '2026-03-17',
    amount: 1520,
    paid: 760,
    status: 'Sent',
    description: 'Room 302 · 4 nights',
  },
  {
    id: 'i6',
    number: 'INV-2026-0046',
    guest: 'Linen Supply Co.',
    type: 'Vendor',
    date: '2026-03-01',
    due: '2026-03-15',
    amount: 4200,
    paid: 4200,
    status: 'Paid',
    description: 'Monthly linen supply',
  },
  {
    id: 'i7',
    number: 'INV-2026-0047',
    guest: 'FoodServe Ltd.',
    type: 'Vendor',
    date: '2026-03-05',
    due: '2026-03-20',
    amount: 11800,
    paid: 0,
    status: 'Sent',
    description: 'F&B supplies March',
  },
  {
    id: 'i8',
    number: 'INV-2026-0048',
    guest: 'TechRepair NG',
    type: 'Vendor',
    date: '2026-03-02',
    due: '2026-03-09',
    amount: 750,
    paid: 0,
    status: 'Overdue',
    description: 'HVAC maintenance',
  },
  {
    id: 'i9',
    number: 'INV-2026-0049',
    guest: 'Ngozi Williams',
    type: 'Guest',
    date: '2026-03-11',
    due: '2026-03-18',
    amount: 1520,
    paid: 0,
    status: 'Draft',
    description: 'Room 403 · 4 nights',
  },
  {
    id: 'i10',
    number: 'INV-2026-0050',
    guest: 'Pedro Alvarez',
    type: 'Guest',
    date: '2026-03-10',
    due: '2026-03-22',
    amount: 1520,
    paid: 760,
    status: 'Sent',
    description: 'Room 301 · 4 nights',
  },
];

const ALL_STATUSES: InvoiceStatus[] = ['Draft', 'Sent', 'Paid', 'Overdue', 'Cancelled'];

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

export default function InvoicesPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'All'>('All');
  const [typeFilter, setTypeFilter] = useState<'All' | 'Guest' | 'Vendor'>('All');

  const filtered = useMemo(
    () =>
      invoices.filter((i) => {
        const ms = `${i.number} ${i.guest} ${i.description}`
          .toLowerCase()
          .includes(search.toLowerCase());
        const mst = statusFilter === 'All' || i.status === statusFilter;
        const mt = typeFilter === 'All' || i.type === typeFilter;
        return ms && mst && mt;
      }),
    [search, statusFilter, typeFilter],
  );

  const totals = useMemo(
    () => ({
      total: invoices.reduce((s, i) => s + i.amount, 0),
      paid: invoices.filter((i) => i.status === 'Paid').reduce((s, i) => s + i.amount, 0),
      outstanding: invoices
        .filter((i) => i.status !== 'Paid' && i.status !== 'Cancelled')
        .reduce((s, i) => s + (i.amount - i.paid), 0),
      overdue: invoices
        .filter((i) => i.status === 'Overdue')
        .reduce((s, i) => s + (i.amount - i.paid), 0),
    }),
    [],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Invoices</h1>
          <p className="text-slate-500 text-sm mt-0.5">{invoices.length} invoices · March 2026</p>
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
            value: `$${totals.total.toLocaleString()}`,
            color: 'text-slate-200',
          },
          {
            label: 'Collected',
            value: `$${totals.paid.toLocaleString()}`,
            color: 'text-emerald-400',
          },
          {
            label: 'Outstanding',
            value: `$${totals.outstanding.toLocaleString()}`,
            color: 'text-amber-400',
          },
          { label: 'Overdue', value: `$${totals.overdue.toLocaleString()}`, color: 'text-red-400' },
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
            s === 'All' ? invoices.length : invoices.filter((i) => i.status === s).length;
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
          {(['All', 'Guest', 'Vendor'] as const).map((t) => (
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
                      className={`text-xs px-2 py-0.5 rounded-md font-medium border ${inv.type === 'Guest' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-violet-500/10 border-violet-500/20 text-violet-400'}`}
                    >
                      {inv.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-slate-200 whitespace-nowrap">
                    {inv.guest}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 max-w-[160px] truncate">
                    {inv.description}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{inv.date}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{inv.due}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-slate-200 whitespace-nowrap">
                    ${inv.amount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-emerald-400 whitespace-nowrap">
                    ${inv.paid.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {balance > 0 ? (
                      <span className="text-xs text-red-400">${balance.toLocaleString()}</span>
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
        {filtered.length === 0 && (
          <div className="py-14 text-center">
            <Receipt size={28} className="text-slate-700 mx-auto mb-2" />
            <p className="text-slate-500 text-sm">No invoices match your filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
