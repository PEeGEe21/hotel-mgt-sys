'use client';

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Table, Users } from 'lucide-react';
import { TabsContent } from '@/components/ui/tabs';
import { KPI, SectionCard, tooltipStyle } from './reports-shared';
import { formatMoney } from '@/utils/report-utils';

type SourceRow = { name: string; value: number; color: string };
type NationalityRow = { country: string; pct: number; color: string };
type ReservationStatusRow = { status: string; count: number; revenue: number; avg: string; pct: number };

export function GuestsTab({
  totalGuests,
  totalGuestsSub,
  vipGuests,
  vipGuestsSub,
  repeatGuests,
  repeatGuestsSub,
  avgStayNights,
  sourceData,
  nationalityMix,
  reservationStatusRows,
}: {
  totalGuests: string;
  totalGuestsSub: string;
  vipGuests: string;
  vipGuestsSub: string;
  repeatGuests: string;
  repeatGuestsSub: string;
  avgStayNights: string;
  sourceData: SourceRow[];
  nationalityMix: NationalityRow[];
  reservationStatusRows: ReservationStatusRow[];
}) {
  return (
    <TabsContent value="guests" className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KPI label="Total Guests" value={totalGuests} sub={totalGuestsSub} color="text-blue-400" />
        <KPI label="VIP Guests" value={vipGuests} sub={vipGuestsSub} color="text-amber-400" />
        <KPI label="Repeat Guests" value={repeatGuests} sub={repeatGuestsSub} color="text-emerald-400" />
        <KPI label="Avg Stay" value={avgStayNights} sub="nights" color="text-violet-400" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <SectionCard title="Booking Source Distribution" icon={Users} color="text-violet-400" exportTitle="guest-sources">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={sourceData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, value }) => `${name} ${value}%`} labelLine={false}>
                {sourceData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v}%`, '']} />
            </PieChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="Nationality Mix" icon={Users} color="text-sky-400" exportTitle="nationality">
          <div className="space-y-2.5 pt-2">
            {nationalityMix.map(({ country, pct, color }) => (
              <div key={country}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs text-slate-400">{country}</span>
                  <span className="text-xs font-bold" style={{ color }}>
                    {pct}%
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-[#0f1117]">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Reservation Status Summary" icon={Table} color="text-slate-400" exportTitle="reservations-summary">
        <table className="w-full text-sm">
          <thead className="border-b border-[#1e2536]">
            <tr>
              {['Status', 'Count', 'Revenue', 'Avg Stay', '% of Total'].map((header) => (
                <th key={header} className="px-2 py-2 text-left text-xs font-medium text-slate-500">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {reservationStatusRows.map((row) => (
              <tr key={row.status} className="border-b border-[#1e2536] last:border-0 hover:bg-white/[0.02]">
                <td className="px-2 py-2.5 font-medium text-slate-200">{row.status}</td>
                <td className="px-2 py-2.5 text-slate-400">{row.count}</td>
                <td className="px-2 py-2.5 text-slate-400">{row.revenue > 0 ? formatMoney(row.revenue) : '—'}</td>
                <td className="px-2 py-2.5 text-slate-400">{Number(row.avg) > 0 ? `${row.avg} nights` : '—'}</td>
                <td className="px-2 py-2.5 font-semibold text-blue-400">{row.pct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>
    </TabsContent>
  );
}
