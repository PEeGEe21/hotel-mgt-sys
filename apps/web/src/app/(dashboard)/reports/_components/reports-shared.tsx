'use client';

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { BarChart3, BedDouble, Clock, DollarSign, Package, TrendingUp, Users, FileText, Table } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { useReportExport } from '@/hooks/finance/useReportExport';

export const tooltipStyle = {
  contentStyle: { background: '#161b27', border: '1px solid #1e2536', borderRadius: 8, fontSize: 12 },
  labelStyle: { color: '#94a3b8' },
  itemStyle: { color: '#e2e8f0' },
};

export type Tab = 'overview' | 'revenue' | 'occupancy' | 'expenses' | 'guests' | 'staff' | 'inventory';
export type ExportFormat = 'excel' | 'pdf';
type ExportScope = 'tab' | 'full';
type ReportRange = { from?: string; to?: string };

export const TABS: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'revenue', label: 'Revenue', icon: DollarSign },
  { id: 'occupancy', label: 'Occupancy', icon: BedDouble },
  { id: 'expenses', label: 'Expenses', icon: TrendingUp },
  { id: 'guests', label: 'Guests', icon: Users },
  { id: 'staff', label: 'Staff', icon: Clock },
  { id: 'inventory', label: 'Inventory', icon: Package },
];

const ReportsExportContext = createContext<{
  range: ReportRange;
  downloadExport: (params: { scope: ExportScope; format: ExportFormat; report?: Tab }) => Promise<void>;
  downloadingKey: string | null;
  exportStatus: {
    state: 'idle' | 'loading' | 'success';
    message: string | null;
  };
} | null>(null);

export function ReportsExportProvider({
  range,
  children,
}: {
  range: ReportRange;
  children: ReactNode;
}) {
  const exportMutation = useReportExport(range);
  const [exportStatus, setExportStatus] = useState<{
    state: 'idle' | 'loading' | 'success';
    message: string | null;
  }>({
    state: 'idle',
    message: null,
  });
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pendingScope, pendingReport, pendingFormat] = exportMutation.variables
    ? [exportMutation.variables.scope, exportMutation.variables.report ?? 'full', exportMutation.variables.format]
    : [null, null, null];
  const downloadingKey =
    exportMutation.isPending && pendingScope && pendingReport && pendingFormat
      ? `${pendingScope}:${pendingReport}:${pendingFormat}`
      : null;

  useEffect(() => {
    if (exportMutation.isPending) {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      setExportStatus({
        state: 'loading',
        message: 'Preparing export download...',
      });
      return;
    }

    if (exportMutation.isSuccess) {
      setExportStatus({
        state: 'success',
        message: 'Export download ready.',
      });
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      resetTimerRef.current = setTimeout(() => {
        setExportStatus({ state: 'idle', message: null });
      }, 3000);
    }
  }, [exportMutation.isPending, exportMutation.isSuccess]);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);

  const value = {
    range,
    downloadingKey,
    exportStatus,
    downloadExport: async (params: { scope: ExportScope; format: ExportFormat; report?: Tab }) => {
      await exportMutation.mutateAsync(params);
    },
  };

  return <ReportsExportContext.Provider value={value}>{children}</ReportsExportContext.Provider>;
}

export function useReportsExport() {
  const context = useContext(ReportsExportContext);
  if (!context) {
    throw new Error('useReportsExport must be used within ReportsExportProvider');
  }
  return context;
}

function ExportBar({ exportReport }: { exportReport: Tab }) {
  const { can } = usePermissions();
  const { downloadExport, downloadingKey } = useReportsExport();

  if (!can('export:reports')) return null;

  return (
    <div className="ml-auto flex items-center gap-2">
      <button
        onClick={() => void downloadExport({ scope: 'tab', report: exportReport, format: 'excel' })}
        disabled={downloadingKey !== null}
        className="flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/15 px-3 py-1.5 text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Table size={12} /> Excel
      </button>
      <button
        onClick={() => void downloadExport({ scope: 'tab', report: exportReport, format: 'pdf' })}
        disabled={downloadingKey !== null}
        className="flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/15 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-60"
      >
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
  exportReport,
}: {
  title: string;
  icon: LucideIcon;
  color: string;
  children: ReactNode;
  exportReport?: Tab;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#1e2536] bg-[#161b27]">
      <div className="flex items-center gap-2 border-b border-[#1e2536] bg-gradient-to-r from-transparent px-5 py-3.5">
        <Icon size={15} className={color} />
        <h2 className="text-sm font-bold text-white">{title}</h2>
        {/* Card-level export is hidden for now because exports currently operate at tab/full-report scope. */}
        {/* {exportReport ? <ExportBar exportReport={exportReport} /> : null} */}
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
