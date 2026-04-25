import { Download, Filter } from 'lucide-react';

export function ReportsHeader({
  dateRange,
  onDateRangeChange,
}: {
  dateRange: string;
  onDateRangeChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Reports</h1>
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
        <button className="flex items-center gap-2 rounded-lg border border-[#1e2536] bg-[#161b27] px-3 py-2 text-sm font-medium text-slate-300 transition-all hover:border-slate-500">
          <Download size={13} /> Full Report
        </button>
      </div>
    </div>
  );
}
