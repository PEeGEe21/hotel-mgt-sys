'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { DollarSign, Table } from 'lucide-react';
import { TabsContent } from '@/components/ui/tabs';
import { KPI, SectionCard, tooltipStyle } from './reports-shared';
import { formatCompactMoney, formatMoney, pct } from '@/utils/report-utils';
import { C } from '@/utils/report-utils';

export function RevenueTab({
  roomRevenue,
  fnbRevenue,
  eventRevenue,
  revenueTotal,
  outstanding,
  revenueData,
}: {
  roomRevenue: number;
  fnbRevenue: number;
  eventRevenue: number;
  revenueTotal: number;
  outstanding: number;
  revenueData: { month: string; rooms: number; fnb: number; events: number; total: number; momChange: number | null }[];
}) {
  return (
    <TabsContent value="revenue" className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KPI
          label="Room Revenue"
          value={formatMoney(roomRevenue)}
          sub={pct(roomRevenue, revenueTotal)}
          color="text-blue-400"
        />
        <KPI
          label="F&B Revenue"
          value={formatMoney(fnbRevenue)}
          sub={pct(fnbRevenue, revenueTotal)}
          color="text-emerald-400"
        />
        <KPI
          label="Event Revenue"
          value={formatMoney(eventRevenue)}
          sub={pct(eventRevenue, revenueTotal)}
          color="text-violet-400"
        />
        <KPI
          label="Outstanding"
          value={formatMoney(outstanding)}
          sub="Invoice balance"
          color="text-amber-400"
        />
      </div>

      <SectionCard
        title="Revenue Breakdown by Stream"
        icon={DollarSign}
        color="text-emerald-400"
        exportReport="revenue"
      >
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={revenueData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2536" />
            <XAxis dataKey="month" stroke="#475569" tick={{ fontSize: 11 }} />
            <YAxis
              stroke="#475569"
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => formatCompactMoney(v)}
            />
            <Tooltip {...tooltipStyle} formatter={(v: number) => [formatMoney(v), '']} />
            <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
            <Bar dataKey="rooms" stackId="a" fill={C.blue} name="Rooms" radius={[0, 0, 0, 0]} />
            <Bar dataKey="fnb" stackId="a" fill={C.emerald} name="F&B" />
            <Bar dataKey="events" stackId="a" fill={C.violet} name="Events" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </SectionCard>

      <SectionCard
        title="Revenue Table"
        icon={Table}
        color="text-slate-400"
        exportReport="revenue"
      >
        <table className="w-full text-sm">
          <thead className="border-b border-[#1e2536]">
            <tr>
              {['Month', 'Room Revenue', 'F&B Revenue', 'Events', 'Total', 'MoM Change'].map(
                (header) => (
                  <th
                    key={header}
                    className="whitespace-nowrap px-2 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-500"
                  >
                    {header}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {revenueData.map((row) => {
              return (
                <tr
                  key={row.month}
                  className="border-b border-[#1e2536] last:border-0 hover:bg-white/[0.02]"
                >
                  <td className="px-2 py-2.5 text-sm font-medium text-slate-200">{row.month}</td>
                  <td className="px-2 py-2.5 text-sm text-slate-400">{formatMoney(row.rooms)}</td>
                  <td className="px-2 py-2.5 text-sm text-slate-400">{formatMoney(row.fnb)}</td>
                  <td className="px-2 py-2.5 text-sm text-slate-400">{formatMoney(row.events)}</td>
                  <td className="px-2 py-2.5 text-sm font-bold text-white">{formatMoney(row.total)}</td>
                  <td className="px-2 py-2.5 text-xs font-semibold">
                    {row.momChange === null ? (
                      <span className="text-slate-600">—</span>
                    ) : (
                      <span className={row.momChange >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                        {row.momChange >= 0 ? '+' : ''}
                        {row.momChange.toFixed(1)}%
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </SectionCard>
    </TabsContent>
  );
}
