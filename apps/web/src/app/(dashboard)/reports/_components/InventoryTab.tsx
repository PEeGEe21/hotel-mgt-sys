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
import { Package, Table } from 'lucide-react';
import { TabsContent } from '@/components/ui/tabs';
import { KPI, SectionCard, tooltipStyle } from './reports-shared';
import { formatMoney } from '@/utils/report-utils';
import { C } from '@/utils/report-utils';

type InventoryAlertRow = {
  item: string;
  current: number;
  par: number;
  unit: string;
  category: string;
};

export function InventoryTab({
  totalItems,
  lowStockCount,
  inventoryValue,
  turnoverRate,
  inventoryAlertRows,
}: {
  totalItems: string;
  lowStockCount: string;
  inventoryValue: number;
  turnoverRate: string;
  inventoryAlertRows: InventoryAlertRow[];
}) {
  return (
    <TabsContent value="inventory" className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KPI label="Total Items" value={totalItems} sub="Tracked items" color="text-blue-400" />
        <KPI label="Low Stock" value={lowStockCount} sub="Below par level" color="text-red-400" />
        <KPI
          label="Inventory Value"
          value={formatMoney(inventoryValue)}
          sub="F&B stock value"
          color="text-emerald-400"
        />
        <KPI
          label="Turnover Rate"
          value={turnoverRate}
          sub="POS stock movements"
          color="text-violet-400"
        />
      </div>

      <SectionCard
        title="Stock Levels vs Par — Critical Items"
        icon={Package}
        color="text-red-400"
        exportTitle="low-stock"
      >
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={inventoryAlertRows} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2536" horizontal={false} />
            <XAxis type="number" stroke="#475569" tick={{ fontSize: 11 }} />
            <YAxis
              type="category"
              dataKey="item"
              stroke="#475569"
              tick={{ fontSize: 10 }}
              width={140}
            />
            <Tooltip {...tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
            <Bar
              dataKey="par"
              fill={C.slate}
              name="Par Level"
              radius={[0, 4, 4, 0]}
              opacity={0.4}
            />
            <Bar dataKey="current" fill={C.red} name="Current Stock" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </SectionCard>

      <SectionCard
        title="Low Stock Alert List"
        icon={Table}
        color="text-slate-400"
        exportTitle="inventory-alerts"
      >
        <table className="w-full text-sm">
          <thead className="border-b border-[#1e2536]">
            <tr>
              {['Item', 'Category', 'Current', 'Par Level', 'Unit', 'Status'].map((header) => (
                <th key={header} className="px-2 py-2 text-left text-xs font-medium text-slate-500">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {inventoryAlertRows.map((row) => {
              const stockPct = Math.round((row.current / row.par) * 100);
              return (
                <tr
                  key={row.item}
                  className="border-b border-[#1e2536] last:border-0 hover:bg-white/[0.02]"
                >
                  <td className="px-2 py-2.5 font-medium text-slate-200">{row.item}</td>
                  <td className="px-2 py-2.5 text-xs text-slate-500">{row.category}</td>
                  <td className="px-2 py-2.5 font-bold text-red-400">{row.current}</td>
                  <td className="px-2 py-2.5 text-slate-400">{row.par}</td>
                  <td className="px-2 py-2.5 text-xs text-slate-500">{row.unit}</td>
                  <td className="px-2 py-2.5">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-bold ${stockPct <= 25 ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/15 text-amber-400'}`}
                    >
                      {stockPct}% of par
                    </span>
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
