'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BedDouble, DollarSign, Users } from 'lucide-react';
import { TabsContent } from '@/components/ui/tabs';
import { KPI, SectionCard, tooltipStyle } from './reports-shared';
import { formatCompactMoney, formatMoney } from '@/utils/report-utils';
import { C } from '@/utils/report-utils';

export function OverviewTab({
  revenueTotal,
  revenueIsFetching,
  dateRange,
  occupancyRate,
  occupancySubtext,
  adrValue,
  outstandingFolios,
  outstandingCount,
  revenueData,
  occupancyData,
  guestSourceData,
  roomTypeRevenue,
}: {
  revenueTotal: number;
  revenueIsFetching: boolean;
  dateRange: string;
  occupancyRate: number;
  occupancySubtext: string;
  adrValue: number;
  outstandingFolios: number;
  outstandingCount: number;
  revenueData: { month: string; rooms: number; fnb: number; events: number; total: number }[];
  occupancyData: { month: string; occupancy: number; adr: number; revpar: number }[];
  guestSourceData: { name: string; value: number; color: string }[];
  roomTypeRevenue: { type: string; revenue: number; nights: number; adr: number }[];
}) {
  return (
    <TabsContent value="overview" className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KPI
          label="Revenue"
          value={formatMoney(revenueTotal)}
          sub={revenueIsFetching ? 'Refreshing live data' : dateRange}
          color="text-emerald-400"
        />
        <KPI
          label="Occupancy"
          value={`${occupancyRate || 81}%`}
          sub={occupancySubtext}
          color="text-blue-400"
        />
        <KPI
          label="ADR"
          value={adrValue ? formatMoney(adrValue) : formatMoney(312)}
          sub="Avg daily rate"
          color="text-violet-400"
        />
        <KPI
          label="Outstanding Folios"
          value={formatMoney(outstandingFolios)}
          sub={`${outstandingCount} open balances`}
          color="text-amber-400"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <SectionCard
          title="Monthly Revenue"
          icon={DollarSign}
          color="text-emerald-400"
          exportReport="overview"
        >
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="gRooms" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C.blue} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={C.blue} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2536" />
              <XAxis dataKey="month" stroke="#475569" tick={{ fontSize: 11 }} />
              <YAxis
                stroke="#475569"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => formatCompactMoney(v)}
              />
              <Tooltip
                {...tooltipStyle}
                formatter={(v: number) => [formatMoney(v), '']}
              />
              <Area
                type="monotone"
                dataKey="total"
                stroke={C.blue}
                fill="url(#gRooms)"
                strokeWidth={2}
                name="Total Revenue"
              />
            </AreaChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard
          title="Occupancy vs ADR"
          icon={BedDouble}
          color="text-blue-400"
          exportReport="overview"
        >
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={occupancyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2536" />
              <XAxis dataKey="month" stroke="#475569" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" stroke="#475569" tick={{ fontSize: 11 }} unit="%" />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#475569"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => formatMoney(v)}
              />
              <Tooltip
                {...tooltipStyle}
                formatter={(value: number, name: string) =>
                  name === 'ADR (NGN)' ? [formatMoney(value), name] : [`${value}%`, name]
                }
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="occupancy"
                stroke={C.blue}
                strokeWidth={2}
                dot={{ fill: C.blue, r: 3 }}
                name="Occupancy %"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="adr"
                stroke={C.violet}
                strokeWidth={2}
                dot={{ fill: C.violet, r: 3 }}
                name="ADR (NGN)"
              />
            </LineChart>
          </ResponsiveContainer>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <SectionCard
          title="Guest Source Mix"
          icon={Users}
          color="text-violet-400"
          exportReport="overview"
        >
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={guestSourceData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                dataKey="value"
                paddingAngle={3}
              >
                {guestSourceData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v}%`, '']} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 grid grid-cols-2 gap-1">
            {guestSourceData.map(({ name, value, color }) => (
              <div key={name} className="flex items-center gap-1.5 text-xs text-slate-400">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
                {name}{' '}
                <span className="font-bold" style={{ color }}>
                  {value}%
                </span>
              </div>
            ))}
          </div>
        </SectionCard>

        <div className="lg:col-span-2">
          <SectionCard
            title="Revenue by Room Type"
            icon={BedDouble}
            color="text-sky-400"
            exportReport="overview"
          >
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={roomTypeRevenue} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2536" horizontal={false} />
                <XAxis
                  type="number"
                  stroke="#475569"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => formatCompactMoney(v)}
                />
                <YAxis
                  type="category"
                  dataKey="type"
                  stroke="#475569"
                  tick={{ fontSize: 11 }}
                  width={80}
                />
                <Tooltip
                  {...tooltipStyle}
                  formatter={(v: number) => [formatMoney(v), '']}
                />
                <Bar dataKey="revenue" fill={C.blue} radius={[0, 4, 4, 0]} name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          </SectionCard>
        </div>
      </div>
    </TabsContent>
  );
}
