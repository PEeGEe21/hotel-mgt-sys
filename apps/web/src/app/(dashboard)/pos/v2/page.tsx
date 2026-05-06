'use client';

import { useState, useMemo } from 'react';
import {
  ShoppingCart,
  Search,
  Filter,
  CalendarDays,
  SlidersHorizontal,
  Package,
  RefreshCcw,
  ArrowUpRight,
  Wallet,
  CreditCard,
  FileText,
  Loader2,
  BarChart2,
  TrendingUp,
  Receipt,
  AlertCircle,
  ChefHat,
  Martini,
  TriangleAlert,
  X,
  CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useDeliverOrder,
  usePosOrders,
  usePayOrderById,
  useZReport,
  type ApiOrder,
} from '@/hooks/pos/usePosOrders';
import { useInventoryItemOptions } from '@/hooks/pos/usePosProducts';
import { usePosTerminals, usePosTerminalGroups } from '@/hooks/pos/usePosTerminals';
import { usePermissions } from '@/hooks/usePermissions';
import AddPosTerminal from '../_components/AddPosTerminal';
import EditPosTerminal from '../_components/EditPosTerminal';
import DeleteConfirm from '../_components/DeleteConfirm';
import { type PosTerminal } from '@/hooks/pos/usePosTerminals';
import { useUpdatePosTerminal } from '@/hooks/pos/usePosTerminals';
import { useDebounce } from '@/hooks/useDebounce';
import Pagination from '@/components/ui/pagination';
import StationSlaPanel from '@/components/pos/StationSlaPanel';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtMoney(n: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(n);
}
function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' });
}
function ageMinutes(iso: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
}

const STATUS_STYLE: Record<string, string> = {
  PENDING: 'bg-amber-500/15 text-amber-400',
  PREPARING: 'bg-blue-500/15  text-blue-400',
  READY: 'bg-violet-500/15 text-violet-400',
  DELIVERED: 'bg-emerald-500/15 text-emerald-400',
  CANCELLED: 'bg-red-500/15   text-red-400',
};

const TERMINAL_STATUS_STYLE: Record<string, string> = {
  Online: 'bg-emerald-500/15 text-emerald-400',
  Offline: 'bg-red-500/15    text-red-400',
};

type PayMethod = 'CASH' | 'CARD' | 'TRANSFER';

function ContinuePaymentModal({
  order,
  onClose,
}: {
  order: ApiOrder;
  onClose: () => void;
}) {
  const [method, setMethod] = useState<PayMethod>('CASH');
  const [cash, setCash] = useState('');
  const deliverOrder = useDeliverOrder();
  const payOrder = usePayOrderById();
  const total = Number(order.total);
  const change = method === 'CASH' && Number(cash) >= total ? Number(cash) - total : 0;

  const handleConfirm = async () => {
    if (order.status === 'READY') {
      await deliverOrder.mutateAsync({ orderId: order.id });
    }
    await payOrder.mutateAsync({
      orderId: order.id,
      method,
      amountTendered: method === 'CASH' && cash ? Number(cash) : undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-[#1e2536] bg-[#161b27] p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Continue Payment</h2>
            <p className="text-xs text-slate-500 mt-1">{order.orderNo}</p>
            {order.status === 'READY' && (
              <p className="text-[11px] text-amber-400 mt-1">
                This will mark the order delivered before recording payment.
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="mb-5 rounded-xl bg-[#0f1117] p-4">
          <div className="flex justify-between text-sm text-slate-400">
            <span>{order.tableNo ?? order.roomNo ?? order.posTerminal?.name ?? 'Walk-in order'}</span>
            <span>{order.items.length} items</span>
          </div>
          <div className="mt-2 flex justify-between text-xl font-bold">
            <span className="text-white">Total</span>
            <span className="text-emerald-400">{fmtMoney(total)}</span>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-3 gap-2">
          {(['CASH', 'CARD', 'TRANSFER'] as PayMethod[]).map((value) => (
            <button
              key={value}
              onClick={() => setMethod(value)}
              className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-all ${
                method === value
                  ? 'border-blue-500/40 bg-blue-600/20 text-blue-300'
                  : 'border-[#1e2536] bg-[#0f1117] text-slate-400 hover:text-slate-200'
              }`}
            >
              {value}
            </button>
          ))}
        </div>

        {method === 'CASH' && (
          <div className="mb-4 space-y-2">
            <label className="block text-xs uppercase tracking-wider text-slate-500">
              Cash Tendered
            </label>
            <input
              type="number"
              value={cash}
              onChange={(e) => setCash(e.target.value)}
              placeholder="0"
              className="w-full rounded-lg border border-[#1e2536] bg-[#0f1117] px-3 py-3 text-center text-2xl font-bold text-white outline-none transition-colors focus:border-emerald-500"
            />
            {change > 0 && (
              <div className="flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5">
                <span className="text-sm font-medium text-emerald-400">Change</span>
                <span className="text-xl font-bold text-emerald-400">{fmtMoney(change)}</span>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-[#1e2536] px-4 py-2.5 text-sm text-slate-400 transition-colors hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={
              deliverOrder.isPending ||
              payOrder.isPending ||
              (method === 'CASH' && !!cash && Number(cash) < total)
            }
            className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
          >
            {deliverOrder.isPending || payOrder.isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <CheckCircle2 size={14} />
            )}
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Sales Tab ────────────────────────────────────────────────────────────────
function SalesTab() {
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().slice(0, 10));
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10));
  const [page, setPage] = useState(1);
  const [continueOrder, setContinueOrder] = useState<ApiOrder | null>(null);
  const [quickFilter, setQuickFilter] = useState<'all' | 'ready' | 'awaitingPayment'>('all');

  const debouncedSearch = useDebounce(search, 400);

  const { data, isLoading, isFetching } = usePosOrders({
    search: debouncedSearch || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    page,
    limit: 20,
  });

  const { data: zReport } = useZReport({ date: dateFrom });

  const orders = data?.orders ?? [];
  const filteredOrders = orders.filter((order) => {
    if (quickFilter === 'ready') return order.status === 'READY';
    if (quickFilter === 'awaitingPayment') {
      return (order.status === 'READY' || order.status === 'DELIVERED') && !order.isPaid && !order.reservationId;
    }
    return true;
  });
  const stats = data?.stats;
  const readyCount = orders.filter((order) => order.status === 'READY').length;
  const awaitingPaymentCount = orders.filter(
    (order) => (order.status === 'READY' || order.status === 'DELIVERED') && !order.isPaid && !order.reservationId,
  ).length;
  const deliverOrder = useDeliverOrder();

  const paymentMixTotal = Object.values(zReport?.byMethod ?? {}).reduce((s, v) => s + v, 0);

  return (
    <div className="space-y-5">
      {/* KPI strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5">
          <p className="text-xs text-slate-500 uppercase tracking-widest">Today's Revenue</p>
          <p className="text-2xl font-bold text-white mt-2">{fmtMoney(stats?.todayRevenue ?? 0)}</p>
          <p className="text-xs text-slate-500 mt-1">{stats?.todayCount ?? 0} orders completed</p>
        </div>
        <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5">
          <p className="text-xs text-slate-500 uppercase tracking-widest">Active Orders</p>
          <p className="text-2xl font-bold text-amber-400 mt-2">{stats?.activeOrders ?? 0}</p>
          <p className="text-xs text-slate-500 mt-1">Pending + preparing + ready</p>
        </div>
        <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5">
          <p className="text-xs text-slate-500 uppercase tracking-widest">Prep Readiness</p>
          <p className="text-2xl font-bold text-emerald-400 mt-2">{stats?.prepReadyOrders ?? 0}</p>
          <div className="flex items-center gap-2 text-xs text-slate-400 mt-3 flex-wrap">
            <span className="flex items-center gap-1 rounded-full bg-[#0f1117] px-2.5 py-1">
              <TriangleAlert size={12} className="text-rose-400" />
              {stats?.delayedOrders ?? 0} delayed
            </span>
            <span className="flex items-center gap-1 rounded-full bg-[#0f1117] px-2.5 py-1">
              <ChefHat size={12} className="text-orange-400" />
              {stats?.stationQueues.kitchen ?? 0} kitchen queued
            </span>
            <span className="flex items-center gap-1 rounded-full bg-[#0f1117] px-2.5 py-1">
              <Martini size={12} className="text-sky-400" />
              {stats?.stationQueues.bar ?? 0} bar queued
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#1e2536] bg-[#161b27] px-4 py-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
          <Link href="/kitchen" className="flex items-center gap-1.5 rounded-lg bg-[#0f1117] px-3 py-2 hover:text-white transition-colors">
            <ChefHat size={13} className="text-orange-400" />
            Kitchen board
          </Link>
          <Link href="/bar" className="flex items-center gap-1.5 rounded-lg bg-[#0f1117] px-3 py-2 hover:text-white transition-colors">
            <Martini size={13} className="text-sky-400" />
            Bar board
          </Link>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
          {Object.entries(stats?.paymentMix ?? {}).map(([method, amount]) => (
            <span key={method} className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              {method}{' '}
              {paymentMixTotal > 0 ? Math.round((Number(amount) / paymentMixTotal) * 100) : 0}%
            </span>
          ))}
          {!Object.keys(stats?.paymentMix ?? {}).length && <span>No sales yet today</span>}
        </div>
      </div>

      <StationSlaPanel />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 bg-[#161b27] border border-[#1e2536] rounded-lg px-3 py-2 flex-1 min-w-48">
          <Search size={14} className="text-slate-500 shrink-0" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Order no, table, room…"
            className="bg-transparent text-sm text-slate-300 placeholder:text-slate-600 outline-none flex-1"
          />
        </div>
        <div className="flex items-center gap-2 bg-[#161b27] border border-[#1e2536] rounded-lg px-3 py-2">
          {/* <CalendarDays size={12} className="text-slate-500" /> */}
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="bg-transparent text-slate-300 text-xs outline-none [color-scheme:dark]"
          />
          <span className="text-slate-600">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="bg-transparent text-slate-300 text-xs outline-none [color-scheme:dark]"
          />
        </div>
        {isFetching && !isLoading && <Loader2 size={14} className="animate-spin text-slate-500" />}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {[
          { key: 'all', label: 'All Sales', count: orders.length },
          { key: 'ready', label: 'Ready to Deliver', count: readyCount },
          { key: 'awaitingPayment', label: 'Awaiting Payment', count: awaitingPaymentCount },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => {
              setQuickFilter(item.key as 'all' | 'ready' | 'awaitingPayment');
              setPage(1);
            }}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              quickFilter === item.key
                ? 'border-blue-500/40 bg-blue-600/20 text-blue-300'
                : 'border-[#1e2536] bg-[#161b27] text-slate-400 hover:text-slate-200'
            }`}
          >
            {item.label} {item.count > 0 ? `(${item.count})` : ''}
          </button>
        ))}
      </div>

      {/* Orders table */}
      <div className="bg-[#161b27] border border-[#1e2536] rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 size={20} className="animate-spin text-slate-500" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="border-b border-[#1e2536] bg-[#0f1117]/50">
                <tr>
                  {[
                    'Order No',
                    'Date',
                    'Terminal',
                    'Table/Room',
                    'Items',
                    'Prep',
                    'Total',
                    'Method',
                    'Status',
                    'Action',
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-xs text-slate-500 uppercase tracking-wider font-medium px-4 py-3 text-left whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-[#1e2536] last:border-0 hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">{order.orderNo}</td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-slate-300">{fmt(order.createdAt)}</p>
                      <p className="text-[10px] text-slate-600">{fmtTime(order.createdAt)}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {order.posTerminal?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {order.tableNo ??
                        order.roomNo ??
                        (order.reservation ? `Res ${order.reservation.reservationNo}` : '—')}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">{order.items.length}</td>
                    <td className="px-4 py-3">
                      {order.prepSummary.totalRoutedItems > 0 ? (
                        <div className="space-y-1">
                          <p className="text-xs text-slate-300">
                            {order.prepSummary.ready + order.prepSummary.fulfilled}/
                            {order.prepSummary.totalRoutedItems} ready
                          </p>
                          <div className="flex flex-wrap gap-1 text-[10px]">
                            {order.prepSummary.queued > 0 && (
                              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-amber-400">
                                {order.prepSummary.queued} queued
                              </span>
                            )}
                            {order.prepSummary.inProgress > 0 && (
                              <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-blue-400">
                                {order.prepSummary.inProgress} preparing
                              </span>
                            )}
                            {ageMinutes(order.createdAt) >= 20 && !order.prepSummary.isPrepComplete && (
                              <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-rose-400">
                                delayed
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-600">No prep routing</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-200">
                      {fmtMoney(Number(order.total))}
                    </td>
                    <td className="px-4 py-3">
                      {order.paymentMethod ? (
                        <span className="text-xs text-slate-400">{order.paymentMethod}</span>
                      ) : order.reservationId ? (
                        <span className="text-xs text-violet-400">Room Charge</span>
                      ) : (
                        <span className="text-xs text-amber-400">Unpaid</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_STYLE[order.status] ?? 'bg-slate-500/15 text-slate-400'}`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {order.status === 'READY' && (
                          <button
                            onClick={() => deliverOrder.mutateAsync({ orderId: order.id })}
                            disabled={deliverOrder.isPending}
                            className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-violet-500 disabled:opacity-50"
                          >
                            Mark delivered
                          </button>
                        )}
                        {(order.status === 'READY' || order.status === 'DELIVERED') &&
                        !order.isPaid &&
                        !order.reservationId ? (
                          <button
                            onClick={() => setContinueOrder(order)}
                            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-500"
                          >
                            Continue payment
                          </button>
                        ) : order.status !== 'READY' ? (
                          <span className="text-xs text-slate-600">—</span>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredOrders.length === 0 && (
                  <tr>
                    <td colSpan={10} className="py-16 text-center">
                      <ShoppingCart size={28} className="text-slate-700 mx-auto mb-2" />
                      <p className="text-slate-500 text-sm">
                        {quickFilter === 'all'
                          ? 'No orders in this range'
                          : 'No orders match this quick filter'}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {data?.meta && filteredOrders.length > 0 && (
          <Pagination meta={data.meta} currentPage={page} handlePageChange={setPage} />
        )}
      </div>

      {continueOrder && (
        <ContinuePaymentModal order={continueOrder} onClose={() => setContinueOrder(null)} />
      )}
    </div>
  );
}

// ─── Reports Tab ──────────────────────────────────────────────────────────────
function ReportsTab() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const { data: report, isLoading } = useZReport({ date });

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <label className="text-sm text-slate-400">Report date:</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="bg-[#161b27] border border-[#1e2536] rounded-lg px-3 py-2 text-sm text-slate-300 outline-none [color-scheme:dark]"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 size={20} className="animate-spin text-slate-500" />
        </div>
      ) : report ? (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Total Orders', value: report.totalOrders, color: 'text-blue-400' },
              {
                label: 'Net Revenue',
                value: fmtMoney(report.netRevenue),
                color: 'text-emerald-400',
              },
              { label: 'Total Tax', value: fmtMoney(report.totalTax), color: 'text-slate-300' },
              {
                label: 'Discounts',
                value: fmtMoney(report.totalDiscount),
                color: 'text-amber-400',
              },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                className="bg-[#161b27] border border-[#1e2536] rounded-xl px-4 py-4"
              >
                <p className="text-xs text-slate-500 uppercase tracking-wider">{label}</p>
                <p className={`text-xl font-bold mt-1 ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Payment method breakdown */}
            <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5">
              <p className="text-sm font-semibold text-white mb-4">By Payment Method</p>
              {Object.keys(report.byMethod).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(report.byMethod).map(([method, amount]) => {
                    const pct =
                      report.netRevenue > 0 ? (Number(amount) / report.netRevenue) * 100 : 0;
                    return (
                      <div key={method}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-400">{method}</span>
                          <span className="text-slate-300 font-medium">
                            {fmtMoney(Number(amount))}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-[#0f1117] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-slate-600 text-sm text-center py-4">No sales data</p>
              )}
            </div>

            {/* Top items */}
            <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5">
              <p className="text-sm font-semibold text-white mb-4">Top Selling Items</p>
              {report.topItems.length > 0 ? (
                <div className="space-y-2">
                  {report.topItems.slice(0, 8).map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-600 w-4">{i + 1}.</span>
                        <span className="text-slate-300">{item.name}</span>
                        <span className="text-slate-600">×{item.qty}</span>
                      </div>
                      <span className="text-slate-400 font-medium">{fmtMoney(item.revenue)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-600 text-sm text-center py-4">No items sold</p>
              )}
            </div>
          </div>

          {/* Open tables */}
          {report.openTables.filter(Boolean).length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle size={16} className="text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-400">Open Tables</p>
                <p className="text-xs text-slate-400 mt-1">
                  {report.openTables.filter(Boolean).join(', ')} — unpaid orders still open
                </p>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="py-16 text-center">
          <BarChart2 size={28} className="text-slate-700 mx-auto mb-2" />
          <p className="text-slate-500 text-sm">No report data for this date</p>
        </div>
      )}
    </div>
  );
}

// ─── Inventory Snapshot Tab ───────────────────────────────────────────────────
function InventoryTab() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const { data: items = [], isLoading } = useInventoryItemOptions(debouncedSearch || undefined);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 bg-[#161b27] border border-[#1e2536] rounded-lg px-3 py-2 w-64">
          <Search size={13} className="text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items…"
            className="bg-transparent text-sm text-slate-300 placeholder:text-slate-600 outline-none flex-1"
          />
        </div>
        <Link
          href="/inventory"
          className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          Full inventory →
        </Link>
      </div>
      <div className="bg-[#161b27] border border-[#1e2536] rounded-xl overflow-hidden">
        <div className="grid grid-cols-5 bg-[#0f1117]/50 px-4 py-3 text-xs text-slate-500 uppercase tracking-wider font-medium">
          <span>Item</span>
          <span>SKU</span>
          <span>Category</span>
          <span>Stock</span>
          <span className="text-right">Min Stock</span>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 size={18} className="animate-spin text-slate-500" />
          </div>
        ) : items.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-slate-500 text-sm">No items found</p>
          </div>
        ) : (
          <div className="divide-y divide-[#1e2536]">
            {items.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-5 px-4 py-3 text-xs text-slate-300 hover:bg-white/[0.02] transition-colors"
              >
                <span className="font-medium text-slate-200">{item.name}</span>
                <span className="text-slate-500 font-mono">{item.sku}</span>
                <span className="text-slate-500">{item.category}</span>
                <span
                  className={
                    Number(item.quantity) <= 0
                      ? 'text-red-400 font-bold'
                      : Number(item.quantity) < 10
                        ? 'text-amber-400'
                        : ''
                  }
                >
                  {item.quantity} {item.unit}
                </span>
                <span className="text-right text-slate-600">—</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Config Tab ───────────────────────────────────────────────────────────────
function ConfigTab() {
  const [showAdd, setShowAdd] = useState(false);
  const [assignTarget, setAssignTarget] = useState<PosTerminal | null>(null);
  const [openEdit, setOpenEdit] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);

  const { data: terminalGroups = [], isLoading: groupsLoading } = usePosTerminalGroups();
  const { data: terminals = [], isLoading: terminalsLoading } = usePosTerminals();
  const updateTerminal = useUpdatePosTerminal(assignTarget?.id ?? '');

  const grouped = useMemo(() => {
    const map: Record<string, typeof terminals> = {};
    terminals.forEach((t) => {
      const key = t.terminalGroupName || 'Other';
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });
    return Object.entries(map).map(([label, items]) => ({ label, terminals: items }));
  }, [terminals]);

  const toggleStatus = async (terminal: PosTerminal) => {
    setAssignTarget(terminal);
    await updateTerminal.mutateAsync({
      status: terminal.status === 'Online' ? 'Offline' : 'Online',
    });
  };

  return (
    <>
      <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <SlidersHorizontal size={14} /> Terminal Configuration
          </h2>
          <button
            onClick={() => setShowAdd(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
          >
            Add Terminal
          </button>
        </div>

        {terminalsLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 size={18} className="animate-spin text-slate-500" />
          </div>
        ) : terminals.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#2b3348] bg-[#0f1117] px-4 py-10 text-center text-xs text-slate-500">
            No terminals yet. Click "Add Terminal" to get started.
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map((group) => (
              <div key={group.label}>
                <p className="text-xs text-slate-500 uppercase tracking-widest mb-3">
                  {group.label}
                </p>
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
                            onClick={() => toggleStatus(terminal)}
                            className={`text-[11px] px-2 py-0.5 rounded-full ${TERMINAL_STATUS_STYLE[terminal.status] ?? 'bg-slate-500/15 text-slate-400'}`}
                          >
                            {terminal.status}
                          </button>
                          <button
                            onClick={() => {
                              setAssignTarget(terminal);
                              setOpenDelete(true);
                            }}
                            className="text-[11px] px-2 py-0.5 rounded-full bg-white/5 hover:bg-red-500/10 text-red-400 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      <div className="mt-3 text-xs text-slate-400 space-y-1">
                        <div className="flex justify-between">
                          <span>Device</span>
                          <span className="text-slate-200">{terminal.device}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Staff</span>
                          <span className="text-slate-200">{terminal.staffName ?? '—'}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setAssignTarget(terminal);
                          setOpenEdit(true);
                        }}
                        className="mt-3 text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                      >
                        Manage <ArrowUpRight size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <DeleteConfirm
        isOpen={openDelete}
        terminal={assignTarget}
        onClose={() => {
          setOpenDelete(false);
          setAssignTarget(null);
        }}
      />
      <AddPosTerminal isOpen={showAdd} onClose={() => setShowAdd(false)} />
      <EditPosTerminal
        isOpen={openEdit}
        terminal={assignTarget}
        onClose={() => {
          setOpenEdit(false);
          setAssignTarget(null);
        }}
      />
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PosPage() {
  const { can } = usePermissions();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">POS / Store</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Sales overview, terminals, inventory and reports.
          </p>
        </div>
        <Link
          href="/pos/terminal"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
        >
          <ShoppingCart size={15} /> Launch Terminal
        </Link>
      </div>

      <Tabs defaultValue="sales" className="space-y-5 flex-col">
        <TabsList className="bg-[#161b27] border border-[#1e2536] rounded-xl p-1 justify-start flex-wrap gap-0.5">
          {[
            { value: 'sales', label: 'Sales' },
            { value: 'reports', label: 'Reports' },
            { value: 'inventory', label: 'Inventory' },
            ...(can('manage:pos') ? [{ value: 'config', label: 'Configuration' }] : []),
          ].map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="px-4 py-2 data-[state=active]:bg-blue-600/20 data-[state=active]:text-blue-400 data-[state=active]:border data-[state=active]:border-blue-500/20 text-slate-400 hover:!text-slate-200 rounded-lg text-sm font-medium transition-all"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="sales">
          {' '}
          <SalesTab />{' '}
        </TabsContent>
        <TabsContent value="reports">
          {' '}
          <ReportsTab />{' '}
        </TabsContent>
        <TabsContent value="inventory">
          <InventoryTab />
        </TabsContent>
        {can('manage:pos') && (
          <TabsContent value="config">
            <ConfigTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
