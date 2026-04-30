import { Download, Filter, LoaderCircle } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { useReportsExport, type Tab } from './reports-shared';

export function ReportsHeader({
  activeTab,
  dateRange,
  onDateRangeChange,
}: {
  activeTab: Tab;
  dateRange: string;
  onDateRangeChange: (value: string) => void;
}) {
  const { can } = usePermissions();
  const { downloadExport, downloadingKey, exportStatus } = useReportsExport();

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-white">Reports</h1>
          {exportStatus.state !== 'idle' ? (
            <div
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${
                exportStatus.state === 'loading'
                  ? 'border-blue-500/30 bg-blue-500/10 text-blue-200'
                  : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
              }`}
            >
              {exportStatus.state === 'loading' ? (
                <LoaderCircle size={12} className="animate-spin" />
              ) : (
                <span className="h-2 w-2 rounded-full bg-emerald-300" />
              )}
              {exportStatus.message}
            </div>
          ) : null}
        </div>
        <p className="mt-0.5 text-sm text-slate-500">Analytics across all hotel operations</p>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 rounded-lg border border-[#1e2536] bg-[#161b27] px-3 py-2">
          <Filter size={13} className="text-slate-500" />
          <select
            value={dateRange}
            onChange={(e) => onDateRangeChange(e.target.value)}
            className="bg-[#0f1117] text-sm text-slate-300 outline-none selection:bg-transparent"
          >
            {['Last 7 Days', 'Last 30 Days', 'Last 6 Months', 'This Year'].map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </div>
        {can('export:reports') ? (
          <div className="flex items-center gap-2 rounded-lg border border-[#1e2536] bg-[#161b27] px-3 py-2">
            <Download size={13} className="text-slate-500" />
            <select
              defaultValue=""
              onChange={(e) => {
                const value = e.target.value;
                if (!value) return;
                const [scope, format] = value.split(':') as ['full' | 'tab', 'excel' | 'pdf'];
                void downloadExport({
                  scope,
                  format,
                  report: scope === 'tab' ? activeTab : undefined,
                });
                e.target.value = '';
              }}
              disabled={downloadingKey !== null}
              className="bg-[#0f1117] text-sm text-slate-300 outline-none selection:bg-transparent disabled:cursor-not-allowed"
            >
              <option value="">Export Reports</option>
              <option value="full:excel">Download Full Report (Excel)</option>
              <option value="full:pdf">Download Full Report (PDF)</option>
              <option value="tab:excel">{`Download Current Tab (${activeTab}) - Excel`}</option>
              <option value="tab:pdf">{`Download Current Tab (${activeTab}) - PDF`}</option>
            </select>
          </div>
        ) : null}
      </div>
    </div>
  );
}
