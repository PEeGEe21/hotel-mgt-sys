'use client';

import {
  AlertCircle,
  BedDouble,
  Boxes,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Clock,
  DollarSign,
  DoorOpen,
  Loader2,
  ShoppingCart,
  Sparkles,
  Users,
  UtensilsCrossed,
  BadgeCheck,
  TriangleAlert,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { formatCompactMoney, formatMoney } from '@/utils/report-utils';
import { useDashboardWidgetData } from '@/hooks/dashboard/useDashboardWidgetData';

const statPill = 'rounded-full px-2 py-0.5 text-[11px] font-medium';
const muted = 'text-slate-500';

function WidgetFrame({
  title,
  icon,
  action,
  children,
}: {
  title: string;
  icon?: ReactNode;
  action?: { label: string; href: string };
  children: ReactNode;
}) {
  return (
    <div className="h-full rounded-xl border border-[#1e2536] bg-[#161b27] p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-white">
          {icon}
          <h2 className="text-sm font-semibold">{title}</h2>
        </div>
        {action ? (
          <a href={action.href} className="text-xs text-blue-400 hover:text-blue-300">
            {action.label}
          </a>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function WidgetState({
  widgetId,
  children,
}: {
  widgetId: string;
  children: (data: any) => ReactNode;
}) {
  const { data, isLoading, error } = useDashboardWidgetData(widgetId);

  if (isLoading) {
    return (
      <WidgetSkeleton />
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[160px] items-center justify-center text-sm text-rose-400">
        Unable to load this widget.
      </div>
    );
  }

  return <>{children(data)}</>;
}

function WidgetSkeleton() {
  return (
    <div className="min-h-[160px] animate-pulse space-y-3">
      <div className="h-6 w-24 rounded bg-[#1e2536]" />
      <div className="h-10 w-32 rounded bg-[#1e2536]" />
      <div className="space-y-2">
        <div className="h-3 w-full rounded bg-[#1e2536]" />
        <div className="h-3 w-5/6 rounded bg-[#1e2536]" />
        <div className="h-3 w-2/3 rounded bg-[#1e2536]" />
      </div>
    </div>
  );
}

const statusPills: Record<string, string> = {
  OCCUPIED: 'bg-emerald-500/15 text-emerald-400',
  AVAILABLE: 'bg-slate-500/15 text-slate-300',
  HOUSEKEEPING: 'bg-amber-500/15 text-amber-400',
  MAINTENANCE: 'bg-rose-500/15 text-rose-400',
  OUT_OF_ORDER: 'bg-rose-500/15 text-rose-400',
  RESERVED: 'bg-blue-500/15 text-blue-400',
  'Check-in': 'bg-blue-500/15 text-blue-400',
  'Check-out': 'bg-emerald-500/15 text-emerald-400',
  PENDING: 'bg-amber-500/15 text-amber-400',
  IN_PROGRESS: 'bg-blue-500/15 text-blue-400',
  DONE: 'bg-emerald-500/15 text-emerald-400',
  READY: 'bg-emerald-500/15 text-emerald-400',
  PREPARING: 'bg-amber-500/15 text-amber-400',
  HIGH: 'bg-orange-500/15 text-orange-400',
  URGENT: 'bg-rose-500/15 text-rose-400',
  NORMAL: 'bg-slate-500/15 text-slate-300',
  Pending: 'bg-amber-500/15 text-amber-400',
  'On shift': 'bg-emerald-500/15 text-emerald-400',
  'Clocked out': 'bg-slate-500/15 text-slate-300',
  'Not clocked in': 'bg-amber-500/15 text-amber-400',
  Unavailable: 'bg-slate-500/15 text-slate-300',
};

function fmtTime(value?: string | Date | null) {
  if (!value) return '--';
  return new Date(value).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' });
}

export function OccupancyOverviewWidget() {
  return (
    <WidgetFrame
      title="Occupancy Overview"
      icon={<BedDouble size={16} className="text-slate-400" />}
    >
      <WidgetState widgetId="occupancy_overview">
        {(data) => (
          <>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-bold text-white">{data.rateLabel}</p>
                <p className={`text-xs ${muted}`}>
                  {data.occupied} of {data.total} rooms occupied
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-300">{data.available} available</p>
                <p className={`text-xs ${muted}`}>Live room status</p>
              </div>
            </div>
            <div className="mt-4 overflow-hidden rounded-full bg-slate-800">
              <div className="h-2 bg-emerald-500" style={{ width: `${data.rate}%` }} />
            </div>
          </>
        )}
      </WidgetState>
    </WidgetFrame>
  );
}

export function TodaysCheckinsOutsWidget() {
  return (
    <WidgetFrame
      title="Today's Check-ins/Outs"
      icon={<ClipboardList size={16} className="text-slate-400" />}
      action={{ label: 'View reservations →', href: '/reservations' }}
    >
      <WidgetState widgetId="todays_checkins_outs">
        {(data) =>
          data.items?.length ? (
            <div className="space-y-3">
              {data.items.map((item: any) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between border-b border-[#1e2536] pb-2 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-200">{item.guestName}</p>
                    <p className={`text-xs ${muted}`}>
                      Room {item.roomNumber} · {fmtTime(item.time)}
                    </p>
                  </div>
                  <span className={`${statPill} ${statusPills[item.type]}`}>{item.type}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No check-ins or check-outs scheduled today.</p>
          )
        }
      </WidgetState>
    </WidgetFrame>
  );
}

export function RoomStatusGridWidget() {
  return (
    <WidgetFrame title="Room Readiness" icon={<DoorOpen size={16} className="text-slate-400" />}>
      <WidgetState widgetId="room_status_grid">
        {(data) => {
          const summary = [
            { label: 'Available', key: 'AVAILABLE' },
            { label: 'Occupied', key: 'OCCUPIED' },
            { label: 'Housekeeping', key: 'HOUSEKEEPING' },
            { label: 'Maintenance', key: 'MAINTENANCE' },
          ];

          return (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {summary.map((item) => (
                  <div key={item.key} className="rounded-lg border border-[#1e2536] bg-[#111623] p-3">
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">{item.label}</p>
                    <p className="mt-1 text-lg font-semibold text-white">{data.stats?.[item.key] ?? 0}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {data.rooms?.map((room: any) => (
                  <div key={room.id} className="rounded-lg border border-[#1e2536] bg-[#111623] p-2">
                    <p className="text-xs text-slate-400">Room {room.number}</p>
                    <span
                      className={`${statPill} ${statusPills[room.status] ?? 'bg-slate-500/15 text-slate-300'}`}
                    >
                      {room.status.replaceAll('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        }}
      </WidgetState>
    </WidgetFrame>
  );
}

export function RevenueTodayWidget() {
  return (
    <WidgetFrame title="Revenue Today" icon={<DollarSign size={16} className="text-slate-400" />}>
      <WidgetState widgetId="revenue_today">
        {(data) => (
          <>
            <p className="text-3xl font-bold text-white">{formatMoney(data.total ?? 0)}</p>
            <p className={`text-xs ${muted}`}>{data.transactionCount ?? 0} payments recorded</p>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-emerald-400">
                {data.changePct >= 0 ? '+' : ''}
                {data.changePct}% vs yesterday
              </span>
              <span className={muted}>Live payments</span>
            </div>
          </>
        )}
      </WidgetState>
    </WidgetFrame>
  );
}

export function OutstandingFoliosWidget() {
  return (
    <WidgetFrame
      title="Outstanding Folios"
      icon={<ClipboardCheck size={16} className="text-slate-400" />}
      action={{ label: 'View finance →', href: '/finance/overview' }}
    >
      <WidgetState widgetId="outstanding_folios">
        {(data) =>
          data.items?.length ? (
            <div className="space-y-3">
              {data.items.map((item: any) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between border-b border-[#1e2536] pb-2 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-200">{item.guestName}</p>
                    <p className={`text-xs ${muted}`}>
                      Room {item.roomNumber} · Due {item.dueLabel}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-white">
                    {formatMoney(item.amount)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No outstanding folios right now.</p>
          )
        }
      </WidgetState>
    </WidgetFrame>
  );
}

export function PosSalesTodayWidget() {
  return (
    <WidgetFrame
      title="POS Sales Today"
      icon={<ShoppingCart size={16} className="text-slate-400" />}
    >
      <WidgetState widgetId="pos_sales_today">
        {(data) => (
          <>
            <p className="text-3xl font-bold text-white">{formatMoney(data.total ?? 0)}</p>
            <p className={`text-xs ${muted}`}>{data.orderCount ?? 0} paid orders today</p>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-emerald-400">
                {data.changePct >= 0 ? '+' : ''}
                {data.changePct}% vs yesterday
              </span>
              <span className={muted}>Avg {formatCompactMoney(data.averageOrderValue ?? 0)}</span>
            </div>
          </>
        )}
      </WidgetState>
    </WidgetFrame>
  );
}

export function ActivePosOrdersWidget() {
  return (
    <WidgetFrame
      title="Active POS Orders"
      icon={<UtensilsCrossed size={16} className="text-slate-400" />}
      action={{ label: 'Open POS →', href: '/pos' }}
    >
      <WidgetState widgetId="active_pos_orders">
        {(data) =>
          data.items?.length ? (
            <div className="space-y-3">
              {data.items.map((item: any) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between border-b border-[#1e2536] pb-2 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-200">{item.label}</p>
                    <p className={`text-xs ${muted}`}>
                      {item.itemCount} items · {formatMoney(item.total)}
                    </p>
                  </div>
                  <span className={`${statPill} ${statusPills[item.status]}`}>{item.status}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No active POS orders.</p>
          )
        }
      </WidgetState>
    </WidgetFrame>
  );
}

export function LowStockAlertsWidget() {
  return (
    <WidgetFrame
      title="Low Stock Alerts"
      icon={<TriangleAlert size={16} className="text-slate-400" />}
      action={{ label: 'Inventory →', href: '/inventory' }}
    >
      <WidgetState widgetId="low_stock_alerts">
        {(data) =>
          data.items?.length ? (
            <div className="space-y-2">
              {data.items.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <span className="text-slate-200">{item.name}</span>
                  <span className="text-amber-400">
                    {item.remaining} {item.unit}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No low stock alerts.</p>
          )
        }
      </WidgetState>
    </WidgetFrame>
  );
}

export function HousekeepingQueueWidget() {
  return (
    <WidgetFrame
      title="Housekeeping Queue"
      icon={<Sparkles size={16} className="text-slate-400" />}
      action={{ label: 'Housekeeping →', href: '/housekeeping/tasks' }}
    >
      <WidgetState widgetId="housekeeping_queue">
        {(data) =>
          data.items?.length ? (
            <div className="space-y-3">
              {data.items.map((item: any) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between border-b border-[#1e2536] pb-2 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-200">
                      Room {item.roomNumber} · {item.taskType}
                    </p>
                    <span className={`${statPill} ${statusPills[item.priority]}`}>
                      {item.priority}
                    </span>
                  </div>
                  <span className={`text-xs ${muted}`}>{item.dueLabel}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No housekeeping tasks in queue.</p>
          )
        }
      </WidgetState>
    </WidgetFrame>
  );
}

export function StaffOnDutyWidget() {
  return (
    <WidgetFrame
      title="Staff On Duty"
      icon={<Users size={16} className="text-slate-400" />}
      action={{ label: 'Attendance →', href: '/attendance' }}
    >
      <WidgetState widgetId="staff_on_duty">
        {(data) =>
          data.items?.length ? (
            <div className="space-y-2">
              {data.items.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="text-slate-200">{item.name}</p>
                    <p className={`text-xs ${muted}`}>{item.position || item.department}</p>
                  </div>
                  <span className={`text-xs ${muted}`}>{fmtTime(item.clockedInAt)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No staff clocked in yet.</p>
          )
        }
      </WidgetState>
    </WidgetFrame>
  );
}

export function PendingApprovalsWidget() {
  return (
    <WidgetFrame
      title="Pending Approvals"
      icon={<BadgeCheck size={16} className="text-slate-400" />}
      action={{ label: 'HR →', href: '/hr' }}
    >
      <WidgetState widgetId="pending_approvals">
        {(data) =>
          data.items?.length ? (
            <div className="space-y-2">
              {data.items.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <span className="text-slate-200">{item.label}</span>
                  <span className={`${statPill} ${statusPills[item.status]}`}>{item.status}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No pending approvals.</p>
          )
        }
      </WidgetState>
    </WidgetFrame>
  );
}

export function MyAttendanceTodayWidget() {
  return (
    <WidgetFrame
      title="My Attendance Today"
      icon={<Clock size={16} className="text-slate-400" />}
      action={{ label: 'Clock →', href: '/clock' }}
    >
      <WidgetState widgetId="my_attendance_today">
        {(data) => (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className={muted}>Clock in</span>
              <span className="font-medium text-white">{fmtTime(data.clockIn)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className={muted}>Clock out</span>
              <span className="font-medium text-white">{fmtTime(data.clockOut)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className={muted}>Status</span>
              <span
                className={`${statPill} ${statusPills[data.status] ?? 'bg-slate-500/15 text-slate-300'}`}
              >
                {data.status}
              </span>
            </div>
          </div>
        )}
      </WidgetState>
    </WidgetFrame>
  );
}

export function MyTasksTodayWidget() {
  return (
    <WidgetFrame title="My Tasks Today" icon={<Boxes size={16} className="text-slate-400" />}>
      <WidgetState widgetId="my_tasks_today">
        {(data) =>
          data.items?.length ? (
            <div className="space-y-3">
              {data.items.map((item: any) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between border-b border-[#1e2536] pb-2 last:border-0"
                >
                  <span className="text-sm font-medium text-slate-200">{item.label}</span>
                  <span className={`${statPill} ${statusPills[item.status]}`}>{item.status}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2 text-sm text-slate-400">
              <p>No assigned tasks right now.</p>
              <p className="text-xs text-slate-500">
                If you&apos;re on shift, check the housekeeping queue for unassigned or newly created work.
              </p>
            </div>
          )
        }
      </WidgetState>
    </WidgetFrame>
  );
}

export const dashboardWidgets = {
  occupancy_overview: OccupancyOverviewWidget,
  todays_checkins_outs: TodaysCheckinsOutsWidget,
  room_status_grid: RoomStatusGridWidget,
  revenue_today: RevenueTodayWidget,
  outstanding_folios: OutstandingFoliosWidget,
  pos_sales_today: PosSalesTodayWidget,
  active_pos_orders: ActivePosOrdersWidget,
  low_stock_alerts: LowStockAlertsWidget,
  housekeeping_queue: HousekeepingQueueWidget,
  staff_on_duty: StaffOnDutyWidget,
  my_attendance_today: MyAttendanceTodayWidget,
  my_tasks_today: MyTasksTodayWidget,
} as const;
