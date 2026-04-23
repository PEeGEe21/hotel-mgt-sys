'use client';

import {
  BedDouble,
  ClipboardList,
  DollarSign,
  DoorOpen,
  AlertTriangle,
  ShoppingCart,
  UtensilsCrossed,
  Sparkles,
  Users,
  BadgeCheck,
  Clock,
  ClipboardCheck,
  Boxes,
} from 'lucide-react';
import { Fragment } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import type { Permission } from '@/lib/permissions';

const dateLabel = new Date().toLocaleDateString('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
});

type WidgetSize = 'wide' | 'compact';

type WidgetDefinition = {
  id: string;
  title: string;
  permission: Permission;
  size: WidgetSize;
  render: () => JSX.Element;
};

const statPill = 'text-[11px] px-2 py-0.5 rounded-full font-medium';
const muted = 'text-slate-500';

function WidgetCard({
  title,
  size,
  icon: Icon,
  children,
  action,
}: {
  title: string;
  size: WidgetSize;
  icon?: typeof BedDouble;
  children: React.ReactNode;
  action?: { label: string; href: string };
}) {
  const sizeClass =
    size === 'wide'
      ? 'lg:col-span-2 xl:col-span-3'
      : 'lg:col-span-1 xl:col-span-1';

  return (
    <div className={`bg-[#161b27] border border-[#1e2536] rounded-xl p-5 ${sizeClass}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-white">
          {Icon ? <Icon size={16} className="text-slate-400" /> : null}
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

const occupancyStats = {
  rate: '78%',
  occupied: 94,
  available: 26,
  total: 120,
};

const checkInsOuts = [
  { name: 'Amara Diallo', room: '112', type: 'Check-in', time: '10:00' },
  { name: 'Sofia Martins', room: '401', type: 'Check-in', time: '12:30' },
  { name: 'Chen Wei', room: '215', type: 'Check-out', time: '13:15' },
  { name: 'James Okafor', room: '304', type: 'Check-out', time: '15:00' },
];

const roomStatus = [
  { room: '101', status: 'Occupied' },
  { room: '102', status: 'Vacant' },
  { room: '103', status: 'Cleaning' },
  { room: '104', status: 'Occupied' },
  { room: '201', status: 'Vacant' },
  { room: '202', status: 'Occupied' },
  { room: '203', status: 'Out of Order' },
  { room: '204', status: 'Cleaning' },
  { room: '301', status: 'Occupied' },
  { room: '302', status: 'Vacant' },
  { room: '303', status: 'Cleaning' },
  { room: '304', status: 'Occupied' },
];

const outstandingFolios = [
  { guest: 'James Okafor', room: '304', amount: '$520', due: 'Today' },
  { guest: 'Amara Diallo', room: '112', amount: '$180', due: 'Tomorrow' },
  { guest: 'Chen Wei', room: '215', amount: '$310', due: 'Today' },
  { guest: 'Sofia Martins', room: '401', amount: '$1,240', due: 'Today' },
];

const posOrders = [
  { table: 'Bar 2', items: 3, total: '$42', status: 'Preparing' },
  { table: 'Pool 1', items: 2, total: '$28', status: 'Ready' },
  { table: 'Bar 4', items: 5, total: '$64', status: 'Preparing' },
];

const lowStock = [
  { item: 'Sparkling Water', remaining: 6, unit: 'bottles' },
  { item: 'House Wine', remaining: 4, unit: 'bottles' },
  { item: 'Bath Towels', remaining: 12, unit: 'units' },
];

const housekeepingQueue = [
  { room: '101', task: 'Cleaning', priority: 'High' },
  { room: '203', task: 'Turndown', priority: 'Normal' },
  { room: '315', task: 'Maintenance', priority: 'Urgent' },
  { room: '402', task: 'Inspection', priority: 'Normal' },
];

const staffOnDuty = [
  { name: 'Mariam Bello', role: 'Front Desk', shift: '07:00 - 15:00' },
  { name: 'Diego Cruz', role: 'Housekeeping', shift: '08:00 - 16:00' },
  { name: 'Nia Harper', role: 'Bartender', shift: '12:00 - 20:00' },
];

const approvals = [
  { item: 'Leave request · J. Okafor', status: 'Pending' },
  { item: 'Expense claim · Linen order', status: 'Review' },
  { item: 'New hire · Housekeeping', status: 'Pending' },
];

const myTasks = [
  { task: 'Restock minibar · 215', status: 'In progress' },
  { task: 'Prepare room 308', status: 'Pending' },
  { task: 'Laundry pickup', status: 'Done' },
];

const statusPills: Record<string, string> = {
  Occupied: 'bg-emerald-500/15 text-emerald-400',
  Vacant: 'bg-slate-500/15 text-slate-300',
  Cleaning: 'bg-amber-500/15 text-amber-400',
  'Out of Order': 'bg-rose-500/15 text-rose-400',
  Preparing: 'bg-amber-500/15 text-amber-400',
  Ready: 'bg-emerald-500/15 text-emerald-400',
  High: 'bg-orange-500/15 text-orange-400',
  Urgent: 'bg-rose-500/15 text-rose-400',
  Normal: 'bg-slate-500/15 text-slate-300',
  Pending: 'bg-amber-500/15 text-amber-400',
  Review: 'bg-blue-500/15 text-blue-400',
  Done: 'bg-emerald-500/15 text-emerald-400',
  'In progress': 'bg-blue-500/15 text-blue-400',
};

const WIDGETS: WidgetDefinition[] = [
  {
    id: 'occupancy',
    title: 'Occupancy Overview',
    permission: 'view:rooms',
    size: 'compact',
    render: () => (
      <WidgetCard title="Occupancy Overview" size="compact" icon={BedDouble}>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-3xl font-bold text-white">{occupancyStats.rate}</p>
            <p className={`text-xs ${muted}`}>
              {occupancyStats.occupied} of {occupancyStats.total} rooms occupied
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-emerald-400">+4.2%</p>
            <p className={`text-xs ${muted}`}>vs yesterday</p>
          </div>
        </div>
        <div className="mt-4 h-2 rounded-full bg-slate-800 overflow-hidden">
          <div className="h-full bg-emerald-500" style={{ width: occupancyStats.rate }} />
        </div>
      </WidgetCard>
    ),
  },
  {
    id: 'checkins',
    title: "Today's Check-ins/Outs",
    permission: 'view:reservations',
    size: 'wide',
    render: () => (
      <WidgetCard
        title="Today's Check-ins/Outs"
        size="wide"
        icon={ClipboardList}
        action={{ label: 'View reservations →', href: '/reservations' }}
      >
        <div className="space-y-3">
          {checkInsOuts.map((item) => (
            <div
              key={`${item.name}-${item.room}`}
              className="flex items-center justify-between border-b border-[#1e2536] pb-2 last:border-0"
            >
              <div>
                <p className="text-sm font-medium text-slate-200">{item.name}</p>
                <p className={`text-xs ${muted}`}>Room {item.room} · {item.time}</p>
              </div>
              <span
                className={`${statPill} ${
                  item.type === 'Check-in'
                    ? 'bg-blue-500/15 text-blue-400'
                    : 'bg-emerald-500/15 text-emerald-400'
                }`}
              >
                {item.type}
              </span>
            </div>
          ))}
        </div>
      </WidgetCard>
    ),
  },
  {
    id: 'room-status',
    title: 'Room Status Grid',
    permission: 'view:rooms',
    size: 'wide',
    render: () => (
      <WidgetCard title="Room Status Grid" size="wide" icon={DoorOpen}>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {roomStatus.map((room) => (
            <div key={room.room} className="bg-[#111623] border border-[#1e2536] rounded-lg p-2">
              <p className="text-xs text-slate-400">Room {room.room}</p>
              <span className={`${statPill} ${statusPills[room.status]}`}>{room.status}</span>
            </div>
          ))}
        </div>
      </WidgetCard>
    ),
  },
  {
    id: 'revenue-today',
    title: 'Revenue Today',
    permission: 'view:finance',
    size: 'compact',
    render: () => (
      <WidgetCard title="Revenue Today" size="compact" icon={DollarSign}>
        <p className="text-3xl font-bold text-white">$8,420</p>
        <p className={`text-xs ${muted}`}>Daily target: $9,500</p>
        <div className="mt-3 flex items-center justify-between text-xs">
          <span className="text-emerald-400">+18.3% vs yesterday</span>
          <span className={muted}>75 transactions</span>
        </div>
      </WidgetCard>
    ),
  },
  {
    id: 'outstanding-folios',
    title: 'Outstanding Folios',
    permission: 'view:finance',
    size: 'wide',
    render: () => (
      <WidgetCard
        title="Outstanding Folios"
        size="wide"
        icon={ClipboardCheck}
        action={{ label: 'View finance →', href: '/finance' }}
      >
        <div className="space-y-3">
          {outstandingFolios.map((folio) => (
            <div
              key={folio.guest}
              className="flex items-center justify-between border-b border-[#1e2536] pb-2 last:border-0"
            >
              <div>
                <p className="text-sm font-medium text-slate-200">{folio.guest}</p>
                <p className={`text-xs ${muted}`}>Room {folio.room} · Due {folio.due}</p>
              </div>
              <span className="text-sm font-semibold text-white">{folio.amount}</span>
            </div>
          ))}
        </div>
      </WidgetCard>
    ),
  },
  {
    id: 'pos-sales',
    title: 'POS Sales Today',
    permission: 'view:pos',
    size: 'compact',
    render: () => (
      <WidgetCard title="POS Sales Today" size="compact" icon={ShoppingCart}>
        <p className="text-3xl font-bold text-white">$1,240</p>
        <p className={`text-xs ${muted}`}>32 orders processed</p>
        <div className="mt-3 flex items-center justify-between text-xs">
          <span className="text-emerald-400">+9.1% vs yesterday</span>
          <span className={muted}>Avg $38</span>
        </div>
      </WidgetCard>
    ),
  },
  {
    id: 'pos-orders',
    title: 'Active POS Orders',
    permission: 'view:pos',
    size: 'wide',
    render: () => (
      <WidgetCard
        title="Active POS Orders"
        size="wide"
        icon={UtensilsCrossed}
        action={{ label: 'Open POS →', href: '/pos' }}
      >
        <div className="space-y-3">
          {posOrders.map((order) => (
            <div
              key={order.table}
              className="flex items-center justify-between border-b border-[#1e2536] pb-2 last:border-0"
            >
              <div>
                <p className="text-sm font-medium text-slate-200">{order.table}</p>
                <p className={`text-xs ${muted}`}>{order.items} items · {order.total}</p>
              </div>
              <span className={`${statPill} ${statusPills[order.status]}`}>{order.status}</span>
            </div>
          ))}
        </div>
      </WidgetCard>
    ),
  },
  {
    id: 'low-stock',
    title: 'Low Stock Alerts',
    permission: 'view:inventory',
    size: 'compact',
    render: () => (
      <WidgetCard
        title="Low Stock Alerts"
        size="compact"
        icon={AlertTriangle}
        action={{ label: 'Inventory →', href: '/inventory' }}
      >
        <div className="space-y-2">
          {lowStock.map((item) => (
            <div key={item.item} className="flex items-center justify-between text-sm">
              <span className="text-slate-200">{item.item}</span>
              <span className="text-amber-400">
                {item.remaining} {item.unit}
              </span>
            </div>
          ))}
        </div>
      </WidgetCard>
    ),
  },
  {
    id: 'housekeeping-queue',
    title: 'Housekeeping Queue',
    permission: 'view:housekeeping',
    size: 'wide',
    render: () => (
      <WidgetCard
        title="Housekeeping Queue"
        size="wide"
        icon={Sparkles}
        action={{ label: 'Housekeeping →', href: '/housekeeping' }}
      >
        <div className="space-y-3">
          {housekeepingQueue.map((task) => (
            <div
              key={`${task.room}-${task.task}`}
              className="flex items-center justify-between border-b border-[#1e2536] pb-2 last:border-0"
            >
              <div>
                <p className="text-sm font-medium text-slate-200">
                  Room {task.room} · {task.task}
                </p>
                <span className={`${statPill} ${statusPills[task.priority]}`}>{task.priority}</span>
              </div>
              <span className={`text-xs ${muted}`}>Due today</span>
            </div>
          ))}
        </div>
      </WidgetCard>
    ),
  },
  {
    id: 'staff-on-duty',
    title: 'Staff On Duty',
    permission: 'view:attendance',
    size: 'compact',
    render: () => (
      <WidgetCard
        title="Staff On Duty"
        size="compact"
        icon={Users}
        action={{ label: 'Attendance →', href: '/attendance' }}
      >
        <div className="space-y-2">
          {staffOnDuty.map((staff) => (
            <div key={staff.name} className="flex items-center justify-between text-sm">
              <div>
                <p className="text-slate-200">{staff.name}</p>
                <p className={`text-xs ${muted}`}>{staff.role}</p>
              </div>
              <span className={`text-xs ${muted}`}>{staff.shift}</span>
            </div>
          ))}
        </div>
      </WidgetCard>
    ),
  },
  {
    id: 'pending-approvals',
    title: 'Pending Approvals',
    permission: 'manage:hr',
    size: 'compact',
    render: () => (
      <WidgetCard
        title="Pending Approvals"
        size="compact"
        icon={BadgeCheck}
        action={{ label: 'HR →', href: '/hr' }}
      >
        <div className="space-y-2">
          {approvals.map((approval) => (
            <div key={approval.item} className="flex items-center justify-between text-sm">
              <span className="text-slate-200">{approval.item}</span>
              <span className={`${statPill} ${statusPills[approval.status]}`}>{approval.status}</span>
            </div>
          ))}
        </div>
      </WidgetCard>
    ),
  },
  {
    id: 'my-attendance',
    title: 'My Attendance Today',
    permission: 'clock:self',
    size: 'compact',
    render: () => (
      <WidgetCard
        title="My Attendance Today"
        size="compact"
        icon={Clock}
        action={{ label: 'Clock →', href: '/clock' }}
      >
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className={muted}>Clock in</span>
            <span className="text-white font-medium">08:05</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className={muted}>Clock out</span>
            <span className="text-white font-medium">17:00</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className={muted}>Status</span>
            <span className={`${statPill} bg-emerald-500/15 text-emerald-400`}>On shift</span>
          </div>
        </div>
      </WidgetCard>
    ),
  },
  {
    id: 'my-tasks',
    title: 'My Tasks Today',
    permission: 'view:housekeeping',
    size: 'wide',
    render: () => (
      <WidgetCard title="My Tasks Today" size="wide" icon={Boxes}>
        <div className="space-y-3">
          {myTasks.map((task) => (
            <div
              key={task.task}
              className="flex items-center justify-between border-b border-[#1e2536] pb-2 last:border-0"
            >
              <span className="text-sm font-medium text-slate-200">{task.task}</span>
              <span className={`${statPill} ${statusPills[task.status]}`}>{task.status}</span>
            </div>
          ))}
        </div>
      </WidgetCard>
    ),
  },
];

export default function DashboardPage() {
  const { can, ready } = usePermissions();
  const visible = ready ? WIDGETS.filter((widget) => can(widget.permission)) : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Welcome back</h1>
          <p className="text-slate-500 text-sm mt-0.5">Here's what you can act on today.</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-400 bg-[#161b27] border border-[#1e2536] px-4 py-2 rounded-lg">
          <Clock size={14} />
          {dateLabel}
        </div>
      </div>

      {!ready ? (
        <div className="text-sm text-slate-400">Loading dashboard…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {visible.map((widget) => (
            <Fragment key={widget.id}>{widget.render()}</Fragment>
          ))}
        </div>
      )}
    </div>
  );
}
