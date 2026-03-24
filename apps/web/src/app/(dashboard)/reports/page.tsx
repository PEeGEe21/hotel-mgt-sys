'use client';

import { useState } from 'react';
import {
  BarChart3, TrendingUp, BedDouble, Users, DollarSign,
  Package, Clock, Download, FileText, Table,
  ChevronDown, Filter
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';

// ─── Shared colours ────────────────────────────────────────────────────────────
const C = {
  blue:    '#3b82f6',
  violet:  '#8b5cf6',
  emerald: '#10b981',
  amber:   '#f59e0b',
  red:     '#ef4444',
  sky:     '#0ea5e9',
  slate:   '#64748b',
};

// ─── Seed data ────────────────────────────────────────────────────────────────
const months = ['Oct','Nov','Dec','Jan','Feb','Mar'];

const revenueData = [
  { month: 'Oct', rooms: 98200,  fnb: 14200, events: 4100,  total: 116500 },
  { month: 'Nov', rooms: 104800, fnb: 16800, events: 5200,  total: 126800 },
  { month: 'Dec', rooms: 138400, fnb: 22100, events: 9800,  total: 170300 },
  { month: 'Jan', rooms: 112000, fnb: 17400, events: 3600,  total: 133000 },
  { month: 'Feb', rooms: 106200, fnb: 15800, events: 4400,  total: 126400 },
  { month: 'Mar', rooms: 118400, fnb: 18200, events: 6240,  total: 142840 },
];

const occupancyData = [
  { month: 'Oct', occupancy: 72, adr: 285, revpar: 205 },
  { month: 'Nov', occupancy: 78, adr: 290, revpar: 226 },
  { month: 'Dec', occupancy: 91, adr: 348, revpar: 317 },
  { month: 'Jan', occupancy: 75, adr: 294, revpar: 220 },
  { month: 'Feb', occupancy: 71, adr: 282, revpar: 200 },
  { month: 'Mar', occupancy: 81, adr: 312, revpar: 253 },
];

const expenseData = [
  { month: 'Oct', payroll: 17200, supplies: 4100, utilities: 1900, maintenance: 680, marketing: 820 },
  { month: 'Nov', payroll: 17800, supplies: 4400, utilities: 2000, maintenance: 420, marketing: 760 },
  { month: 'Dec', payroll: 19200, supplies: 5800, utilities: 2400, maintenance: 1100, marketing: 940 },
  { month: 'Jan', payroll: 18100, supplies: 4200, utilities: 2200, maintenance: 340, marketing: 780 },
  { month: 'Feb', payroll: 17900, supplies: 4000, utilities: 1800, maintenance: 290, marketing: 720 },
  { month: 'Mar', payroll: 18500, supplies: 4950, utilities: 2100, maintenance: 750, marketing: 860 },
];

const guestSourceData = [
  { name: 'Direct',       value: 38, color: C.blue },
  { name: 'Booking.com',  value: 28, color: C.sky },
  { name: 'Expedia',      value: 18, color: C.violet },
  { name: 'Walk-in',      value: 10, color: C.emerald },
  { name: 'Other',        value: 6,  color: C.slate },
];

const roomTypeRevenue = [
  { type: 'Standard',     revenue: 12800, nights: 68, adr: 188 },
  { type: 'Deluxe',       revenue: 29040, nights: 96, adr: 302 },
  { type: 'Suite',        revenue: 47880, nights: 84, adr: 570 },
  { type: 'Presidential', revenue: 19200, nights: 16, adr: 1200 },
  { type: 'Family',       revenue: 9480,  nights: 24, adr: 395 },
];

const attendanceWeek = [
  { day: 'Mon', present: 18, late: 2, absent: 1 },
  { day: 'Tue', present: 20, late: 1, absent: 0 },
  { day: 'Wed', present: 17, late: 3, absent: 1 },
  { day: 'Thu', present: 19, late: 2, absent: 0 },
  { day: 'Fri', present: 21, late: 0, absent: 0 },
  { day: 'Sat', present: 16, late: 1, absent: 2 },
  { day: 'Sun', present: 14, late: 0, absent: 4 },
];

const inventoryAlerts = [
  { item: 'Whisky (Jameson)',   current: 8,  par: 24, unit: 'btl',  category: 'Bar' },
  { item: 'Toilet Paper Rolls', current: 42, par: 200, unit: 'rolls', category: 'Housekeeping' },
  { item: 'Red Wine (House)',   current: 6,  par: 36, unit: 'btl',  category: 'Bar' },
  { item: 'Shower Gel 250ml',   current: 18, par: 120, unit: 'pcs',  category: 'Housekeeping' },
  { item: 'Laundry Detergent',  current: 3,  par: 20, unit: 'kg',   category: 'Housekeeping' },
];

// ─── Tooltip styling ──────────────────────────────────────────────────────────
const tooltipStyle = {
  contentStyle: { background: '#161b27', border: '1px solid #1e2536', borderRadius: 8, fontSize: 12 },
  labelStyle:   { color: '#94a3b8' },
  itemStyle:    { color: '#e2e8f0' },
};

// ─── Export buttons ────────────────────────────────────────────────────────────
function ExportBar({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2 ml-auto">
      <button className="flex items-center gap-1.5 text-xs bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-lg font-medium transition-colors">
        <Table size={12} /> Excel
      </button>
      <button className="flex items-center gap-1.5 text-xs bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/20 px-3 py-1.5 rounded-lg font-medium transition-colors">
        <FileText size={12} /> PDF
      </button>
    </div>
  );
}

// ─── Section card ─────────────────────────────────────────────────────────────
function SectionCard({ title, icon: Icon, color, children, exportTitle }: {
  title: string; icon: any; color: string; children: React.ReactNode; exportTitle?: string;
}) {
  return (
    <div className="bg-[#161b27] border border-[#1e2536] rounded-xl overflow-hidden">
      <div className={`flex items-center gap-2 px-5 py-3.5 border-b border-[#1e2536] bg-gradient-to-r from-transparent`}>
        <Icon size={15} className={color} />
        <h2 className="text-sm font-bold text-white">{title}</h2>
        {exportTitle && <ExportBar title={exportTitle} />}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ─── Tab types ─────────────────────────────────────────────────────────────────
type Tab = 'overview' | 'revenue' | 'occupancy' | 'expenses' | 'guests' | 'staff' | 'inventory';

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: 'overview',   label: 'Overview',   icon: BarChart3 },
  { id: 'revenue',    label: 'Revenue',    icon: DollarSign },
  { id: 'occupancy',  label: 'Occupancy',  icon: BedDouble },
  { id: 'expenses',   label: 'Expenses',   icon: TrendingUp },
  { id: 'guests',     label: 'Guests',     icon: Users },
  { id: 'staff',      label: 'Staff',      icon: Clock },
  { id: 'inventory',  label: 'Inventory',  icon: Package },
];

// ─── KPI Tile ─────────────────────────────────────────────────────────────────
function KPI({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="bg-[#161b27] border border-[#1e2536] rounded-xl px-4 py-4">
      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-slate-600 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [dateRange, setDateRange] = useState('Last 6 Months');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Reports</h1>
          <p className="text-slate-500 text-sm mt-0.5">Analytics across all hotel operations</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-[#161b27] border border-[#1e2536] rounded-lg px-3 py-2">
            <Filter size={13} className="text-slate-500" />
            <select value={dateRange} onChange={e => setDateRange(e.target.value)}
              className="bg-transparent text-sm text-slate-300 outline-none">
              {['Last 7 Days','Last 30 Days','Last 6 Months','This Year'].map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
          <button className="flex items-center gap-2 bg-[#161b27] border border-[#1e2536] hover:border-slate-500 text-slate-300 px-3 py-2 rounded-lg text-sm font-medium transition-all">
            <Download size={13} /> Full Report
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 flex-wrap bg-[#161b27] border border-[#1e2536] rounded-xl p-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors flex-1 justify-center border ${activeTab === id ? 'bg-blue-600/20 text-blue-400 border border-blue-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border-transparent'}`}>
            <Icon size={13} />{label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KPI label="Revenue (Mar)"   value="$142,840" sub="+12.4% vs Feb" color="text-emerald-400" />
            <KPI label="Occupancy (Mar)" value="81%"      sub="+10% vs Feb"   color="text-blue-400" />
            <KPI label="ADR (Mar)"       value="$312"     sub="Avg daily rate"  color="text-violet-400" />
            <KPI label="RevPAR"          value="$253"     sub="Revenue/avail room" color="text-amber-400" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <SectionCard title="Monthly Revenue" icon={DollarSign} color="text-emerald-400" exportTitle="revenue">
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
                  <YAxis stroke="#475569" tick={{ fontSize: 11 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                  <Tooltip {...tooltipStyle} formatter={(v: number) => [`$${v.toLocaleString()}`, '']} />
                  <Area type="monotone" dataKey="total" stroke={C.blue} fill="url(#gRooms)" strokeWidth={2} name="Total Revenue" />
                </AreaChart>
              </ResponsiveContainer>
            </SectionCard>

            <SectionCard title="Occupancy vs ADR" icon={BedDouble} color="text-blue-400" exportTitle="occupancy">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={occupancyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2536" />
                  <XAxis dataKey="month" stroke="#475569" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" stroke="#475569" tick={{ fontSize: 11 }} unit="%" />
                  <YAxis yAxisId="right" orientation="right" stroke="#475569" tick={{ fontSize: 11 }} tickFormatter={v => `$${v}`} />
                  <Tooltip {...tooltipStyle} />
                  <Line yAxisId="left"  type="monotone" dataKey="occupancy" stroke={C.blue}   strokeWidth={2} dot={{ fill: C.blue,   r: 3 }} name="Occupancy %" />
                  <Line yAxisId="right" type="monotone" dataKey="adr"       stroke={C.violet} strokeWidth={2} dot={{ fill: C.violet, r: 3 }} name="ADR ($)" />
                </LineChart>
              </ResponsiveContainer>
            </SectionCard>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <SectionCard title="Guest Source Mix" icon={Users} color="text-violet-400" exportTitle="sources">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={guestSourceData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" paddingAngle={3}>
                    {guestSourceData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v}%`, '']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-1 mt-2">
                {guestSourceData.map(({ name, value, color }) => (
                  <div key={name} className="flex items-center gap-1.5 text-xs text-slate-400">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />{name} <span className="font-bold" style={{ color }}>{value}%</span>
                  </div>
                ))}
              </div>
            </SectionCard>

            <div className="lg:col-span-2">
              <SectionCard title="Revenue by Room Type" icon={BedDouble} color="text-sky-400" exportTitle="room-types">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={roomTypeRevenue} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e2536" horizontal={false} />
                    <XAxis type="number" stroke="#475569" tick={{ fontSize: 11 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="type" stroke="#475569" tick={{ fontSize: 11 }} width={80} />
                    <Tooltip {...tooltipStyle} formatter={(v: number) => [`$${v.toLocaleString()}`, '']} />
                    <Bar dataKey="revenue" fill={C.blue} radius={[0, 4, 4, 0]} name="Revenue" />
                  </BarChart>
                </ResponsiveContainer>
              </SectionCard>
            </div>
          </div>
        </div>
      )}

      {/* ── REVENUE ── */}
      {activeTab === 'revenue' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KPI label="Room Revenue"  value="$118,400" sub="83% of total"   color="text-blue-400" />
            <KPI label="F&B Revenue"   value="$18,200"  sub="13% of total"   color="text-emerald-400" />
            <KPI label="Event Revenue" value="$6,240"   sub="4% of total"    color="text-violet-400" />
            <KPI label="Growth MoM"    value="+12.4%"   sub="vs last month"  color="text-amber-400" />
          </div>

          <SectionCard title="Revenue Breakdown by Stream" icon={DollarSign} color="text-emerald-400" exportTitle="revenue-breakdown">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2536" />
                <XAxis dataKey="month" stroke="#475569" tick={{ fontSize: 11 }} />
                <YAxis stroke="#475569" tick={{ fontSize: 11 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip {...tooltipStyle} formatter={(v: number) => [`$${v.toLocaleString()}`, '']} />
                <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
                <Bar dataKey="rooms"  stackId="a" fill={C.blue}    name="Rooms" radius={[0,0,0,0]} />
                <Bar dataKey="fnb"    stackId="a" fill={C.emerald} name="F&B" />
                <Bar dataKey="events" stackId="a" fill={C.violet}  name="Events" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </SectionCard>

          <SectionCard title="Revenue Table" icon={Table} color="text-slate-400" exportTitle="revenue-table">
            <table className="w-full text-sm">
              <thead className="border-b border-[#1e2536]">
                <tr>{['Month','Room Revenue','F&B Revenue','Events','Total','MoM Change'].map(h =>
                  <th key={h} className="text-xs text-slate-500 uppercase tracking-wider font-medium py-2 px-2 text-left whitespace-nowrap">{h}</th>)}</tr>
              </thead>
              <tbody>
                {revenueData.map((r, i) => {
                  const prev = revenueData[i - 1];
                  const change = prev ? ((r.total - prev.total) / prev.total * 100).toFixed(1) : null;
                  return (
                    <tr key={r.month} className="border-b border-[#1e2536] last:border-0 hover:bg-white/[0.02]">
                      <td className="py-2.5 px-2 text-sm font-medium text-slate-200">{r.month}</td>
                      <td className="py-2.5 px-2 text-sm text-slate-400">${r.rooms.toLocaleString()}</td>
                      <td className="py-2.5 px-2 text-sm text-slate-400">${r.fnb.toLocaleString()}</td>
                      <td className="py-2.5 px-2 text-sm text-slate-400">${r.events.toLocaleString()}</td>
                      <td className="py-2.5 px-2 text-sm font-bold text-white">${r.total.toLocaleString()}</td>
                      <td className="py-2.5 px-2 text-xs font-semibold">
                        {change ? <span className={Number(change) >= 0 ? 'text-emerald-400' : 'text-red-400'}>{Number(change) >= 0 ? '+' : ''}{change}%</span> : <span className="text-slate-600">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </SectionCard>
        </div>
      )}

      {/* ── OCCUPANCY ── */}
      {activeTab === 'occupancy' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KPI label="Avg Occupancy"  value="78%"   sub="6-month average" color="text-blue-400" />
            <KPI label="Best Month"     value="91%"   sub="December 2025"   color="text-emerald-400" />
            <KPI label="Avg ADR"        value="$302"  sub="6-month average" color="text-violet-400" />
            <KPI label="Avg RevPAR"     value="$237"  sub="6-month average" color="text-amber-400" />
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <SectionCard title="ADR Trend" icon={DollarSign} color="text-violet-400" exportTitle="adr-trend">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={occupancyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2536" />
                  <XAxis dataKey="month" stroke="#475569" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#475569" tick={{ fontSize: 11 }} tickFormatter={v => `$${v}`} />
                  <Tooltip {...tooltipStyle} formatter={(v: number) => [`$${v}`, '']} />
                  <Line type="monotone" dataKey="adr" stroke={C.violet} strokeWidth={2} dot={{ fill: C.violet, r: 3 }} name="ADR ($)" />
                </LineChart>
              </ResponsiveContainer>
            </SectionCard>

            <SectionCard title="Room Type Performance" icon={BedDouble} color="text-sky-400" exportTitle="room-type-perf">
              <table className="w-full text-sm">
                <thead className="border-b border-[#1e2536]">
                  <tr>{['Type','Nights','Revenue','ADR'].map(h =>
                    <th key={h} className="text-xs text-slate-500 font-medium py-2 px-2 text-left">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {roomTypeRevenue.map(r => (
                    <tr key={r.type} className="border-b border-[#1e2536] last:border-0 hover:bg-white/[0.02]">
                      <td className="py-2.5 px-2 text-sm font-medium text-slate-200">{r.type}</td>
                      <td className="py-2.5 px-2 text-sm text-slate-400">{r.nights}</td>
                      <td className="py-2.5 px-2 text-sm text-slate-400">${r.revenue.toLocaleString()}</td>
                      <td className="py-2.5 px-2 text-sm font-bold text-blue-400">${r.adr}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </SectionCard>
          </div>
        </div>
      )}

      {/* ── EXPENSES ── */}
      {activeTab === 'expenses' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KPI label="Total (Mar)"   value="$27,960" sub="+3.1% vs Feb"    color="text-red-400" />
            <KPI label="Payroll"       value="$18,500" sub="66% of expenses" color="text-amber-400" />
            <KPI label="Cost Ratio"    value="19.6%"   sub="Expenses/Revenue" color="text-violet-400" />
            <KPI label="EBITDA (Mar)"  value="$114,880" sub="Margin 80.4%"   color="text-emerald-400" />
          </div>

          <SectionCard title="Expense Breakdown by Category" icon={TrendingUp} color="text-red-400" exportTitle="expenses">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={expenseData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2536" />
                <XAxis dataKey="month" stroke="#475569" tick={{ fontSize: 11 }} />
                <YAxis stroke="#475569" tick={{ fontSize: 11 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip {...tooltipStyle} formatter={(v: number) => [`$${v.toLocaleString()}`, '']} />
                <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
                <Bar dataKey="payroll"     stackId="a" fill={C.red}     name="Payroll" />
                <Bar dataKey="supplies"    stackId="a" fill={C.amber}   name="Supplies" />
                <Bar dataKey="utilities"   stackId="a" fill={C.violet}  name="Utilities" />
                <Bar dataKey="maintenance" stackId="a" fill={C.sky}     name="Maintenance" />
                <Bar dataKey="marketing"   stackId="a" fill={C.emerald} name="Marketing" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </SectionCard>

          <SectionCard title="Expense Table" icon={Table} color="text-slate-400" exportTitle="expense-table">
            <table className="w-full text-sm">
              <thead className="border-b border-[#1e2536]">
                <tr>{['Month','Payroll','Supplies','Utilities','Maintenance','Marketing','Total'].map(h =>
                  <th key={h} className="text-xs text-slate-500 uppercase tracking-wider font-medium py-2 px-2 text-left whitespace-nowrap">{h}</th>)}</tr>
              </thead>
              <tbody>
                {expenseData.map(r => {
                  const total = r.payroll + r.supplies + r.utilities + r.maintenance + r.marketing;
                  return (
                    <tr key={r.month} className="border-b border-[#1e2536] last:border-0 hover:bg-white/[0.02]">
                      <td className="py-2.5 px-2 font-medium text-slate-200">{r.month}</td>
                      <td className="py-2.5 px-2 text-slate-400">${r.payroll.toLocaleString()}</td>
                      <td className="py-2.5 px-2 text-slate-400">${r.supplies.toLocaleString()}</td>
                      <td className="py-2.5 px-2 text-slate-400">${r.utilities.toLocaleString()}</td>
                      <td className="py-2.5 px-2 text-slate-400">${r.maintenance.toLocaleString()}</td>
                      <td className="py-2.5 px-2 text-slate-400">${r.marketing.toLocaleString()}</td>
                      <td className="py-2.5 px-2 font-bold text-red-400">${total.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </SectionCard>
        </div>
      )}

      {/* ── GUESTS ── */}
      {activeTab === 'guests' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KPI label="Total Guests (Mar)" value="84"    sub="+8% vs Feb"    color="text-blue-400" />
            <KPI label="VIP Guests"         value="6"     sub="7% of total"   color="text-amber-400" />
            <KPI label="Repeat Guests"      value="22"    sub="26% retention" color="text-emerald-400" />
            <KPI label="Avg Stay"           value="3.4"   sub="nights"        color="text-violet-400" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <SectionCard title="Booking Source Distribution" icon={Users} color="text-violet-400" exportTitle="guest-sources">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={guestSourceData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, value }) => `${name} ${value}%`} labelLine={false}>
                    {guestSourceData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v}%`, '']} />
                </PieChart>
              </ResponsiveContainer>
            </SectionCard>

            <SectionCard title="Nationality Mix" icon={Users} color="text-sky-400" exportTitle="nationality">
              <div className="space-y-2.5 pt-2">
                {[
                  { country: 'Nigeria',     pct: 48, color: C.emerald },
                  { country: 'UK / Europe', pct: 22, color: C.blue },
                  { country: 'USA',         pct: 12, color: C.violet },
                  { country: 'Asia',        pct: 10, color: C.amber },
                  { country: 'Other',       pct: 8,  color: C.slate },
                ].map(({ country, pct, color }) => (
                  <div key={country}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-slate-400">{country}</span>
                      <span className="text-xs font-bold" style={{ color }}>{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-[#0f1117] rounded-full overflow-hidden">
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
                <tr>{['Status','Count','Revenue','Avg Stay','% of Total'].map(h =>
                  <th key={h} className="text-xs text-slate-500 font-medium py-2 px-2 text-left">{h}</th>)}</tr>
              </thead>
              <tbody>
                {[
                  { status: 'Checked In',  count: 6,  revenue: 10320, avg: 4.1, pct: 43 },
                  { status: 'Confirmed',   count: 4,  revenue: 4000,  avg: 3.0, pct: 29 },
                  { status: 'Checked Out', count: 1,  revenue: 660,   avg: 3.0, pct: 7 },
                  { status: 'Pending',     count: 1,  revenue: 1520,  avg: 4.0, pct: 7 },
                  { status: 'Cancelled',   count: 1,  revenue: 0,     avg: 0,   pct: 7 },
                  { status: 'No Show',     count: 1,  revenue: 0,     avg: 0,   pct: 7 },
                ].map(r => (
                  <tr key={r.status} className="border-b border-[#1e2536] last:border-0 hover:bg-white/[0.02]">
                    <td className="py-2.5 px-2 font-medium text-slate-200">{r.status}</td>
                    <td className="py-2.5 px-2 text-slate-400">{r.count}</td>
                    <td className="py-2.5 px-2 text-slate-400">{r.revenue > 0 ? `$${r.revenue.toLocaleString()}` : '—'}</td>
                    <td className="py-2.5 px-2 text-slate-400">{r.avg > 0 ? `${r.avg} nights` : '—'}</td>
                    <td className="py-2.5 px-2 text-blue-400 font-semibold">{r.pct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </SectionCard>
        </div>
      )}

      {/* ── STAFF / ATTENDANCE ── */}
      {activeTab === 'staff' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KPI label="Total Staff"       value="21"   sub="Active headcount" color="text-blue-400" />
            <KPI label="Attendance Rate"   value="89%"  sub="This week"        color="text-emerald-400" />
            <KPI label="Avg Hours/Day"     value="7.8h" sub="Clocked hours"    color="text-violet-400" />
            <KPI label="Late Arrivals"     value="9"    sub="This week"        color="text-amber-400" />
          </div>

          <SectionCard title="Attendance This Week" icon={Clock} color="text-blue-400" exportTitle="attendance-week">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={attendanceWeek}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2536" />
                <XAxis dataKey="day" stroke="#475569" tick={{ fontSize: 11 }} />
                <YAxis stroke="#475569" tick={{ fontSize: 11 }} />
                <Tooltip {...tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
                <Bar dataKey="present" stackId="a" fill={C.emerald} name="Present" />
                <Bar dataKey="late"    stackId="a" fill={C.amber}   name="Late" />
                <Bar dataKey="absent"  stackId="a" fill={C.red}     name="Absent" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </SectionCard>

          <SectionCard title="Staff by Department" icon={Users} color="text-slate-400" exportTitle="dept-headcount">
            <table className="w-full text-sm">
              <thead className="border-b border-[#1e2536]">
                <tr>{['Department','Headcount','Present Today','Attendance %','Avg Hours'].map(h =>
                  <th key={h} className="text-xs text-slate-500 font-medium py-2 px-2 text-left whitespace-nowrap">{h}</th>)}</tr>
              </thead>
              <tbody>
                {[
                  { dept: 'Management',   count: 2, present: 2, rate: 100, hours: 8.5 },
                  { dept: 'Front Desk',   count: 4, present: 3, rate: 82,  hours: 8.1 },
                  { dept: 'Housekeeping', count: 6, present: 5, rate: 88,  hours: 7.9 },
                  { dept: 'Bar',          count: 3, present: 2, rate: 91,  hours: 7.5 },
                  { dept: 'Finance',      count: 2, present: 1, rate: 75,  hours: 8.0 },
                  { dept: 'Security',     count: 2, present: 2, rate: 95,  hours: 8.0 },
                  { dept: 'Maintenance',  count: 2, present: 2, rate: 86,  hours: 7.8 },
                ].map(r => (
                  <tr key={r.dept} className="border-b border-[#1e2536] last:border-0 hover:bg-white/[0.02]">
                    <td className="py-2.5 px-2 font-medium text-slate-200">{r.dept}</td>
                    <td className="py-2.5 px-2 text-slate-400">{r.count}</td>
                    <td className="py-2.5 px-2 text-slate-400">{r.present}</td>
                    <td className="py-2.5 px-2">
                      <span className={`text-xs font-bold ${r.rate >= 90 ? 'text-emerald-400' : r.rate >= 80 ? 'text-amber-400' : 'text-red-400'}`}>{r.rate}%</span>
                    </td>
                    <td className="py-2.5 px-2 text-slate-400">{r.hours}h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </SectionCard>
        </div>
      )}

      {/* ── INVENTORY ── */}
      {activeTab === 'inventory' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KPI label="Total Items"      value="142"   sub="Tracked items"    color="text-blue-400" />
            <KPI label="Low Stock"        value="5"     sub="Below par level"  color="text-red-400" />
            <KPI label="Inventory Value"  value="$8,200" sub="F&B stock value" color="text-emerald-400" />
            <KPI label="Turnover Rate"    value="4.2x"  sub="Monthly average"  color="text-violet-400" />
          </div>

          <SectionCard title="Stock Levels vs Par — Critical Items" icon={Package} color="text-red-400" exportTitle="low-stock">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={inventoryAlerts} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2536" horizontal={false} />
                <XAxis type="number" stroke="#475569" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="item" stroke="#475569" tick={{ fontSize: 10 }} width={140} />
                <Tooltip {...tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
                <Bar dataKey="par"     fill={C.slate} name="Par Level" radius={[0,4,4,0]} opacity={0.4} />
                <Bar dataKey="current" fill={C.red}   name="Current Stock" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          </SectionCard>

          <SectionCard title="Low Stock Alert List" icon={Table} color="text-slate-400" exportTitle="inventory-alerts">
            <table className="w-full text-sm">
              <thead className="border-b border-[#1e2536]">
                <tr>{['Item','Category','Current','Par Level','Unit','Status'].map(h =>
                  <th key={h} className="text-xs text-slate-500 font-medium py-2 px-2 text-left">{h}</th>)}</tr>
              </thead>
              <tbody>
                {inventoryAlerts.map(a => {
                  const pct = Math.round(a.current / a.par * 100);
                  return (
                    <tr key={a.item} className="border-b border-[#1e2536] last:border-0 hover:bg-white/[0.02]">
                      <td className="py-2.5 px-2 font-medium text-slate-200">{a.item}</td>
                      <td className="py-2.5 px-2 text-xs text-slate-500">{a.category}</td>
                      <td className="py-2.5 px-2 text-red-400 font-bold">{a.current}</td>
                      <td className="py-2.5 px-2 text-slate-400">{a.par}</td>
                      <td className="py-2.5 px-2 text-xs text-slate-500">{a.unit}</td>
                      <td className="py-2.5 px-2">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${pct <= 25 ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/15 text-amber-400'}`}>
                          {pct}% of par
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </SectionCard>
        </div>
      )}
    </div>
  );
}