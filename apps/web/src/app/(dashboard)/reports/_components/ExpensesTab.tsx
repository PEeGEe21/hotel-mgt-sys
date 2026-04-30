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
import { Table, TrendingUp } from 'lucide-react';
import { TabsContent } from '@/components/ui/tabs';
import { KPI, SectionCard, tooltipStyle } from './reports-shared';
import { C } from '@/utils/report-utils';
import { formatCompactMoney, formatMoney } from '@/utils/report-utils';

type ExpenseRow = {
  month: string;
  payroll: number;
  supplies: number;
  utilities: number;
  maintenance: number;
  marketing: number;
  total: number;
};

export function ExpensesTab({
  cogsTotal,
  totalQuantity,
  costRatio,
  grossProfit,
  expenseData,
  dateRange,
}: {
  cogsTotal: number;
  totalQuantity: number;
  costRatio: number;
  grossProfit: number;
  expenseData: ExpenseRow[];
  dateRange: string;
}) {
  return (
    <TabsContent value="expenses" className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KPI
          label="Total COGS"
          value={formatMoney(cogsTotal)}
          sub={dateRange}
          color="text-red-400"
        />
        <KPI
          label="Stock Used"
          value={Math.round(totalQuantity).toLocaleString()}
          sub="Inventory units"
          color="text-amber-400"
        />
        <KPI
          label="Cost Ratio"
          value={`${costRatio.toFixed(1)}%`}
          sub="COGS/Revenue"
          color="text-violet-400"
        />
        <KPI
          label="Gross Profit"
          value={formatMoney(grossProfit)}
          sub="Revenue minus COGS"
          color="text-emerald-400"
        />
      </div>

      <SectionCard
        title="Expense Breakdown by Category"
        icon={TrendingUp}
        color="text-red-400"
        exportReport="expenses"
      >
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={expenseData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2536" />
            <XAxis dataKey="month" stroke="#475569" tick={{ fontSize: 11 }} />
            <YAxis
              stroke="#475569"
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => formatCompactMoney(v)}
            />
            <Tooltip {...tooltipStyle} formatter={(v: number) => [formatMoney(v), '']} />
            <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
            <Bar dataKey="payroll" stackId="a" fill={C.red} name="Payroll" />
            <Bar dataKey="supplies" stackId="a" fill={C.amber} name="Supplies" />
            <Bar dataKey="utilities" stackId="a" fill={C.violet} name="Utilities" />
            <Bar dataKey="maintenance" stackId="a" fill={C.sky} name="Maintenance" />
            <Bar
              dataKey="marketing"
              stackId="a"
              fill={C.emerald}
              name="Marketing"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </SectionCard>

      <SectionCard
        title="Expense Table"
        icon={Table}
        color="text-slate-400"
        exportReport="expenses"
      >
        <table className="w-full text-sm">
          <thead className="border-b border-[#1e2536]">
            <tr>
              {[
                'Month',
                'Payroll',
                'Supplies',
                'Utilities',
                'Maintenance',
                'Marketing',
                'Total',
              ].map((header) => (
                <th
                  key={header}
                  className="whitespace-nowrap px-2 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-500"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {expenseData.map((row) => (
              <tr
                key={row.month}
                className="border-b border-[#1e2536] last:border-0 hover:bg-white/[0.02]"
              >
                <td className="px-2 py-2.5 font-medium text-slate-200">{row.month}</td>
                <td className="px-2 py-2.5 text-slate-400">{formatMoney(row.payroll)}</td>
                <td className="px-2 py-2.5 text-slate-400">{formatMoney(row.supplies)}</td>
                <td className="px-2 py-2.5 text-slate-400">{formatMoney(row.utilities)}</td>
                <td className="px-2 py-2.5 text-slate-400">{formatMoney(row.maintenance)}</td>
                <td className="px-2 py-2.5 text-slate-400">{formatMoney(row.marketing)}</td>
                <td className="px-2 py-2.5 font-bold text-red-400">{formatMoney(row.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>
    </TabsContent>
  );
}
