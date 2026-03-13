'use client';

import { useRouter } from 'next/navigation';
import { Receipt, BookOpen, Landmark, CreditCard, TrendingUp, TrendingDown, DollarSign, ArrowUpRight } from 'lucide-react';

const stats = [
  { label: 'Revenue (Mar)',    value: '$142,840', change: '+12.4%', up: true },
  { label: 'Expenses (Mar)',   value: '$38,210',  change: '+3.1%',  up: false },
  { label: 'Net Profit',       value: '$104,630', change: '+18.2%', up: true },
  { label: 'Outstanding',      value: '$14,520',  change: '-8.0%',  up: true },
];

const quickLinks = [
  { label: 'Invoices',          sub: 'Guest & vendor invoices',    icon: Receipt,   color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20',     href: '/finance/invoices' },
  { label: 'Ledger',            sub: 'General journal entries',    icon: BookOpen,  color: 'text-emerald-400',bg: 'bg-emerald-500/10 border-emerald-500/20', href: '/finance/ledger' },
  { label: 'Chart of Accounts', sub: 'Account structure & codes',  icon: Landmark,  color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20',  href: '/finance/accounts' },
  { label: 'Payments',          sub: 'Receipts & disbursements',   icon: CreditCard,color: 'text-amber-400',  bg: 'bg-amber-500/10 border-amber-500/20',    href: '/finance/payments' },
];

export default function FinancePage() {
  const router = useRouter();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Finance</h1>
        <p className="text-slate-500 text-sm mt-0.5">March 2026 · Fiscal overview</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map(({ label, value, change, up }) => (
          <div key={label} className="bg-[#161b27] border border-[#1e2536] rounded-xl px-4 py-4">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{label}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className={`text-xs mt-1 flex items-center gap-1 ${up ? 'text-emerald-400' : 'text-red-400'}`}>
              {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}{change} vs last month
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {quickLinks.map(({ label, sub, icon: Icon, color, bg, href }) => (
          <button key={label} onClick={() => router.push(href)}
            className={`${bg} border rounded-xl p-5 text-left hover:brightness-110 transition-all group flex items-center gap-4`}>
            <div className={`w-11 h-11 rounded-xl ${bg} border flex items-center justify-center shrink-0`}>
              <Icon size={20} className={color} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-base font-bold ${color}`}>{label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{sub}</p>
            </div>
            <ArrowUpRight size={16} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
          </button>
        ))}
      </div>
    </div>
  );
}