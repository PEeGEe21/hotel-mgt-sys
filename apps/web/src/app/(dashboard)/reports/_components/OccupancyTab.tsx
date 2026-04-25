'use client';

import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BedDouble, DollarSign } from 'lucide-react';
import { TabsContent } from '@/components/ui/tabs';
import { KPI, SectionCard, tooltipStyle } from './reports-shared';
import { C, formatMoney } from '@/utils/report-utils';

export function OccupancyTab({
  occupancyRate,
  occupiedRoomsText,
  checkedIn,
  adr,
  revPar,
  occupancyData,
  roomTypeRevenue,
}: {
  occupancyRate: number;
  occupiedRoomsText: string;
  checkedIn: number;
  adr: number;
  revPar: number;
  occupancyData: { month: string; occupancy: number; adr: number; revpar: number }[];
  roomTypeRevenue: { type: string; revenue: number; nights: number; adr: number }[];
}) {
  return (
    <TabsContent value="occupancy" className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KPI label="Avg Occupancy" value={`${occupancyRate || 78}%`} sub={occupiedRoomsText} color="text-blue-400" />
        <KPI label="Checked In" value={`${checkedIn}`} sub="Current in-house stays" color="text-emerald-400" />
        <KPI label="Avg ADR" value={adr ? formatMoney(adr) : formatMoney(302)} sub="From active reservations" color="text-violet-400" />
        <KPI label="Avg RevPAR" value={revPar ? formatMoney(revPar) : formatMoney(237)} sub="ADR x occupancy" color="text-amber-400" />
      </div>

      <SectionCard title="Occupancy Rate Trend" icon={BedDouble} color="text-blue-400" exportTitle="occupancy-trend">
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={occupancyData}>
            <defs>
              <linearGradient id="gOcc" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={C.blue} stopOpacity={0.3} />
                <stop offset="95%" stopColor={C.blue} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2536" />
            <XAxis dataKey="month" stroke="#475569" tick={{ fontSize: 11 }} />
            <YAxis stroke="#475569" tick={{ fontSize: 11 }} unit="%" domain={[60, 100]} />
            <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v}%`, '']} />
            <Area type="monotone" dataKey="occupancy" stroke={C.blue} fill="url(#gOcc)" strokeWidth={2} name="Occupancy %" />
          </AreaChart>
        </ResponsiveContainer>
      </SectionCard>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <SectionCard title="ADR Trend" icon={DollarSign} color="text-violet-400" exportTitle="adr-trend">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={occupancyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2536" />
              <XAxis dataKey="month" stroke="#475569" tick={{ fontSize: 11 }} />
              <YAxis stroke="#475569" tick={{ fontSize: 11 }} tickFormatter={(v) => formatMoney(v)} />
              <Tooltip {...tooltipStyle} formatter={(v: number) => [formatMoney(v), '']} />
              <Line type="monotone" dataKey="adr" stroke={C.violet} strokeWidth={2} dot={{ fill: C.violet, r: 3 }} name="ADR (NGN)" />
            </LineChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="Room Type Performance" icon={BedDouble} color="text-sky-400" exportTitle="room-type-perf">
          <table className="w-full text-sm">
            <thead className="border-b border-[#1e2536]">
              <tr>
                {['Type', 'Nights', 'Revenue', 'ADR'].map((header) => (
                  <th key={header} className="px-2 py-2 text-left text-xs font-medium text-slate-500">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {roomTypeRevenue.map((row) => (
                <tr key={row.type} className="border-b border-[#1e2536] last:border-0 hover:bg-white/[0.02]">
                  <td className="px-2 py-2.5 text-sm font-medium text-slate-200">{row.type}</td>
                  <td className="px-2 py-2.5 text-sm text-slate-400">{row.nights}</td>
                  <td className="px-2 py-2.5 text-sm text-slate-400">{formatMoney(row.revenue)}</td>
                  <td className="px-2 py-2.5 text-sm font-bold text-blue-400">{formatMoney(row.adr)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>
      </div>
    </TabsContent>
  );
}
