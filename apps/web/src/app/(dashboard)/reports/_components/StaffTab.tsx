'use client';

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Clock, Users } from 'lucide-react';
import { TabsContent } from '@/components/ui/tabs';
import { KPI, SectionCard, tooltipStyle } from './reports-shared';
import { C } from '@/utils/report-utils';

export function StaffTab({
  totalStaff,
  attendanceRate,
  avgHoursWorked,
  lateArrivals,
  attendanceWeek,
  departmentRows,
}: {
  totalStaff: string;
  attendanceRate: string;
  avgHoursWorked: string;
  lateArrivals: string;
  attendanceWeek: { day: string; present: number; late: number; absent: number }[];
  departmentRows: { dept: string; count: number; present: number; rate: number; hours: string }[];
}) {
  return (
    <TabsContent value="staff" className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KPI label="Total Staff" value={totalStaff} sub="Active headcount" color="text-blue-400" />
        <KPI label="Attendance Rate" value={attendanceRate} sub="Selected range" color="text-emerald-400" />
        <KPI label="Avg Hours/Day" value={avgHoursWorked} sub="Across selected range" color="text-violet-400" />
        <KPI label="Late Arrivals" value={lateArrivals} sub="Selected range" color="text-amber-400" />
      </div>

      <SectionCard title="Attendance Trend" icon={Clock} color="text-blue-400" exportReport="staff">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={attendanceWeek}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2536" />
            <XAxis dataKey="day" stroke="#475569" tick={{ fontSize: 11 }} />
            <YAxis stroke="#475569" tick={{ fontSize: 11 }} />
            <Tooltip {...tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
            <Bar dataKey="present" stackId="a" fill={C.emerald} name="Present" />
            <Bar dataKey="late" stackId="a" fill={C.amber} name="Late" />
            <Bar dataKey="absent" stackId="a" fill={C.red} name="Absent" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </SectionCard>

      <SectionCard title="Staff by Department" icon={Users} color="text-slate-400" exportReport="staff">
        <table className="w-full text-sm">
          <thead className="border-b border-[#1e2536]">
            <tr>
              {['Department', 'Headcount', 'Present Days', 'Attendance %', 'Avg Hours'].map((header) => (
                <th key={header} className="whitespace-nowrap px-2 py-2 text-left text-xs font-medium text-slate-500">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {departmentRows.map((row) => (
              <tr key={row.dept} className="border-b border-[#1e2536] last:border-0 hover:bg-white/[0.02]">
                <td className="px-2 py-2.5 font-medium text-slate-200">{row.dept}</td>
                <td className="px-2 py-2.5 text-slate-400">{row.count}</td>
                <td className="px-2 py-2.5 text-slate-400">{row.present}</td>
                <td className="px-2 py-2.5">
                  <span className={`text-xs font-bold ${row.rate >= 90 ? 'text-emerald-400' : row.rate >= 80 ? 'text-amber-400' : 'text-red-400'}`}>
                    {row.rate}%
                  </span>
                </td>
                <td className="px-2 py-2.5 text-slate-400">{row.hours}h</td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>
    </TabsContent>
  );
}
