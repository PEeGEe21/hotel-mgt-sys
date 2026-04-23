'use client';

import { useEffect, useMemo, useState } from 'react';
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
import {
  PosTerminal,
  usePosTerminalGroups,
  usePosTerminals,
  useRenamePosTerminalGroup,
  useUpdatePosTerminal,
} from '@/hooks/pos/usePosTerminals';
import { useUserAccounts } from '@/hooks/useUserAccounts';
import { useInventoryList } from '@/hooks/inventory/useInventoryItems';
import EditPosTerminal from '../../_components/EditPosTerminal';
import DeleteConfirm from '../../_components/DeleteConfirm';
import { usePermissions } from '@/hooks/usePermissions';
import AddPosTerminal from '../../_components/AddPosTerminal';
import Link from 'next/link';

const defaultGroups = ['Bar', 'Kitchen', 'Front Desk', 'Pool', 'Spa', 'Other Locations'];

const sales = [
  {
    id: 'S-12041',
    time: '09:14 AM',
    date: '2026-03-12',
    terminal: 'Bar Terminal 01',
    staff: 'Mariam Mensah',
    payment: 'Cash',
    total: 84.5,
    status: 'Completed',
  },
  {
    id: 'S-12042',
    time: '09:36 AM',
    date: '2026-03-12',
    terminal: 'Front Desk POS',
    staff: 'Ada Ibekwe',
    payment: 'Transfer',
    total: 210,
    status: 'Completed',
  },
  {
    id: 'S-12043',
    time: '10:05 AM',
    date: '2026-03-12',
    terminal: 'Kitchen Terminal 01',
    staff: 'Tomi Ogun',
    payment: 'Credit',
    total: 46.8,
    status: 'Completed',
  },
  {
    id: 'S-12044',
    time: '10:24 AM',
    date: '2026-03-12',
    terminal: 'Pool Service POS',
    staff: 'Lina Park',
    payment: 'Cash',
    total: 35.4,
    status: 'Completed',
  },
  {
    id: 'S-12045',
    time: '10:41 AM',
    date: '2026-03-12',
    terminal: 'Bar Terminal 02',
    staff: 'Mariam Mensah',
    payment: 'Credit',
    total: 128.0,
    status: 'Completed',
  },
];

const retirement = [
  {
    id: 'R-2301',
    item: 'House Red Wine',
    qty: 2,
    reason: 'Breakage',
    approvedBy: 'Ada Ibekwe',
    date: '2026-03-12',
  },
  {
    id: 'R-2302',
    item: 'Classic Burger',
    qty: 1,
    reason: 'Kitchen error',
    approvedBy: 'Tomi Ogun',
    date: '2026-03-12',
  },
  {
    id: 'R-2303',
    item: 'Spa Oil Set',
    qty: 1,
    reason: 'Damaged',
    approvedBy: 'Rafael Silva',
    date: '2026-03-11',
  },
];

const statusBadge: Record<string, string> = {
  Online: 'bg-emerald-500/15 text-emerald-400',
  Offline: 'bg-red-500/15 text-red-400',
  Completed: 'bg-emerald-500/15 text-emerald-400',
  Pending: 'bg-amber-500/15 text-amber-400',
};

export default function PosPage() {
  const [query, setQuery] = useState('');
  const { can } = usePermissions();
  const [dateFrom, setDateFrom] = useState('2026-03-10');
  const [dateTo, setDateTo] = useState('2026-03-12');
  const [showAdd, setShowAdd] = useState(false);
  const [assignTarget, setAssignTarget] = useState<PosTerminal | null>(null);
  const [openEdit, setOpenEdit] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [groupOrder, setGroupOrder] = useState<string[]>([]);
  const { data: terminalGroups = [], isLoading: terminalGroupsLoading } = usePosTerminalGroups();
  const { data: terminals = [], isLoading: terminalsLoading } = usePosTerminals();
  const { data: inventoryData, isLoading: inventoryLoading } = useInventoryList();
  const inventoryItems = inventoryData?.items ?? [];
  const updateTerminal = useUpdatePosTerminal(assignTarget?.id ?? '');
  const renameGroup = useRenamePosTerminalGroup();
  const { data: users = [] } = useUserAccounts();

  const grouped = useMemo(() => {
    const map: Record<string, typeof terminals> = {};

    terminals.forEach((t) => {
      const key = t.terminalGroupName || 'Other Locations';

      if (!map[key]) map[key] = [];

      map[key].push(t);
    });

    return Object.entries(map).map(([label, items]) => ({
      label,
      terminals: items,
    }));
  }, [terminals]);

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('pos-group-order') : null;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setGroupOrder(parsed);
      } catch {
        setGroupOrder([]);
      }
    }
  }, []);

  useEffect(() => {
    if (terminalGroups.length === 0) return;
    setGroupOrder((prev) => {
      const labels = terminalGroups.map((g) => g.name);
      const next = [
        ...prev.filter((label) => labels.includes(label)),
        ...labels.filter((label) => !prev.includes(label)),
      ];
      if (typeof window !== 'undefined') {
        localStorage.setItem('pos-group-order', JSON.stringify(next));
      }
      return next;
    });
  }, [terminalGroups]);

  useEffect(() => {
    if (typeof window !== 'undefined' && groupOrder.length > 0) {
      localStorage.setItem('pos-group-order', JSON.stringify(groupOrder));
    }
  }, [groupOrder]);

  const orderedGroups = useMemo(() => {
    if (groupOrder.length === 0) return grouped;
    const order = new Map(groupOrder.map((label, index) => [label, index]));
    return [...grouped].sort((a, b) => (order.get(a.label) ?? 999) - (order.get(b.label) ?? 999));
  }, [groupOrder, grouped]);

  const moveGroup = (label: string, direction: 'up' | 'down') => {
    setGroupOrder((prev) => {
      const index = prev.indexOf(label);
      if (index === -1) return prev;
      const swapIndex = direction === 'up' ? index - 1 : index + 1;
      if (swapIndex < 0 || swapIndex >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
      return next;
    });
  };

  const handleRenameGroup = async (label: string) => {
    const next = prompt('Rename group', label);
    if (!next || !next.trim() || next.trim() === label) return;
    await renameGroup.mutateAsync({ from: label, to: next.trim() });
    setGroupOrder((prev) => prev.map((item) => (item === label ? next.trim() : item)));
  };

  const filteredSales = useMemo(() => {
    return sales.filter((sale) => {
      const matchQuery = `${sale.id} ${sale.terminal} ${sale.staff} ${sale.payment}`
        .toLowerCase()
        .includes(query.toLowerCase());
      const withinRange = (!dateFrom || sale.date >= dateFrom) && (!dateTo || sale.date <= dateTo);
      return matchQuery && withinRange;
    });
  }, [query, dateFrom, dateTo]);

  const updateTerminalStatus = async (terminal: PosTerminal) => {
    const status = terminal.status == 'Online' ? 'Offline' : 'Online';
    setAssignTarget(terminal);
    await updateTerminal.mutateAsync({
      status: status,
    });
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">POS / Store</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Sales overview, terminal configuration, and reporting.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/pos/products"
              className="border border-blue-600 hover:bg-white hover:text-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
            >
              <ShoppingCart size={16} /> Manage Pos Products
            </Link>

            <Link
              href="/pos/terminal"
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
            >
              <ShoppingCart size={16} /> Launch POS Terminal
            </Link>
          </div>
        </div>

        <Tabs defaultValue="sales" className="space-y-4 flex-col">
          <TabsList className="bg-[#161b27] border border-[#1e2536] rounded-xl p-1 justify-start">
            <TabsTrigger
              value="sales"
              className="px-4 py-2 data-[state=active]:bg-blue-600/20 data-[state=active]:text-blue-400 border data-[state=active]:border-blue-500/20 !text-white hover:!text-slate-200"
            >
              Sales
            </TabsTrigger>
            {can('manage:pos') && (
              <TabsTrigger
                value="config"
                className="px-4 py-2 data-[state=active]:bg-blue-600/20 data-[state=active]:text-blue-400 border data-[state=active]:border-blue-500/20 !text-white hover:!text-slate-200"
              >
                Configuration
              </TabsTrigger>
            )}
            <TabsTrigger
              value="inventory"
              className="px-4 py-2 data-[state=active]:bg-blue-600/20 data-[state=active]:text-blue-400 border data-[state=active]:border-blue-500/20 !text-white hover:!text-slate-200"
            >
              Inventory
            </TabsTrigger>
            <TabsTrigger
              value="reports"
              className="px-4 py-2 data-[state=active]:bg-blue-600/20 data-[state=active]:text-blue-400 border data-[state=active]:border-blue-500/20 !text-white hover:!text-slate-200"
            >
              Reports
            </TabsTrigger>
            <TabsTrigger
              value="retirements"
              className="px-4 py-2 data-[state=active]:bg-blue-600/20 data-[state=active]:text-blue-400 border data-[state=active]:border-blue-500/20 !text-white hover:!text-slate-20  "
            >
              Retirements
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sales" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5">
                <p className="text-xs text-slate-500 uppercase tracking-widest">
                  Today&apos;s Sales
                </p>
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
                  <span className="flex items-center gap-1">
                    <Wallet size={12} /> Cash 46%
                  </span>
                  <span className="flex items-center gap-1">
                    <CreditCard size={12} /> Credit 38%
                  </span>
                  <span className="flex items-center gap-1">
                    <FileText size={12} /> Transfer 16%
                  </span>
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
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="bg-transparent text-slate-300 text-xs outline-none"
                    />
                    <span className="text-slate-600">to</span>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="bg-transparent text-slate-300 text-xs outline-none"
                    />
                  </div>
                  <div className="relative">
                    <Search
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                    />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
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
                  {filteredSales.map((sale) => (
                    <div
                      key={sale.id}
                      className="grid grid-cols-6 px-4 py-3 text-xs text-slate-300"
                    >
                      <div className="text-slate-200 font-medium">{sale.id}</div>
                      <div>
                        <div className="text-slate-200">{sale.date}</div>
                        <div className="text-[11px] text-slate-500">{sale.time}</div>
                      </div>
                      <div>{sale.terminal}</div>
                      <div>{sale.staff}</div>
                      <div>{sale.payment}</div>
                      <div className="text-right text-slate-200 font-semibold">
                        ${sale.total.toFixed(2)}
                      </div>
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
                {terminalsLoading && <p className="text-xs text-slate-500">Loading terminals...</p>}
                {!terminalsLoading && terminals.length === 0 && (
                  <div className="rounded-xl border border-dashed border-[#2b3348] bg-[#0f1117] px-4 py-6 text-center text-xs text-slate-500">
                    No terminals yet. Click “Add Terminal” to set up your first POS station.
                  </div>
                )}
                {!terminalsLoading &&
                  terminals.length > 0 &&
                  orderedGroups.map((group) => (
                    <div key={group.label}>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-slate-500 uppercase tracking-widest">
                          {group.label}
                        </p>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                          <button
                            onClick={() => moveGroup(group.label, 'up')}
                            className="rounded border border-[#1e2536] px-2 py-1 hover:text-slate-200"
                          >
                            Up
                          </button>
                          <button
                            onClick={() => moveGroup(group.label, 'down')}
                            className="rounded border border-[#1e2536] px-2 py-1 hover:text-slate-200"
                          >
                            Down
                          </button>
                          <button
                            onClick={() => handleRenameGroup(group.label)}
                            className="rounded border border-[#1e2536] px-2 py-1 hover:text-slate-200"
                          >
                            Rename
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {group.terminals.map((terminal) => (
                          <div
                            key={terminal.id}
                            className="bg-[#0f1117] border border-[#1e2536] rounded-xl p-4"
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="text-sm font-semibold text-white">{terminal.name}</p>
                                <p className="text-xs text-slate-500">{terminal.location}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => updateTerminalStatus(terminal)}
                                  className={`text-[11px] px-2 py-0.5 rounded-full ${statusBadge[terminal.status]}`}
                                >
                                  {terminal.status}
                                </button>
                                <button
                                  onClick={async () => {
                                    if (!terminal) return;
                                    setAssignTarget(terminal);
                                    setOpenDelete(true);
                                  }}
                                  className={`text-[11px] px-2 py-0.5 rounded-full bg-white/5 hover:bg-red-500/10 text-red-400`}
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                            <div className="mt-3 text-xs text-slate-400 space-y-1">
                              <div className="flex items-center justify-between">
                                <span>Device</span>
                                <span className="text-slate-200">{terminal.device}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span>Assigned Staff</span>
                                <span className="text-slate-200">{terminal.staffName ?? '—'}</span>
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                setAssignTarget(terminal);
                                setOpenEdit(true);
                              }}
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
                <a href="/inventory" className="text-xs text-blue-400 hover:text-blue-300">
                  View inventory module
                </a>
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
                  {inventoryLoading && (
                    <div className="px-4 py-3 text-xs text-slate-500">Loading inventory...</div>
                  )}
                  {!inventoryLoading && inventoryItems.length === 0 && (
                    <div className="px-4 py-3 text-xs text-slate-500">No inventory items yet.</div>
                  )}
                  {!inventoryLoading &&
                    inventoryItems.map((item) => (
                      <div
                        key={item.id}
                        className="grid grid-cols-5 px-4 py-3 text-xs text-slate-300"
                      >
                        <span className="text-slate-200 font-medium">{item.name}</span>
                        <span>{item.uniqueId || item.sku}</span>
                        <span>{item.category}</span>
                        <span className={item.quantity < item.minStock ? 'text-amber-400' : ''}>
                          {item.quantity}
                        </span>
                        <span className="text-right text-slate-400">{item.minStock}</span>
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
                ].map((item) => (
                  <div
                    key={item.label}
                    className="bg-[#0f1117] border border-[#1e2536] rounded-xl p-4"
                  >
                    <p className="text-slate-500 uppercase tracking-widest text-[11px]">
                      {item.label}
                    </p>
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
                  {retirement.map((item) => (
                    <div
                      key={item.id}
                      className="grid grid-cols-5 px-4 py-3 text-xs text-slate-300"
                    >
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
      </div>

      <DeleteConfirm
        isOpen={openDelete}
        terminal={assignTarget}
        onClose={() => {
          setOpenDelete(false);
          setAssignTarget(null);
        }}
      />

      <AddPosTerminal
        isOpen={showAdd}
        onClose={() => {
          setShowAdd(false);
        }}
      />

      <EditPosTerminal
        isOpen={openEdit}
        onClose={() => {
          setOpenEdit(false);
          setAssignTarget(null);
        }}
        terminal={assignTarget}
      />
    </>
  );
}
