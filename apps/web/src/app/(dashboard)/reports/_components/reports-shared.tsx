'use client';

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { BarChart3, BedDouble, Clock, DollarSign, Package, TrendingUp, Users, FileText, Table } from 'lucide-react';

export const tooltipStyle = {
  contentStyle: { background: '#161b27', border: '1px solid #1e2536', borderRadius: 8, fontSize: 12 },
  labelStyle: { color: '#94a3b8' },
  itemStyle: { color: '#e2e8f0' },
};

export type Tab = 'overview' | 'revenue' | 'occupancy' | 'expenses' | 'guests' | 'staff' | 'inventory';

export const TABS: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'revenue', label: 'Revenue', icon: DollarSign },
  { id: 'occupancy', label: 'Occupancy', icon: BedDouble },
  { id: 'expenses', label: 'Expenses', icon: TrendingUp },
  { id: 'guests', label: 'Guests', icon: Users },
  { id: 'staff', label: 'Staff', icon: Clock },
  { id: 'inventory', label: 'Inventory', icon: Package },
];

function ExportBar() {
  return (
    <div className="ml-auto flex items-center gap-2">
      <button className="flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/15 px-3 py-1.5 text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-500/25">
        <Table size={12} /> Excel
      </button>
      <button className="flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/15 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/25">
        <FileText size={12} /> PDF
      </button>
    </div>
  );
}

export function SectionCard({
  title,
  icon: Icon,
  color,
  children,
  exportTitle,
}: {
  title: string;
  icon: LucideIcon;
  color: string;
  children: ReactNode;
  exportTitle?: string;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#1e2536] bg-[#161b27]">
      <div className="flex items-center gap-2 border-b border-[#1e2536] bg-gradient-to-r from-transparent px-5 py-3.5">
        <Icon size={15} className={color} />
        <h2 className="text-sm font-bold text-white">{title}</h2>
        {exportTitle ? <ExportBar /> : null}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export function KPI({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-[#1e2536] bg-[#161b27] px-4 py-4">
      <p className="mb-1 text-xs uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-slate-600">{sub}</p> : null}
    </div>
  );
}
