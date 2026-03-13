'use client';

import { useState, useMemo } from 'react';
import { Search, Download, CreditCard, Plus } from 'lucide-react';

type PaymentMethod = 'Cash' | 'Card' | 'Transfer' | 'POS';
type PaymentDir = 'Received' | 'Disbursed';
type Payment = { id: string; date: string; ref: string; party: string; description: string; method: PaymentMethod; direction: PaymentDir; amount: number; };

const payments: Payment[] = [
  { id: 'p1',  date: '2026-03-12', ref: 'INV-0041', party: 'Sofia Martins',    description: 'Room 401 payment',        method: 'Card',     direction: 'Received',  amount: 3200 },
  { id: 'p2',  date: '2026-03-12', ref: 'INV-0042', party: 'Fatima Al-Hassan', description: 'Room 303 payment',        method: 'Transfer', direction: 'Received',  amount: 1900 },
  { id: 'p3',  date: '2026-03-11', ref: 'PAY-018',  party: 'Staff Payroll',    description: 'March payroll batch',     method: 'Transfer', direction: 'Disbursed', amount: 18500 },
  { id: 'p4',  date: '2026-03-10', ref: 'EXP-088',  party: 'Linen Supply Co.', description: 'Linen supply invoice',    method: 'Transfer', direction: 'Disbursed', amount: 4200 },
  { id: 'p5',  date: '2026-03-09', ref: 'POS-201',  party: 'Bar Revenue',      description: 'Daily POS settlement',    method: 'POS',      direction: 'Received',  amount: 3840 },
  { id: 'p6',  date: '2026-03-08', ref: 'EXP-081',  party: 'AEDC',             description: 'Electricity bill',        method: 'Transfer', direction: 'Disbursed', amount: 2100 },
  { id: 'p7',  date: '2026-03-07', ref: 'RES-001',  party: 'David Mensah',     description: 'Reservation deposit',     method: 'Cash',     direction: 'Received',  amount: 300 },
  { id: 'p8',  date: '2026-03-06', ref: 'POS-198',  party: 'Bar Revenue',      description: 'Daily POS settlement',    method: 'POS',      direction: 'Received',  amount: 2910 },
  { id: 'p9',  date: '2026-03-05', ref: 'EXP-071',  party: 'TechRepair NG',    description: 'HVAC maintenance',        method: 'Transfer', direction: 'Disbursed', amount: 750 },
  { id: 'p10', date: '2026-03-04', ref: 'RES-006',  party: 'Sofia Martins',    description: 'Prepayment — Rm 401',     method: 'Card',     direction: 'Received',  amount: 3200 },
];

const METHOD_COLORS: Record<PaymentMethod, string> = {
  Cash:     'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  Card:     'text-blue-400 bg-blue-500/10 border-blue-500/20',
  Transfer: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  POS:      'text-amber-400 bg-amber-500/10 border-amber-500/20',
};

export default function PaymentsPage() {
  const [search, setSearch] = useState('');
  const [dirFilter, setDirFilter] = useState<PaymentDir | 'All'>('All');

  const filtered = useMemo(() => payments.filter(p => {
    const ms = `${p.ref} ${p.party} ${p.description}`.toLowerCase().includes(search.toLowerCase());
    const md = dirFilter === 'All' || p.direction === dirFilter;
    return ms && md;
  }), [search, dirFilter]);

  const totals = {
    received:  payments.filter(p => p.direction === 'Received').reduce((s, p) => s + p.amount, 0),
    disbursed: payments.filter(p => p.direction === 'Disbursed').reduce((s, p) => s + p.amount, 0),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Payments</h1>
          <p className="text-slate-500 text-sm mt-0.5">{payments.length} transactions · March 2026</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 bg-[#161b27] border border-[#1e2536] hover:border-slate-500 text-slate-300 px-3 py-2 rounded-lg text-sm font-medium transition-all"><Download size={13} /> Export</button>
          <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"><Plus size={15} /> Record Payment</button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Received',  value: `$${totals.received.toLocaleString()}`,  color: 'text-emerald-400' },
          { label: 'Total Disbursed', value: `$${totals.disbursed.toLocaleString()}`, color: 'text-red-400' },
          { label: 'Net Cash Flow',   value: `$${(totals.received - totals.disbursed).toLocaleString()}`, color: 'text-blue-400' },
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
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search payments..."
            className="bg-transparent text-sm text-slate-300 placeholder:text-slate-600 outline-none flex-1" />
        </div>
        <div className="flex bg-[#161b27] border border-[#1e2536] rounded-lg p-1 gap-0.5">
          {(['All','Received','Disbursed'] as const).map(d => (
            <button key={d} onClick={() => setDirFilter(d as any)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${dirFilter === d ? (d === 'Received' ? 'bg-emerald-500/20 text-emerald-400' : d === 'Disbursed' ? 'bg-red-500/20 text-red-400' : 'bg-blue-600/20 text-blue-400') : 'text-slate-500 hover:text-slate-300'}`}>{d}</button>
          ))}
        </div>
      </div>

      <div className="bg-[#161b27] border border-[#1e2536] rounded-xl overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead className="border-b border-[#1e2536] bg-[#0f1117]/50">
            <tr>
              {['Date','Ref','Party','Description','Method','Direction','Amount'].map(h => (
                <th key={h} className="text-xs text-slate-500 uppercase tracking-wider font-medium px-4 py-3 text-left whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id} className="border-b border-[#1e2536] last:border-0 hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{p.date}</td>
                <td className="px-4 py-3 text-xs font-mono text-slate-400">{p.ref}</td>
                <td className="px-4 py-3 text-sm font-medium text-slate-200 whitespace-nowrap">{p.party}</td>
                <td className="px-4 py-3 text-xs text-slate-500 max-w-[180px] truncate">{p.description}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-md font-medium border ${METHOD_COLORS[p.method]}`}>{p.method}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-semibold ${p.direction === 'Received' ? 'text-emerald-400' : 'text-red-400'}`}>{p.direction}</span>
                </td>
                <td className={`px-4 py-3 text-sm font-bold whitespace-nowrap ${p.direction === 'Received' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {p.direction === 'Received' ? '+' : '-'}${p.amount.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}