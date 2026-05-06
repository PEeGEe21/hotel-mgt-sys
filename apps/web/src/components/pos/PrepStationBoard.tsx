'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChefHat,
  Martini,
  Clock3,
  TimerReset,
  BellRing,
  ReceiptText,
  BedDouble,
  ShoppingBag,
  Loader2,
  LogOut,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Play,
  Undo2,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { usePermissions } from '@/hooks/usePermissions';
import { usePrepBoard, usePrepRealtime, useUpdatePrepItemStatus, type PrepStation, type PrepStatus, type PrepBoardTicketItem } from '@/hooks/pos/usePrepBoard';

const BOARD_CONFIG = {
  KITCHEN: {
    label: 'Kitchen Board',
    noun: 'Kitchen',
    icon: ChefHat,
    accent: 'from-orange-500 via-amber-500 to-yellow-400',
    glow: 'shadow-[0_0_0_1px_rgba(251,146,60,0.2),0_24px_80px_rgba(251,146,60,0.16)]',
    panel: 'border-orange-500/20 bg-[radial-gradient(circle_at_top_left,rgba(251,146,60,0.16),transparent_40%),linear-gradient(180deg,#141821_0%,#0b0f16_100%)]',
  },
  BAR: {
    label: 'Bar Board',
    noun: 'Bar',
    icon: Martini,
    accent: 'from-cyan-400 via-sky-500 to-blue-500',
    glow: 'shadow-[0_0_0_1px_rgba(56,189,248,0.2),0_24px_80px_rgba(14,165,233,0.16)]',
    panel: 'border-sky-500/20 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.16),transparent_40%),linear-gradient(180deg,#141821_0%,#0b0f16_100%)]',
  },
} as const;

const ORDER_TYPE_LABELS: Record<string, string> = {
  DINE_IN: 'Dine in',
  ROOM_SERVICE: 'Room service',
  TAKEAWAY: 'Takeaway',
  RETAIL: 'Retail',
};

const STATUS_COLUMNS: { status: PrepStatus; label: string; empty: string }[] = [
  { status: 'QUEUED', label: 'Queued', empty: 'No new tickets waiting' },
  { status: 'IN_PROGRESS', label: 'Preparing', empty: 'Nothing is being worked right now' },
  { status: 'READY', label: 'Ready', empty: 'No tickets are waiting for handoff' },
];

function fmtTime(value: string) {
  return new Date(value).toLocaleTimeString('en-NG', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function routeContext(ticket: {
  tableNo: string | null;
  roomNo: string | null;
  type: string;
}) {
  if (ticket.roomNo) return { icon: BedDouble, label: `Room ${ticket.roomNo}` };
  if (ticket.tableNo) return { icon: ReceiptText, label: `Table ${ticket.tableNo}` };
  return { icon: ShoppingBag, label: ORDER_TYPE_LABELS[ticket.type] ?? ticket.type };
}

function statusTone(status: PrepStatus) {
  if (status === 'QUEUED') return 'border-amber-500/20 bg-amber-500/10 text-amber-300';
  if (status === 'IN_PROGRESS') return 'border-sky-500/20 bg-sky-500/10 text-sky-300';
  return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300';
}

function urgencyTone(urgency: 'normal' | 'warning' | 'critical') {
  if (urgency === 'critical') return 'text-red-300 border-red-500/30 bg-red-500/10';
  if (urgency === 'warning') return 'text-amber-300 border-amber-500/30 bg-amber-500/10';
  return 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10';
}

function nextActionFor(status: PrepStatus) {
  if (status === 'QUEUED') return { label: 'Start', icon: Play, next: 'IN_PROGRESS' as PrepStatus };
  if (status === 'IN_PROGRESS') {
    return { label: 'Mark Ready', icon: CheckCircle2, next: 'READY' as PrepStatus };
  }
  return { label: 'Fulfilled', icon: BellRing, next: 'FULFILLED' as PrepStatus };
}

function previousActionFor(status: PrepStatus) {
  if (status === 'IN_PROGRESS') return { label: 'Back to Queue', next: 'QUEUED' as PrepStatus };
  if (status === 'READY') return { label: 'Back to Preparing', next: 'IN_PROGRESS' as PrepStatus };
  return null;
}

function TicketItemRow({
  orderId,
  item,
}: {
  orderId: string;
  item: PrepBoardTicketItem;
}) {
  const updatePrepItemStatus = useUpdatePrepItemStatus(orderId, item.id);
  const nextAction = nextActionFor(item.prepStatus);
  const previousAction = previousActionFor(item.prepStatus);

  if (item.prepStatus === 'FULFILLED' || item.prepStatus === 'CANCELLED') return null;

  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">
            {item.quantity}x {item.name}
          </p>
          {item.note && <p className="mt-1 text-xs text-slate-400">{item.note}</p>}
        </div>
        <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${statusTone(item.prepStatus)}`}>
          {item.prepStatus.replace('_', ' ')}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {previousAction && (
          <button
            onClick={() => updatePrepItemStatus.mutate(previousAction.next)}
            disabled={updatePrepItemStatus.isPending}
            className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-slate-200 transition-colors hover:bg-white/[0.08] disabled:opacity-50"
          >
            <Undo2 size={12} />
            {previousAction.label}
          </button>
        )}
        <button
          onClick={() => updatePrepItemStatus.mutate(nextAction.next)}
          disabled={updatePrepItemStatus.isPending}
          className="inline-flex items-center gap-1 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-slate-200 disabled:opacity-50"
        >
          {updatePrepItemStatus.isPending ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <nextAction.icon size={12} />
          )}
          {nextAction.label}
        </button>
      </div>
    </div>
  );
}

export default function PrepStationBoard({
  station,
}: {
  station: Exclude<PrepStation, 'NONE'>;
}) {
  const router = useRouter();
  const { isAuthenticated, user, logout } = useAuthStore();
  const { ready, can } = usePermissions();
  const [now, setNow] = useState(() => Date.now());

  const permission =
    station === 'KITCHEN' ? 'view:pos-kitchen-board' : 'view:pos-bar-board';
  const config = BOARD_CONFIG[station];
  const Icon = config.icon;

  const { data, isLoading, isFetching, refetch } = usePrepBoard(station);
  usePrepRealtime(station);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 15000);
    return () => window.clearInterval(timer);
  }, []);

  const groupedTickets = useMemo(() => {
    const tickets = data?.tickets ?? [];
    return STATUS_COLUMNS.map((column) => ({
      ...column,
      tickets: tickets.filter((ticket) =>
        ticket.items.some((item) => item.prepStatus === column.status),
      ),
    }));
  }, [data]);

  const headline = useMemo(() => {
    const current = new Date(now);
    return current.toLocaleString('en-US', {
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
      month: 'short',
      day: 'numeric',
    });
  }, [now]);

  if (!ready || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070b12] text-slate-300">
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4">
          <Loader2 size={18} className="animate-spin" />
          Loading {config.noun.toLowerCase()} board...
        </div>
      </div>
    );
  }

  if (!can(permission as any)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070b12] p-6 text-slate-200">
        <div className="max-w-md rounded-3xl border border-red-500/20 bg-red-500/10 p-8 text-center">
          <AlertTriangle className="mx-auto mb-4 text-red-300" size={28} />
          <h1 className="text-xl font-bold text-white">Access denied</h1>
          <p className="mt-2 text-sm text-slate-300">
            This account does not have access to the {config.noun.toLowerCase()} board.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070b12] text-white">
      <div className={`mx-auto min-h-screen max-w-[1800px] px-4 py-4 md:px-6 ${config.glow}`}>
        <div className={`overflow-hidden rounded-[28px] border ${config.panel}`}>
          <div className="border-b border-white/10 bg-black/20 px-5 py-5 backdrop-blur md:px-7">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-start gap-4">
                <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${config.accent} text-slate-950 shadow-lg`}>
                  <Icon size={28} />
                </div>
                <div>
                  <h1 className="text-2xl font-black tracking-tight md:text-3xl">{config.label}</h1>
                  <p className="mt-1 text-sm text-slate-300">
                    Live station view for active tickets and item-by-item prep flow.
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
                      {headline}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
                      Signed in as {user?.name ?? user?.email}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => refetch()}
                  disabled={isFetching}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-slate-100 transition-colors hover:bg-white/[0.08] disabled:opacity-50"
                >
                  {isFetching ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
                  Refresh
                </button>
                <button
                  onClick={() => logout()}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-slate-100 transition-colors hover:bg-white/[0.08]"
                >
                  <LogOut size={15} />
                  Sign out
                </button>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Tickets</p>
                <p className="mt-2 text-3xl font-black">{data?.summary.totalTickets ?? 0}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Queued Items</p>
                <p className="mt-2 text-3xl font-black text-amber-300">{data?.summary.counts.queued ?? 0}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Preparing</p>
                <p className="mt-2 text-3xl font-black text-sky-300">{data?.summary.counts.inProgress ?? 0}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Ready</p>
                <p className="mt-2 text-3xl font-black text-emerald-300">{data?.summary.counts.ready ?? 0}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Delayed</p>
                <p className="mt-2 text-3xl font-black text-red-300">{data?.summary.ageBuckets.critical ?? 0}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 p-4 xl:grid-cols-3 xl:p-5">
            {STATUS_COLUMNS.map((column) => {
              const tickets = groupedTickets.find((entry) => entry.status === column.status)?.tickets ?? [];
              return (
                <section
                  key={column.status}
                  className="rounded-[24px] border border-white/8 bg-black/20 p-4 backdrop-blur"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-white">{column.label}</h2>
                      <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
                        {tickets.length} tickets
                      </p>
                    </div>
                    <div className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusTone(column.status)}`}>
                      {column.label}
                    </div>
                  </div>

                  {isLoading ? (
                    <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-white/10 text-slate-400">
                      <Loader2 size={16} className="mr-2 animate-spin" />
                      Loading tickets...
                    </div>
                  ) : tickets.length === 0 ? (
                    <div className="flex h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] text-center text-slate-500">
                      <TimerReset size={18} className="mb-3" />
                      <p className="text-sm font-medium text-slate-300">{column.empty}</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {tickets.map((ticket) => {
                        const context = routeContext(ticket);
                        const ContextIcon = context.icon;
                        const visibleItems = ticket.items.filter((item) => item.prepStatus === column.status);

                        return (
                          <article
                            key={`${column.status}-${ticket.orderId}`}
                            className="rounded-[24px] border border-white/10 bg-[#0c1220]/90 p-4 shadow-[0_20px_40px_rgba(0,0,0,0.25)]"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="rounded-full bg-white px-3 py-1 text-xs font-black tracking-[0.25em] text-slate-950">
                                    {ticket.orderNo}
                                  </span>
                                  <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${urgencyTone(ticket.urgency)}`}>
                                    {ticket.ageMinutes} min
                                  </span>
                                </div>
                                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-300">
                                  <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
                                    <ContextIcon size={13} />
                                    {context.label}
                                  </span>
                                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
                                    {ORDER_TYPE_LABELS[ticket.type] ?? ticket.type}
                                  </span>
                                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
                                    Entered {fmtTime(ticket.createdAt)}
                                  </span>
                                </div>
                              </div>

                              <div className="text-right text-xs text-slate-400">
                                <p className="font-semibold text-slate-200">
                                  {ticket.staff
                                    ? `${ticket.staff.firstName} ${ticket.staff.lastName}`
                                    : 'Unassigned'}
                                </p>
                                <p className="mt-1">Prep complete: {ticket.prepSummary.ready + ticket.prepSummary.fulfilled}/{ticket.prepSummary.totalRoutedItems}</p>
                              </div>
                            </div>

                            {(ticket.note || visibleItems.some((item) => item.note)) && (
                              <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
                                {ticket.note ? ticket.note : visibleItems.find((item) => item.note)?.note}
                              </div>
                            )}

                            <div className="mt-4 space-y-3">
                              {visibleItems.map((item) => (
                                <TicketItemRow key={item.id} orderId={ticket.orderId} item={item} />
                              ))}
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
