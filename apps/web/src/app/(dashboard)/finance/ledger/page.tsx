'use client';

import { useState, useMemo } from 'react';
import { Search, Download, BookOpen, Plus } from 'lucide-react';

type EntryType = 'Debit' | 'Credit';
type JournalEntry = {
  id: string; date: string; ref: string; description: string;
  account: string; accountCode: string; type: EntryType; amount: number; balance: number;
};

const entries: JournalEntry[] = [
  { id: 'je1',  date: '2026-03-12', ref: 'INV-0041', description: 'Room revenue — Sofia Martins',       account: 'Room Revenue',          accountCode: '4001', type: 'Credit', amount: 3200,  balance: 142840 },
  { id: 'je2',  date: '2026-03-12', ref: 'INV-0041', description: 'Guest payment received',             account: 'Cash / Bank',           accountCode: '1001', type: 'Debit',  amount: 3200,  balance: 98420 },
  { id: 'je3',  date: '2026-03-11', ref: 'EXP-0092', description: 'F&B supplies — FoodServe Ltd.',      account: 'Cost of F&B',           accountCode: '5101', type: 'Debit',  amount: 11800, balance: 95220 },
  { id: 'je4',  date: '2026-03-11', ref: 'EXP-0092', description: 'F&B payable to FoodServe',           account: 'Accounts Payable',      accountCode: '2001', type: 'Credit', amount: 11800, balance: 107020 },
  { id: 'je5',  date: '2026-03-11', ref: 'PAY-0018', description: 'Staff payroll disbursement',         account: 'Salaries Expense',      accountCode: '6001', type: 'Debit',  amount: 18500, balance: 88520 },
  { id: 'je6',  date: '2026-03-11', ref: 'PAY-0018', description: 'Payroll bank transfer',              account: 'Cash / Bank',           accountCode: '1001', type: 'Credit', amount: 18500, balance: 107020 },
  { id: 'je7',  date: '2026-03-10', ref: 'INV-0042', description: 'Room revenue — Fatima Al-Hassan',    account: 'Room Revenue',          accountCode: '4001', type: 'Credit', amount: 1900,  balance: 125640 },
  { id: 'je8',  date: '2026-03-10', ref: 'INV-0042', description: 'Guest payment received',             account: 'Cash / Bank',           accountCode: '1001', type: 'Debit',  amount: 1900,  balance: 125640 },
  { id: 'je9',  date: '2026-03-10', ref: 'EXP-0088', description: 'Linen supply — Linen Supply Co.',    account: 'Housekeeping Supplies', accountCode: '5201', type: 'Debit',  amount: 4200,  balance: 121440 },
  { id: 'je10', date: '2026-03-10', ref: 'EXP-0088', description: 'Linen payment made',                 account: 'Cash / Bank',           accountCode: '1001', type: 'Credit', amount: 4200,  balance: 121440 },
  { id: 'je11', date: '2026-03-09', ref: 'POS-0201', description: 'Bar revenue — POS',                  account: 'F&B Revenue',           accountCode: '4002', type: 'Credit', amount: 3840,  balance: 119540 },
  { id: 'je12', date: '2026-03-09', ref: 'POS-0201', description: 'Bar cash receipt',                   account: 'Cash / Bank',           accountCode: '1001', type: 'Debit',  amount: 3840,  balance: 115700 },
  { id: 'je13', date: '2026-03-08', ref: 'EXP-0081', description: 'Electricity bill — AEDC',            account: 'Utilities Expense',     accountCode: '6201', type: 'Debit',  amount: 2100,  balance: 113600 },
  { id: 'je14', date: '2026-03-08', ref: 'EXP-0081', description: 'Utility payment',                    account: 'Cash / Bank',           accountCode: '1001', type: 'Credit', amount: 2100,  balance: 115700 },
];

export default function LedgerPage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<EntryType | 'All'>('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const filtered = useMemo(() => entries.filter(e => {
    const ms = `${e.ref} ${e.description} ${e.account} ${e.accountCode}`.toLowerCase().includes(search.toLowerCase());
    const mt = typeFilter === 'All' || e.type === typeFilter;
    const mdf = !dateFrom || e.date >= dateFrom;
    const mdt = !dateTo   || e.date <= dateTo;
    return ms && mt && mdf && mdt;
  }), [search, typeFilter, dateFrom, dateTo]);

  const totalDebits  = filtered.filter(e => e.type === 'Debit').reduce((s, e)  => s + e.amount, 0);
  const totalCredits = filtered.filter(e => e.type === 'Credit').reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">General Ledger</h1>
          <p className="text-slate-500 text-sm mt-0.5">{entries.length} journal entries · March 2026</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 bg-[#161b27] border border-[#1e2536] hover:border-slate-500 text-slate-300 px-3 py-2 rounded-lg text-sm font-medium transition-all"><Download size={13} /> Export</button>
          <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"><Plus size={15} /> New Entry</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { label: 'Total Debits',  value: `$${totalDebits.toLocaleString()}`,  color: 'text-red-400' },
          { label: 'Total Credits', value: `$${totalCredits.toLocaleString()}`, color: 'text-emerald-400' },
          { label: 'Net',           value: `$${Math.abs(totalCredits - totalDebits).toLocaleString()}`, color: totalCredits >= totalDebits ? 'text-emerald-400' : 'text-red-400' },
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
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search entries..." className="bg-transparent text-sm text-slate-300 placeholder:text-slate-600 outline-none flex-1" />
        </div>
        <div className="flex bg-[#161b27] border border-[#1e2536] rounded-lg p-1 gap-0.5">
          {(['All','Debit','Credit'] as const).map(t => (
            <button key={t} onClick={() => setTypeFilter(t as any)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${typeFilter === t ? (t === 'Debit' ? 'bg-red-500/20 text-red-400' : t === 'Credit' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-600/20 text-blue-400') : 'text-slate-500 hover:text-slate-300'}`}>{t}</button>
          ))}
        </div>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="bg-[#161b27] border border-[#1e2536] rounded-lg px-3 py-2 text-sm text-slate-400 outline-none" placeholder="From" />
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="bg-[#161b27] border border-[#1e2536] rounded-lg px-3 py-2 text-sm text-slate-400 outline-none" placeholder="To" />
      </div>

      <div className="bg-[#161b27] border border-[#1e2536] rounded-xl overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead className="border-b border-[#1e2536] bg-[#0f1117]/50">
            <tr>
              {['Date','Ref','Description','Account','Code','Type','Amount','Balance'].map(h => (
                <th key={h} className="text-xs text-slate-500 uppercase tracking-wider font-medium px-4 py-3 text-left whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(e => (
              <tr key={e.id} className="border-b border-[#1e2536] last:border-0 hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{e.date}</td>
                <td className="px-4 py-3 text-xs font-mono text-slate-400 whitespace-nowrap">{e.ref}</td>
                <td className="px-4 py-3 text-sm text-slate-300 max-w-[200px] truncate">{e.description}</td>
                <td className="px-4 py-3 text-sm text-slate-400 whitespace-nowrap">{e.account}</td>
                <td className="px-4 py-3 text-xs font-mono text-slate-600">{e.accountCode}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${e.type === 'Debit' ? 'text-red-400 bg-red-500/10' : 'text-emerald-400 bg-emerald-500/10'}`}>{e.type}</span>
                </td>
                <td className={`px-4 py-3 text-sm font-semibold whitespace-nowrap ${e.type === 'Debit' ? 'text-red-300' : 'text-emerald-300'}`}>${e.amount.toLocaleString()}</td>
                <td className="px-4 py-3 text-sm text-slate-400 font-mono whitespace-nowrap">${e.balance.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-14 text-center"><BookOpen size={28} className="text-slate-700 mx-auto mb-2" /><p className="text-slate-500 text-sm">No entries found</p></div>
        )}
      </div>
    </div>
  );
}