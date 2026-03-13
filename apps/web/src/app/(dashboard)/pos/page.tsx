'use client';

import { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  CalendarDays,
  CreditCard,
  FileText,
  Filter,
  LayoutGrid,
  Package,
  RefreshCcw,
  Search,
  ShoppingCart,
  SlidersHorizontal,
  Wallet,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const terminalGroups = [
  {
    label: 'Bar',
    terminals: [
      { id: 'bar-01', name: 'Bar Terminal 01', status: 'Online', location: 'Main Bar', device: 'Tablet', staff: 'Mariam Mensah' },
      { id: 'bar-02', name: 'Bar Terminal 02', status: 'Online', location: 'Rooftop Bar', device: 'Tablet', staff: 'Lina Park' },
    ],
  },
  {
    label: 'Kitchen',
    terminals: [
      { id: 'kitchen-01', name: 'Kitchen Terminal 01', status: 'Online', location: 'Main Kitchen', device: 'Desktop', staff: 'Tomi Ogun' },
      { id: 'kitchen-02', name: 'Kitchen Terminal 02', status: 'Offline', location: 'Pastry Station', device: 'Desktop', staff: '—' },
    ],
  },
  {
    label: 'Other Locations',
    terminals: [
      { id: 'front-01', name: 'Front Desk POS', status: 'Online', location: 'Lobby', device: 'Desktop', staff: 'Ada Ibekwe' },
      { id: 'pool-01', name: 'Pool Service POS', status: 'Online', location: 'Pool Deck', device: 'Tablet', staff: 'Lina Park' },
      { id: 'spa-01', name: 'Spa Retail POS', status: 'Online', location: 'Wellness Spa', device: 'Tablet', staff: 'Rafael Silva' },
    ],
  },
];

const staffOptions = [
  'Ada Ibekwe',
  'Tomi Ogun',
  'Mariam Mensah',
  'Lina Park',
  'Rafael Silva',
  '—',
];

const sales = [
  { id: 'S-12041', time: '09:14 AM', date: '2026-03-12', terminal: 'Bar Terminal 01', staff: 'Mariam Mensah', payment: 'Cash', total: 84.5, status: 'Completed' },
  { id: 'S-12042', time: '09:36 AM', date: '2026-03-12', terminal: 'Front Desk POS', staff: 'Ada Ibekwe', payment: 'Transfer', total: 210, status: 'Completed' },
  { id: 'S-12043', time: '10:05 AM', date: '2026-03-12', terminal: 'Kitchen Terminal 01', staff: 'Tomi Ogun', payment: 'Credit', total: 46.8, status: 'Completed' },
  { id: 'S-12044', time: '10:24 AM', date: '2026-03-12', terminal: 'Pool Service POS', staff: 'Lina Park', payment: 'Cash', total: 35.4, status: 'Completed' },
  { id: 'S-12045', time: '10:41 AM', date: '2026-03-12', terminal: 'Bar Terminal 02', staff: 'Mariam Mensah', payment: 'Credit', total: 128.0, status: 'Completed' },
];

const retirement = [
  { id: 'R-2301', item: 'House Red Wine', qty: 2, reason: 'Breakage', approvedBy: 'Ada Ibekwe', date: '2026-03-12' },
  { id: 'R-2302', item: 'Classic Burger', qty: 1, reason: 'Kitchen error', approvedBy: 'Tomi Ogun', date: '2026-03-12' },
  { id: 'R-2303', item: 'Spa Oil Set', qty: 1, reason: 'Damaged', approvedBy: 'Rafael Silva', date: '2026-03-11' },
];

const inventory = [
  { name: 'Sparkling Water', sku: 'BV-101', category: 'Beverage', stock: 64, par: 80 },
  { name: 'House Red Wine', sku: 'BV-214', category: 'Beverage', stock: 18, par: 30 },
  { name: 'Classic Burger', sku: 'KT-188', category: 'Kitchen', stock: 16, par: 25 },
  { name: 'Caesar Salad', sku: 'KT-164', category: 'Kitchen', stock: 9, par: 15 },
  { name: 'Spa Oil Set', sku: 'RT-221', category: 'Retail', stock: 7, par: 12 },
];

const statusBadge: Record<string, string> = {
  Online: 'bg-emerald-500/15 text-emerald-400',
  Offline: 'bg-red-500/15 text-red-400',
  Completed: 'bg-emerald-500/15 text-emerald-400',
  Pending: 'bg-amber-500/15 text-amber-400',
};

export default function PosPage() {
  const [groups, setGroups] = useState(terminalGroups);
  const [query, setQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('2026-03-10');
  const [dateTo, setDateTo] = useState('2026-03-12');
  const [showAdd, setShowAdd] = useState(false);
  const [assignTarget, setAssignTarget] = useState<{ groupIndex: number; terminalId: string } | null>(null);
  const [newTerminal, setNewTerminal] = useState({
    name: '',
    location: '',
    group: 'Bar',
    device: 'Tablet',
    status: 'Online',
    staff: staffOptions[0],
  });

  const filteredSales = useMemo(() => {
    return sales.filter(sale => {
      const matchQuery = `${sale.id} ${sale.terminal} ${sale.staff} ${sale.payment}`
        .toLowerCase()
        .includes(query.toLowerCase());
      const withinRange = (!dateFrom || sale.date >= dateFrom) && (!dateTo || sale.date <= dateTo);
      return matchQuery && withinRange;
    });
  }, [query, dateFrom, dateTo]);

  const updateTerminal = (groupIndex: number, terminalId: string, updates: Partial<(typeof terminalGroups)[number]['terminals'][number]>) => {
    setGroups(current =>
      current.map((group, idx) => {
        if (idx !== groupIndex) return group;
        return {
          ...group,
          terminals: group.terminals.map(t => (t.id === terminalId ? { ...t, ...updates } : t)),
        };
      }),
    );
  };

  const handleAddTerminal = () => {
    if (!newTerminal.name.trim() || !newTerminal.location.trim()) return;
    setGroups(current =>
      current.map(group => {
        if (group.label !== newTerminal.group) return group;
        return {
          ...group,
          terminals: [
            ...group.terminals,
            {
              id: `${newTerminal.group.toLowerCase().replace(/\s+/g, '-')}-${group.terminals.length + 1}`,
              name: newTerminal.name,
              status: newTerminal.status,
              location: newTerminal.location,
              device: newTerminal.device,
              staff: newTerminal.staff,
            },
          ],
        };
      }),
    );
    setShowAdd(false);
    setNewTerminal({
      name: '',
      location: '',
      group: 'Bar',
      device: 'Tablet',
      status: 'Online',
      staff: staffOptions[0],
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">POS / Store</h1>
          <p className="text-slate-500 text-sm mt-0.5">Sales overview, terminal configuration, and reporting.</p>
        </div>
        <a
          href="/pos/terminal"
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
        >
          <ShoppingCart size={16} /> Launch POS Terminal
        </a>
      </div>

      <Tabs defaultValue="sales" className="space-y-4 flex-col" >
        <TabsList className="bg-[#161b27] border border-[#1e2536] rounded-xl p-1 justify-start">
          <TabsTrigger value="sales" className="px-4 py-2 data-[state=active]:bg-blue-600/20 data-[state=active]:text-blue-400 border data-[state=active]:border-blue-500/20 text-slate-400 hover:!text-slate-200">Sales</TabsTrigger>
          <TabsTrigger value="config" className="px-4 py-2 data-[state=active]:bg-blue-600/20 data-[state=active]:text-blue-400 border data-[state=active]:border-blue-500/20 text-slate-400 hover:!text-slate-200">Configuration</TabsTrigger>
          <TabsTrigger value="inventory" className="px-4 py-2 data-[state=active]:bg-blue-600/20 data-[state=active]:text-blue-400 border data-[state=active]:border-blue-500/20 text-slate-400 hover:!text-slate-200">Inventory</TabsTrigger>
          <TabsTrigger value="reports" className="px-4 py-2 data-[state=active]:bg-blue-600/20 data-[state=active]:text-blue-400 border data-[state=active]:border-blue-500/20 text-slate-400 hover:!text-slate-200">Reports</TabsTrigger>
          <TabsTrigger value="retirements" className="px-4 py-2 data-[state=active]:bg-blue-600/20 data-[state=active]:text-blue-400 border data-[state=active]:border-blue-500/20 text-slate-400 hover:!text-slate-20  ">Retirements</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5">
              <p className="text-xs text-slate-500 uppercase tracking-widest">Today&apos;s Sales</p>
              <p className="text-2xl font-semibold text-white mt-2">$1,248.60</p>
              <p className="text-xs text-emerald-400 mt-1">+12% vs yesterday</p>
            </div>
            <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5">
              <p className="text-xs text-slate-500 uppercase tracking-widest">Transactions</p>
              <p className="text-2xl font-semibold text-white mt-2">48</p>
              <p className="text-xs text-slate-400 mt-1">Avg ticket $26.01</p>
            </div>
            <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5">
              <p className="text-xs text-slate-500 uppercase tracking-widest">Payment Mix</p>
              <div className="flex items-center gap-3 text-xs text-slate-400 mt-2">
                <span className="flex items-center gap-1"><Wallet size={12} /> Cash 46%</span>
                <span className="flex items-center gap-1"><CreditCard size={12} /> Credit 38%</span>
                <span className="flex items-center gap-1"><FileText size={12} /> Transfer 16%</span>
              </div>
            </div>
          </div>

          <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5 space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-white">Sales Activity</h2>
                <p className="text-xs text-slate-500">Filter by date range and keyword.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <div className="flex items-center gap-2 bg-[#0f1117] border border-[#1e2536] px-3 py-2 rounded-lg">
                  <CalendarDays size={12} className="text-slate-500" />
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={e => setDateFrom(e.target.value)}
                    className="bg-transparent text-slate-300 text-xs outline-none"
                  />
                  <span className="text-slate-600">to</span>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={e => setDateTo(e.target.value)}
                    className="bg-transparent text-slate-300 text-xs outline-none"
                  />
                </div>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search sales"
                    className="bg-[#0f1117] border border-[#1e2536] rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 outline-none focus:border-blue-500"
                  />
                </div>
                <button className="bg-white/5 border border-[#1e2536] hover:border-slate-500 text-slate-200 px-3 py-2 rounded-lg">
                  <Filter size={12} />
                </button>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-[#1e2536]">
              <div className="grid grid-cols-6 bg-[#0f1117] px-4 py-3 text-xs text-slate-500">
                <span>Sale ID</span>
                <span>Date</span>
                <span>Terminal</span>
                <span>Staff</span>
                <span>Payment</span>
                <span className="text-right">Total</span>
              </div>
              <div className="divide-y divide-[#1e2536]">
                {filteredSales.map(sale => (
                  <div key={sale.id} className="grid grid-cols-6 px-4 py-3 text-xs text-slate-300">
                    <div className="text-slate-200 font-medium">{sale.id}</div>
                    <div>
                      <div className="text-slate-200">{sale.date}</div>
                      <div className="text-[11px] text-slate-500">{sale.time}</div>
                    </div>
                    <div>{sale.terminal}</div>
                    <div>{sale.staff}</div>
                    <div>{sale.payment}</div>
                    <div className="text-right text-slate-200 font-semibold">${sale.total.toFixed(2)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="config" className="space-y-4">
          <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <SlidersHorizontal size={14} /> Terminal Assignments
              </h2>
              <button
                onClick={() => setShowAdd(true)}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-2 rounded-lg"
              >
                Add Terminal
              </button>
            </div>
            <div className="space-y-4">
              {groups.map((group, groupIndex) => (
                <div key={group.label}>
                  <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">{group.label}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {group.terminals.map(terminal => (
                      <div key={terminal.id} className="bg-[#0f1117] border border-[#1e2536] rounded-xl p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-semibold text-white">{terminal.name}</p>
                            <p className="text-xs text-slate-500">{terminal.location}</p>
                          </div>
                          <span className={`text-[11px] px-2 py-0.5 rounded-full ${statusBadge[terminal.status]}`}>
                            {terminal.status}
                          </span>
                        </div>
                        <div className="mt-3 text-xs text-slate-400 space-y-1">
                          <div className="flex items-center justify-between">
                            <span>Device</span>
                            <span className="text-slate-200">{terminal.device}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Assigned Staff</span>
                            <span className="text-slate-200">{terminal.staff}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => setAssignTarget({ groupIndex, terminalId: terminal.id })}
                          className="mt-3 text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                        >
                          Manage assignment <ArrowUpRight size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-4">
          <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Package size={14} /> Inventory Snapshot
              </h2>
              <a href="/inventory" className="text-xs text-blue-400 hover:text-blue-300">View inventory module</a>
            </div>
            <div className="overflow-hidden rounded-xl border border-[#1e2536]">
              <div className="grid grid-cols-5 bg-[#0f1117] px-4 py-3 text-xs text-slate-500">
                <span>Item</span>
                <span>SKU</span>
                <span>Category</span>
                <span>Stock</span>
                <span className="text-right">Par Level</span>
              </div>
              <div className="divide-y divide-[#1e2536]">
                {inventory.map(item => (
                  <div key={item.sku} className="grid grid-cols-5 px-4 py-3 text-xs text-slate-300">
                    <span className="text-slate-200 font-medium">{item.name}</span>
                    <span>{item.sku}</span>
                    <span>{item.category}</span>
                    <span className={item.stock < item.par ? 'text-amber-400' : ''}>{item.stock}</span>
                    <span className="text-right text-slate-400">{item.par}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5">
              <p className="text-xs text-slate-500 uppercase tracking-widest">Top Terminal</p>
              <p className="text-xl font-semibold text-white mt-2">Bar Terminal 01</p>
              <p className="text-xs text-slate-400 mt-1">$4,210 this week</p>
            </div>
            <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5">
              <p className="text-xs text-slate-500 uppercase tracking-widest">Best Seller</p>
              <p className="text-xl font-semibold text-white mt-2">Signature Cocktail</p>
              <p className="text-xs text-slate-400 mt-1">142 units sold</p>
            </div>
            <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5">
              <p className="text-xs text-slate-500 uppercase tracking-widest">Refund Rate</p>
              <p className="text-xl font-semibold text-white mt-2">1.4%</p>
              <p className="text-xs text-emerald-400 mt-1">-0.6% vs last week</p>
            </div>
          </div>

          <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <LayoutGrid size={14} /> Performance Summary
              </h2>
              <button className="text-xs text-blue-400 hover:text-blue-300">Export report</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              {[
                { label: 'Avg Ticket', value: '$28.90' },
                { label: 'Sales per Hour', value: '$156' },
                { label: 'Peak Window', value: '7pm - 9pm' },
              ].map(item => (
                <div key={item.label} className="bg-[#0f1117] border border-[#1e2536] rounded-xl p-4">
                  <p className="text-slate-500 uppercase tracking-widest text-[11px]">{item.label}</p>
                  <p className="text-lg text-white font-semibold mt-2">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="retirements" className="space-y-4">
          <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <RefreshCcw size={14} /> Retired Items & Sales
              </h2>
              <button className="bg-white/5 border border-[#1e2536] hover:border-slate-500 text-slate-200 px-3 py-2 rounded-lg text-xs">
                New retirement
              </button>
            </div>
            <div className="overflow-hidden rounded-xl border border-[#1e2536]">
              <div className="grid grid-cols-5 bg-[#0f1117] px-4 py-3 text-xs text-slate-500">
                <span>Retirement ID</span>
                <span>Item</span>
                <span>Qty</span>
                <span>Reason</span>
                <span>Date</span>
              </div>
              <div className="divide-y divide-[#1e2536]">
                {retirement.map(item => (
                  <div key={item.id} className="grid grid-cols-5 px-4 py-3 text-xs text-slate-300">
                    <span className="text-slate-200 font-medium">{item.id}</span>
                    <span>{item.item}</span>
                    <span>{item.qty}</span>
                    <span>{item.reason}</span>
                    <span>{item.date}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {showAdd && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#161b27] border border-[#1e2536] rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[#1e2536]">
              <div>
                <h3 className="text-base font-bold text-white">Add Terminal</h3>
                <p className="text-xs text-slate-500 mt-0.5">Create a new terminal assignment.</p>
              </div>
              <button onClick={() => setShowAdd(false)} className="text-slate-500 hover:text-slate-300">×</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-500 uppercase tracking-widest">Name</label>
                  <input
                    value={newTerminal.name}
                    onChange={e => setNewTerminal(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Terminal name"
                    className="w-full mt-2 bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2 text-sm text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 uppercase tracking-widest">Location</label>
                  <input
                    value={newTerminal.location}
                    onChange={e => setNewTerminal(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="Location"
                    className="w-full mt-2 bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2 text-sm text-slate-200"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-500 uppercase tracking-widest">Group</label>
                  <select
                    value={newTerminal.group}
                    onChange={e => setNewTerminal(prev => ({ ...prev, group: e.target.value }))}
                    className="w-full mt-2 bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2 text-sm text-slate-200"
                  >
                    {groups.map(group => (
                      <option key={group.label} value={group.label}>{group.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 uppercase tracking-widest">Device</label>
                  <select
                    value={newTerminal.device}
                    onChange={e => setNewTerminal(prev => ({ ...prev, device: e.target.value }))}
                    className="w-full mt-2 bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2 text-sm text-slate-200"
                  >
                    {['Desktop', 'Tablet', 'Mobile'].map(device => (
                      <option key={device} value={device}>{device}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-500 uppercase tracking-widest">Status</label>
                  <select
                    value={newTerminal.status}
                    onChange={e => setNewTerminal(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full mt-2 bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2 text-sm text-slate-200"
                  >
                    {['Online', 'Offline'].map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 uppercase tracking-widest">Assigned Staff</label>
                  <select
                    value={newTerminal.staff}
                    onChange={e => setNewTerminal(prev => ({ ...prev, staff: e.target.value }))}
                    className="w-full mt-2 bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2 text-sm text-slate-200"
                  >
                    {staffOptions.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-[#1e2536] flex gap-3">
              <button
                onClick={() => setShowAdd(false)}
                className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg py-2.5 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddTerminal}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg py-2.5 text-sm font-semibold transition-colors"
              >
                Add Terminal
              </button>
            </div>
          </div>
        </div>
      )}

      {assignTarget && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#161b27] border border-[#1e2536] rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[#1e2536]">
              <div>
                <h3 className="text-base font-bold text-white">Manage Assignment</h3>
                <p className="text-xs text-slate-500 mt-0.5">Update device, status, or staff.</p>
              </div>
              <button onClick={() => setAssignTarget(null)} className="text-slate-500 hover:text-slate-300">×</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="text-xs text-slate-500 uppercase tracking-widest">Device</label>
                <select
                  onChange={e => updateTerminal(assignTarget.groupIndex, assignTarget.terminalId, { device: e.target.value })}
                  value={groups[assignTarget.groupIndex].terminals.find(t => t.id === assignTarget.terminalId)?.device}
                  className="w-full mt-2 bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2 text-sm text-slate-200"
                >
                  {['Desktop', 'Tablet', 'Mobile'].map(device => (
                    <option key={device} value={device}>{device}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 uppercase tracking-widest">Status</label>
                <select
                  onChange={e => updateTerminal(assignTarget.groupIndex, assignTarget.terminalId, { status: e.target.value })}
                  value={groups[assignTarget.groupIndex].terminals.find(t => t.id === assignTarget.terminalId)?.status}
                  className="w-full mt-2 bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2 text-sm text-slate-200"
                >
                  {['Online', 'Offline'].map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 uppercase tracking-widest">Assigned Staff</label>
                <select
                  onChange={e => updateTerminal(assignTarget.groupIndex, assignTarget.terminalId, { staff: e.target.value })}
                  value={groups[assignTarget.groupIndex].terminals.find(t => t.id === assignTarget.terminalId)?.staff}
                  className="w-full mt-2 bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2 text-sm text-slate-200"
                >
                  {staffOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-[#1e2536] flex gap-3">
              <button
                onClick={() => setAssignTarget(null)}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg py-2.5 text-sm font-semibold transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
