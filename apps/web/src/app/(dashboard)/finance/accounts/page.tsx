'use client';

import { useState } from 'react';
import { Landmark, Plus, ChevronRight, Search } from 'lucide-react';

type AccountType = 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';
type Account = { code: string; name: string; type: AccountType; subtype: string; balance: number; active: boolean; description: string; };

const TYPE_CONFIG: Record<AccountType, { color: string; bg: string; border: string }> = {
  Asset:     { color: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20' },
  Liability: { color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20' },
  Equity:    { color: 'text-violet-400',  bg: 'bg-violet-500/10',  border: 'border-violet-500/20' },
  Revenue:   { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  Expense:   { color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20' },
};

const accounts: Account[] = [
  // Assets
  { code: '1001', name: 'Cash / Bank',              type: 'Asset',     subtype: 'Current',    balance: 98420,   active: true,  description: 'Main operating bank account' },
  { code: '1002', name: 'Petty Cash',               type: 'Asset',     subtype: 'Current',    balance: 1500,    active: true,  description: 'On-hand cash float' },
  { code: '1100', name: 'Accounts Receivable',      type: 'Asset',     subtype: 'Current',    balance: 14520,   active: true,  description: 'Amounts owed by guests and clients' },
  { code: '1200', name: 'Inventory — F&B',          type: 'Asset',     subtype: 'Current',    balance: 8200,    active: true,  description: 'Food and beverage stock' },
  { code: '1500', name: 'Property & Equipment',     type: 'Asset',     subtype: 'Fixed',      balance: 2100000, active: true,  description: 'Building, furniture, equipment' },
  // Liabilities
  { code: '2001', name: 'Accounts Payable',         type: 'Liability', subtype: 'Current',    balance: 16550,   active: true,  description: 'Amounts owed to suppliers' },
  { code: '2002', name: 'Guest Deposits',           type: 'Liability', subtype: 'Current',    balance: 5820,    active: true,  description: 'Advance payments from guests' },
  { code: '2100', name: 'VAT Payable',              type: 'Liability', subtype: 'Tax',        balance: 4210,    active: true,  description: '7.5% VAT collected' },
  // Equity
  { code: '3001', name: 'Owner Equity',             type: 'Equity',    subtype: 'Capital',    balance: 500000,  active: true,  description: 'Owner capital contribution' },
  { code: '3100', name: 'Retained Earnings',        type: 'Equity',    subtype: 'Retained',   balance: 284600,  active: true,  description: 'Accumulated profits' },
  // Revenue
  { code: '4001', name: 'Room Revenue',             type: 'Revenue',   subtype: 'Operating',  balance: 118400,  active: true,  description: 'Room rental income' },
  { code: '4002', name: 'F&B Revenue',              type: 'Revenue',   subtype: 'Operating',  balance: 18200,   active: true,  description: 'Restaurant and bar income' },
  { code: '4003', name: 'Event Revenue',            type: 'Revenue',   subtype: 'Operating',  balance: 6240,    active: true,  description: 'Conference and event bookings' },
  { code: '4100', name: 'Other Income',             type: 'Revenue',   subtype: 'Non-operating', balance: 0,    active: true,  description: 'Miscellaneous income' },
  // Expenses
  { code: '5101', name: 'Cost of F&B',             type: 'Expense',   subtype: 'COGS',       balance: 11800,   active: true,  description: 'Food and beverage purchases' },
  { code: '5201', name: 'Housekeeping Supplies',   type: 'Expense',   subtype: 'Operations', balance: 4200,    active: true,  description: 'Linens, cleaning supplies' },
  { code: '6001', name: 'Salaries & Wages',        type: 'Expense',   subtype: 'Payroll',    balance: 18500,   active: true,  description: 'Staff compensation' },
  { code: '6201', name: 'Utilities',               type: 'Expense',   subtype: 'Overhead',   balance: 2100,    active: true,  description: 'Electricity, water, gas' },
  { code: '6301', name: 'Repairs & Maintenance',   type: 'Expense',   subtype: 'Overhead',   balance: 750,     active: true,  description: 'Facility maintenance costs' },
  { code: '6401', name: 'Marketing & Advertising', type: 'Expense',   subtype: 'Overhead',   balance: 860,     active: false, description: 'Promotional activities' },
];

const ALL_TYPES: AccountType[] = ['Asset','Liability','Equity','Revenue','Expense'];

export default function ChartOfAccountsPage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<AccountType | 'All'>('All');

  const filtered = accounts.filter(a => {
    const ms = `${a.code} ${a.name} ${a.subtype}`.toLowerCase().includes(search.toLowerCase());
    const mt = typeFilter === 'All' || a.type === typeFilter;
    return ms && mt;
  });

  const grouped = ALL_TYPES.map(t => ({ type: t, items: filtered.filter(a => a.type === t) })).filter(g => g.items.length > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Chart of Accounts</h1>
          <p className="text-slate-500 text-sm mt-0.5">{accounts.length} accounts · Standard hotel COA structure</p>
        </div>
        <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"><Plus size={15} /> Add Account</button>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex items-center gap-2 bg-[#161b27] border border-[#1e2536] rounded-lg px-3 py-2 flex-1 min-w-48">
          <Search size={14} className="text-slate-500 shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search accounts..." className="bg-transparent text-sm text-slate-300 placeholder:text-slate-600 outline-none flex-1" />
        </div>
        {(['All', ...ALL_TYPES] as const).map(t => {
          const active = typeFilter === t;
          const cfg = t !== 'All' ? TYPE_CONFIG[t] : null;
          return (
            <button key={t} onClick={() => setTypeFilter(t as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${active ? (cfg ? `${cfg.bg} ${cfg.border} ${cfg.color}` : 'bg-blue-600/20 border-blue-500/30 text-blue-400') : 'bg-[#161b27] border-[#1e2536] text-slate-400 hover:text-slate-200'}`}>{t}</button>
          );
        })}
      </div>

      <div className="space-y-4">
        {grouped.map(({ type, items }) => {
          const cfg = TYPE_CONFIG[type];
          const total = items.filter(a => a.active).reduce((s, a) => s + a.balance, 0);
          return (
            <div key={type} className="bg-[#161b27] border border-[#1e2536] rounded-xl overflow-hidden">
              <div className={`flex items-center justify-between px-5 py-3 border-b border-[#1e2536] ${cfg.bg}`}>
                <div className="flex items-center gap-2">
                  <Landmark size={14} className={cfg.color} />
                  <span className={`text-sm font-bold ${cfg.color}`}>{type}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.border} ${cfg.color}`}>{items.length}</span>
                </div>
                <span className={`text-sm font-bold ${cfg.color}`}>${total.toLocaleString()}</span>
              </div>
              <table className="w-full">
                <tbody>
                  {items.map(a => (
                    <tr key={a.code} className="border-b border-[#1e2536] last:border-0 hover:bg-white/[0.02] cursor-pointer transition-colors">
                      <td className="px-4 py-3 text-xs font-mono text-slate-600 w-16">{a.code}</td>
                      <td className="px-4 py-3">
                        <p className={`text-sm font-medium ${a.active ? 'text-slate-200' : 'text-slate-600 line-through'}`}>{a.name}</p>
                        <p className="text-xs text-slate-600">{a.description}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{a.subtype}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-300 text-right whitespace-nowrap">${a.balance.toLocaleString()}</td>
                      <td className="px-4 py-3 w-8"><ChevronRight size={14} className="text-slate-700" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </div>
  );
}