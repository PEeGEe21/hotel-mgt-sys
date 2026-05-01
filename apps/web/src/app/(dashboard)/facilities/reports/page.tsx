'use client';

import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ClipboardList,
  FileBarChart,
  Receipt,
  TrendingUp,
  Wrench,
} from 'lucide-react';
import { useFacilityReports } from '@/hooks/facility/useFacilityReports';
import TableScroll from '@/components/ui/table-scroll';

const cardIcons = {
  facilities: FileBarChart,
  complaints: AlertTriangle,
  inspections: ClipboardList,
  maintenance: Wrench,
  requisitions: Receipt,
  spend: TrendingUp,
} as const;

const healthStyle: Record<string, string> = {
  Good: 'bg-emerald-500/15 text-emerald-400',
  Fair: 'bg-amber-500/15 text-amber-400',
  Poor: 'bg-red-500/15 text-red-400',
  Maintenance: 'bg-orange-500/15 text-orange-400',
  'Not Inspected': 'bg-slate-500/15 text-slate-400',
};

export default function FacilityReportsPage() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const filters = useMemo(
    () => ({
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    }),
    [dateFrom, dateTo],
  );

  const { data, isLoading, isFetching, isError, error, refetch } = useFacilityReports(filters);

  const groupedSections = [
    { title: 'By Type', rows: data?.grouped.type ?? [] },
    { title: 'By Location', rows: data?.grouped.location ?? [] },
    { title: 'By Department', rows: data?.grouped.department ?? [] },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Facility Reports</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Overview of facility health and activity
          {dateFrom || dateTo ? ` · ${dateFrom || 'Start'} to ${dateTo || 'Today'}` : ''}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 bg-[#161b27] border border-[#1e2536] rounded-xl p-4">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider">Date Range</p>
          <p className="text-sm text-slate-300 mt-1">Filter all report cards and tables</p>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2 text-sm text-slate-200"
          />
          <span className="text-slate-500 text-xs">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2 text-sm text-slate-200"
          />
          {isFetching ? <span className="text-xs text-slate-500">Refreshing…</span> : null}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="animate-pulse rounded-xl border border-[#1e2536] bg-[#161b27] p-5"
            >
              <div className="mb-4 h-4 w-24 rounded bg-[#1e2536]" />
              <div className="h-8 w-20 rounded bg-[#1e2536]" />
              <div className="mt-3 h-3 w-full rounded bg-[#1e2536]" />
            </div>
          ))}
        </div>
      ) : null}

      {isError ? (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-5">
          <p className="text-sm font-semibold text-rose-300">Failed to load facility reports</p>
          <p className="mt-1 text-sm text-rose-200/80">
            {error instanceof Error ? error.message : 'Try again in a moment.'}
          </p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-4 rounded-lg border border-rose-400/20 bg-[#161b27] px-4 py-2 text-sm font-medium text-rose-100"
          >
            Retry
          </button>
        </div>
      ) : null}

      {!isLoading && !isError ? (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {data?.summaryCards.map(({ label, value, sub, color, bg, icon }) => {
              const Icon = cardIcons[icon];
              return (
                <div key={label} className={`${bg} border rounded-xl p-5`}>
                  <div className="flex items-center gap-3 mb-3">
                    <Icon size={16} className={color} />
                    <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">
                      {label}
                    </span>
                  </div>
                  <p className={`text-3xl font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-slate-500 mt-1.5">{sub}</p>
                </div>
              );
            })}
          </div>

          <div className="bg-[#161b27] border border-[#1e2536] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#1e2536]">
              <h2 className="text-sm font-semibold text-white">Facility Health Overview</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Inspection scores and activity summary per facility
              </p>
              <p className="text-[11px] text-amber-400 mt-2">
                Health score methodology: TBD (configurable weighting across inspections, complaint
                SLA, and open critical issues).
              </p>
            </div>
            <TableScroll>
            <table className="w-full">
              <thead className="border-b border-[#1e2536] bg-[#0f1117]/50">
                <tr>
                  {['Facility', 'Complaints', 'Inspections', 'Maintenance', 'Inspection Score', 'Health'].map((heading) => (
                    <th
                      key={heading}
                      className="text-xs text-slate-500 uppercase tracking-wider font-medium px-4 py-3 text-left whitespace-nowrap"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data?.facilityHealth.map((facility) => (
                  <tr
                    key={facility.name}
                    className="border-b border-[#1e2536] last:border-0 hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-slate-200 whitespace-nowrap">
                      {facility.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-400 text-center">{facility.complaints}</td>
                    <td className="px-4 py-3 text-sm text-slate-400 text-center">{facility.inspections}</td>
                    <td className="px-4 py-3 text-sm text-slate-400 text-center">{facility.maintenance}</td>
                    <td className="px-4 py-3">
                      {facility.score > 0 ? (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-[#0f1117] rounded-full overflow-hidden max-w-[80px]">
                            <div
                              className={`h-full rounded-full ${
                                facility.score >= 80
                                  ? 'bg-emerald-500'
                                  : facility.score >= 60
                                    ? 'bg-amber-500'
                                    : 'bg-red-500'
                              }`}
                              style={{ width: `${facility.score}%` }}
                            />
                          </div>
                          <span
                            className={`text-sm font-bold ${
                              facility.score >= 80
                                ? 'text-emerald-400'
                                : facility.score >= 60
                                  ? 'text-amber-400'
                                  : 'text-red-400'
                            }`}
                          >
                            {facility.score}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-600">Not inspected</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                          healthStyle[facility.health] ?? 'bg-slate-500/15 text-slate-400'
                        }`}
                      >
                        {facility.health}
                      </span>
                    </td>
                  </tr>
                ))}
                {!data?.facilityHealth.length ? (
                  <tr>
                    <td className="px-4 py-4 text-xs text-slate-500" colSpan={6}>
                      No facility report data found
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
            </TableScroll>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {groupedSections.map(({ title, rows }) => (
              <div key={title} className="bg-[#161b27] border border-[#1e2536] rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-[#1e2536]">
                  <h2 className="text-sm font-semibold text-white">{title}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Facility distribution</p>
                </div>
                <TableScroll>
                <table className="w-full">
                  <thead className="border-b border-[#1e2536] bg-[#0f1117]/50">
                    <tr>
                      {['Group', 'Count'].map((heading) => (
                        <th
                          key={heading}
                          className="text-xs text-slate-500 uppercase tracking-wider font-medium px-4 py-3 text-left whitespace-nowrap"
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {!rows.length ? (
                      <tr>
                        <td className="px-4 py-4 text-xs text-slate-500" colSpan={2}>
                          No data
                        </td>
                      </tr>
                    ) : null}
                    {rows.map(([group, count]) => (
                      <tr key={group} className="border-b border-[#1e2536] last:border-0">
                        <td className="px-4 py-3 text-sm text-slate-300">{group}</td>
                        <td className="px-4 py-3 text-sm text-slate-200 font-semibold">{count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </TableScroll>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
