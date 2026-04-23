'use client';

import { useRouter } from 'next/navigation';
import {
  Receipt,
  BookOpen,
  Landmark,
  CreditCard,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  Loader2,
} from 'lucide-react';
import { useFinanceOverview } from '@/hooks/finance/useFinance';

function formatRangeLabel(range?: { from: string; to: string }) {
  if (!range) return '—';
  const from = new Date(range.from);
  const to = new Date(range.to);
  const sameMonth = from.getMonth() === to.getMonth() && from.getFullYear() === to.getFullYear();
  if (sameMonth) {
    return from.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  }
  return `${from.toLocaleDateString()} – ${to.toLocaleDateString()}`;
}

function fmtMoney(n: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(n);
}

function formatChange(change: number | null) {
  if (change === null || Number.isNaN(change)) return { text: '—', up: true };
  const up = change >= 0;
  return { text: `${up ? '+' : ''}${change.toFixed(1)}%`, up };
}

const quickLinks = [
  {
    label: 'Invoices',
    sub: 'Guest & vendor invoices',
    icon: Receipt,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/20',
    href: '/finance/invoices',
  },
  {
    label: 'Ledger',
    sub: 'General journal entries',
    icon: BookOpen,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    href: '/finance/ledger',
  },
  {
    label: 'Chart of Accounts',
    sub: 'Account structure & codes',
    icon: Landmark,
    color: 'text-violet-400',
    bg: 'bg-violet-500/10 border-violet-500/20',
    href: '/finance/accounts',
  },
  {
    label: 'Payments',
    sub: 'Receipts & disbursements',
    icon: CreditCard,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/20',
    href: '/finance/payments',
  },
];

export default function FinancePage() {
  const router = useRouter();
  const { data, isLoading } = useFinanceOverview();

  const rangeLabel = formatRangeLabel(data?.range);
  const stats = [
    {
      label: `Revenue (${rangeLabel})`,
      value: data ? `${fmtMoney(Math.round(data.revenue)).toLocaleString()}` : '—',
      change: formatChange(data?.changes.revenue ?? null),
    },
    {
      label: `Expenses (${rangeLabel})`,
      value: data ? `${fmtMoney(Math.round(data.expenses)).toLocaleString()}` : '—',
      change: formatChange(data?.changes.expenses ?? null),
    },
    {
      label: 'Net Profit',
      value: data ? `${fmtMoney(Math.round(data.net)).toLocaleString()}` : '—',
      change: formatChange(data?.changes.net ?? null),
    },
    {
      label: 'Outstanding',
      value: data ? `${fmtMoney(Math.round(data.outstanding)).toLocaleString()}` : '—',
      change: formatChange(data?.changes.outstanding ?? null),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Finance</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          {isLoading ? 'Loading overview…' : `${rangeLabel} · Fiscal overview`}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map(({ label, value, change }) => (
          <div key={label} className="bg-[#161b27] border border-[#1e2536] rounded-xl px-4 py-4">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{label}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p
              className={`text-xs mt-1 flex items-center gap-1 ${change.up ? 'text-emerald-400' : 'text-red-400'}`}
            >
              {isLoading ? (
                <Loader2 size={11} className="animate-spin" />
              ) : change.up ? (
                <TrendingUp size={11} />
              ) : (
                <TrendingDown size={11} />
              )}
              {change.text} vs previous period
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {quickLinks.map(({ label, sub, icon: Icon, color, bg, href }) => (
          <button
            key={label}
            onClick={() => router.push(href)}
            className={`${bg} border rounded-xl p-5 text-left hover:brightness-110 transition-all group flex items-center gap-4`}
          >
            <div
              className={`w-11 h-11 rounded-xl ${bg} border flex items-center justify-center shrink-0`}
            >
              <Icon size={20} className={color} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-base font-bold ${color}`}>{label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{sub}</p>
            </div>
            <ArrowUpRight
              size={16}
              className="text-slate-600 group-hover:text-slate-400 transition-colors"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
