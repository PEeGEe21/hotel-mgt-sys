import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  OrderStatus,
  PaymentStatus,
  PrepStation,
  PrepStatus,
  ReservationStatus,
  Role,
  TaskStatus,
} from '@prisma/client';
import dayjs from 'dayjs';
import { PrismaService } from '../../prisma/prisma.service';
import { DEFAULT_ROLE_PERMISSIONS } from '../../common/constants/role-permissions';
import { UpdateDashboardLayoutDto } from './dtos/update-dashboard-layout.dto';

type DashboardContext = {
  userId: string;
  role: Role;
  hotelId: string;
  staffId: string | null;
  permissions: Set<string>;
};

const DASHBOARD_ROLES = [
  Role.SUPER_ADMIN,
  Role.ADMIN,
  Role.MANAGER,
  Role.RECEPTIONIST,
  Role.HOUSEKEEPING,
  Role.CASHIER,
  Role.COOK,
  Role.BARTENDER,
  Role.STAFF,
];

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getConfig(userId: string) {
    const ctx = await this.getDashboardContext(userId);

    const roleConfig = await this.prisma.roleDashboardConfig.findMany({
      where: {
        hotelId: ctx.hotelId,
        role: ctx.role,
        enabled: true,
      },
      include: {
        widget: true,
      },
      orderBy: { position: 'asc' },
    });

    return {
      role: ctx.role,
      widgets: roleConfig.map((entry) => {
        const sizeOverride =
          entry.sizeOverride && entry.widget.allowedSizes.includes(entry.sizeOverride)
            ? entry.sizeOverride
            : null;

        return {
          id: entry.widget.id,
          title: entry.widget.title,
          permissionKey: entry.widget.permissionKey,
          featureFlag: entry.widget.featureFlag,
          defaultEnabled: entry.widget.defaultEnabled,
          defaultSize: entry.widget.defaultSize,
          allowedSizes: entry.widget.allowedSizes,
          position: entry.position,
          enabled: entry.enabled,
          size: sizeOverride ?? entry.widget.defaultSize,
          sizeOverride,
          config: entry.config,
        };
      }),
    };
  }

  async getFeatureFlags(userId: string) {
    await this.getDashboardContext(userId);
    const flags = await this.getFeatureFlagMap();
    return { flags };
  }

  async getAdminLayouts(userId: string) {
    const ctx = await this.getDashboardContext(userId);
    const [widgets, rows] = await Promise.all([
      this.prisma.dashboardWidget.findMany({ orderBy: { title: 'asc' } }),
      this.prisma.roleDashboardConfig.findMany({
        where: { hotelId: ctx.hotelId },
        include: { widget: true },
        orderBy: [{ role: 'asc' }, { position: 'asc' }],
      }),
    ]);

    return {
      roles: DASHBOARD_ROLES,
      widgets,
      rows: rows.map((row) => ({
        id: row.id,
        role: row.role,
        widgetId: row.widgetId,
        title: row.widget.title,
        permissionKey: row.widget.permissionKey,
        featureFlag: row.widget.featureFlag,
        defaultSize: row.widget.defaultSize,
        allowedSizes: row.widget.allowedSizes,
        position: row.position,
        enabled: row.enabled,
        sizeOverride: row.sizeOverride,
        size: row.sizeOverride ?? row.widget.defaultSize,
      })),
    };
  }

  async updateAdminLayouts(userId: string, dto: UpdateDashboardLayoutDto) {
    const ctx = await this.getDashboardContext(userId);
    const widgets = await this.prisma.dashboardWidget.findMany();
    const widgetMap = new Map(widgets.map((widget) => [widget.id, widget]));

    const invalidWidget = dto.rows.find((row) => !widgetMap.has(row.widgetId));
    if (invalidWidget) {
      throw new BadRequestException(`Unknown dashboard widget: ${invalidWidget.widgetId}`);
    }

    const invalidSize = dto.rows.find((row) => {
      if (!row.sizeOverride) return false;
      return !widgetMap.get(row.widgetId)?.allowedSizes.includes(row.sizeOverride);
    });
    if (invalidSize) {
      throw new BadRequestException(
        `${invalidSize.sizeOverride} is not allowed for ${invalidSize.widgetId}`,
      );
    }

    await this.prisma.$transaction(
      dto.rows.map((row) =>
        this.prisma.roleDashboardConfig.upsert({
          where: {
            hotelId_role_widgetId: {
              hotelId: ctx.hotelId,
              role: row.role,
              widgetId: row.widgetId,
            },
          },
          update: {
            position: row.position,
            enabled: row.enabled,
            sizeOverride: row.sizeOverride ?? null,
          },
          create: {
            hotelId: ctx.hotelId,
            role: row.role,
            widgetId: row.widgetId,
            position: row.position,
            enabled: row.enabled,
            sizeOverride: row.sizeOverride ?? null,
          },
        }),
      ),
    );

    return this.getAdminLayouts(userId);
  }

  async getWidgetData(userId: string, widgetId: string) {
    const ctx = await this.getDashboardContext(userId);
    const widget = await this.prisma.dashboardWidget.findUnique({ where: { id: widgetId } });

    if (!widget) throw new NotFoundException('Dashboard widget not found.');
    if (!ctx.permissions.has(widget.permissionKey)) {
      throw new ForbiddenException('Insufficient permissions for this widget.');
    }

    const featureFlags = await this.getFeatureFlagMap();
    if (widget.featureFlag && featureFlags[widget.featureFlag] === false) {
      throw new ForbiddenException('This widget is disabled.');
    }

    switch (widgetId) {
      case 'occupancy_overview':
        return this.getOccupancyOverview(ctx.hotelId);
      case 'todays_checkins_outs':
        return this.getTodaysCheckinsOuts(ctx.hotelId);
      case 'room_status_grid':
        return this.getRoomStatusGrid(ctx.hotelId);
      case 'revenue_today':
        return this.getRevenueToday(ctx.hotelId);
      case 'outstanding_folios':
        return this.getOutstandingFolios(ctx.hotelId);
      case 'pos_sales_today':
        return this.getPosSalesToday(ctx.hotelId);
      case 'active_pos_orders':
        return this.getActivePosOrders(ctx.hotelId);
      case 'low_stock_alerts':
        return this.getLowStockAlerts(ctx.hotelId);
      case 'housekeeping_queue':
        return this.getHousekeepingQueue(ctx.hotelId);
      case 'staff_on_duty':
        return this.getStaffOnDuty(ctx.hotelId);
      case 'pending_approvals':
        return this.getPendingApprovals(ctx.hotelId);
      case 'my_attendance_today':
        return this.getMyAttendanceToday(ctx.staffId);
      case 'my_tasks_today':
        return this.getMyTasksToday(ctx.hotelId, ctx.staffId);
      default:
        throw new NotFoundException('Dashboard widget is not implemented.');
    }
  }

  private async getDashboardContext(userId: string): Promise<DashboardContext> {
    const dbUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        permissionGrants: true,
        permissionDenies: true,
        staff: { select: { id: true, hotelId: true } },
      },
    });

    if (!dbUser) {
      throw new ForbiddenException('Dashboard context is unavailable for this user.');
    }

    const role = dbUser.role as Role;
    let hotelId = dbUser.staff?.hotelId ?? null;
    let rolePerms = DEFAULT_ROLE_PERMISSIONS[role] ?? [];

    if (!hotelId && (role === 'SUPER_ADMIN' || role === 'ADMIN')) {
      const roleDashboardHotel = await this.prisma.roleDashboardConfig.findFirst({
        where: { role },
        select: { hotelId: true },
        orderBy: { createdAt: 'asc' },
      });

      if (roleDashboardHotel?.hotelId) {
        hotelId = roleDashboardHotel.hotelId;
      } else {
        const firstHotel = await this.prisma.hotel.findFirst({
          select: { id: true },
          orderBy: { createdAt: 'asc' },
        });
        hotelId = firstHotel?.id ?? null;
      }
    }

    if (!hotelId) {
      throw new ForbiddenException('Dashboard context is unavailable for this user.');
    }

    const roleRecord = await this.prisma.rolePermission.findUnique({
      where: { hotelId_role: { hotelId, role } },
    });
    if (roleRecord) rolePerms = roleRecord.permissions ?? [];

    const permissions = new Set(rolePerms);
    (dbUser.permissionGrants ?? []).forEach((perm) => permissions.add(perm));
    (dbUser.permissionDenies ?? []).forEach((perm) => permissions.delete(perm));

    if (!permissions.has('view:dashboard')) {
      throw new ForbiddenException('Dashboard access is not allowed.');
    }

    return {
      userId,
      role,
      hotelId,
      staffId: dbUser.staff?.id ?? null,
      permissions,
    };
  }

  private async getFeatureFlagMap() {
    const flags = await this.prisma.featureFlag.findMany();
    return flags.reduce<Record<string, boolean>>((acc, flag) => {
      acc[flag.key] = flag.enabled !== false;
      return acc;
    }, {});
  }

  private getDayRange() {
    return {
      start: dayjs().startOf('day').toDate(),
      end: dayjs().endOf('day').toDate(),
      yesterdayStart: dayjs().subtract(1, 'day').startOf('day').toDate(),
      yesterdayEnd: dayjs().subtract(1, 'day').endOf('day').toDate(),
    };
  }

  private percentDelta(current: number, previous: number) {
    if (!previous) return current > 0 ? 100 : 0;
    return Number((((current - previous) / previous) * 100).toFixed(1));
  }

  private dueLabel(value: Date) {
    const diff = dayjs(value).startOf('day').diff(dayjs().startOf('day'), 'day');
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    if (diff < 0) return 'Overdue';
    return dayjs(value).format('DD MMM');
  }

  private async getOccupancyOverview(hotelId: string) {
    const [total, occupied, available] = await Promise.all([
      this.prisma.room.count({ where: { hotelId } }),
      this.prisma.room.count({ where: { hotelId, status: 'OCCUPIED' } }),
      this.prisma.room.count({ where: { hotelId, status: 'AVAILABLE' } }),
    ]);

    const rate = total ? Math.round((occupied / total) * 100) : 0;
    return {
      rate,
      occupied,
      available,
      total,
      rateLabel: `${rate}%`,
    };
  }

  private async getTodaysCheckinsOuts(hotelId: string) {
    const { start, end } = this.getDayRange();
    const [checkIns, checkOuts] = await Promise.all([
      this.prisma.reservation.findMany({
        where: {
          hotelId,
          checkIn: { gte: start, lte: end },
          status: { in: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED, ReservationStatus.CHECKED_IN] },
        },
        select: {
          id: true,
          checkIn: true,
          guest: { select: { firstName: true, lastName: true } },
          room: { select: { number: true } },
        },
        orderBy: { checkIn: 'asc' },
        take: 6,
      }),
      this.prisma.reservation.findMany({
        where: {
          hotelId,
          checkOut: { gte: start, lte: end },
          status: { in: [ReservationStatus.CONFIRMED, ReservationStatus.CHECKED_IN] },
        },
        select: {
          id: true,
          checkOut: true,
          guest: { select: { firstName: true, lastName: true } },
          room: { select: { number: true } },
        },
        orderBy: { checkOut: 'asc' },
        take: 6,
      }),
    ]);

    const items = [
      ...checkIns.map((item) => ({
        id: `checkin-${item.id}`,
        type: 'Check-in',
        time: item.checkIn,
        guestName: `${item.guest.firstName} ${item.guest.lastName}`.trim(),
        roomNumber: item.room.number,
      })),
      ...checkOuts.map((item) => ({
        id: `checkout-${item.id}`,
        type: 'Check-out',
        time: item.checkOut,
        guestName: `${item.guest.firstName} ${item.guest.lastName}`.trim(),
        roomNumber: item.room.number,
      })),
    ].sort((a, b) => a.time.getTime() - b.time.getTime());

    return {
      count: items.length,
      items,
    };
  }

  private async getRoomStatusGrid(hotelId: string) {
    const rooms = await this.prisma.room.findMany({
      where: { hotelId },
      select: { id: true, number: true, status: true },
      orderBy: [{ floor: { level: 'asc' } }, { number: 'asc' }],
      take: 12,
    });

    const stats = await this.prisma.room.groupBy({
      by: ['status'],
      where: { hotelId },
      _count: { status: true },
    });

    return {
      rooms,
      stats: stats.reduce<Record<string, number>>((acc, row) => {
        acc[row.status] = row._count.status;
        return acc;
      }, {}),
    };
  }

  private async getRevenueToday(hotelId: string) {
    const { start, end, yesterdayStart, yesterdayEnd } = this.getDayRange();

    const [paymentsToday, paymentsYesterday] = await Promise.all([
      this.prisma.payment.findMany({
        where: { hotelId, paidAt: { gte: start, lte: end } },
        select: { amount: true },
      }),
      this.prisma.payment.findMany({
        where: { hotelId, paidAt: { gte: yesterdayStart, lte: yesterdayEnd } },
        select: { amount: true },
      }),
    ]);

    const total = paymentsToday.reduce((sum, row) => sum + Number(row.amount), 0);
    const previous = paymentsYesterday.reduce((sum, row) => sum + Number(row.amount), 0);

    return {
      total,
      transactionCount: paymentsToday.length,
      changePct: this.percentDelta(total, previous),
    };
  }

  private async getOutstandingFolios(hotelId: string) {
    const reservations = await this.prisma.reservation.findMany({
      where: {
        hotelId,
        status: {
          in: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED, ReservationStatus.CHECKED_IN],
        },
        paymentStatus: { not: PaymentStatus.PAID },
      },
      select: {
        id: true,
        totalAmount: true,
        paidAmount: true,
        checkOut: true,
        guest: { select: { firstName: true, lastName: true } },
        room: { select: { number: true } },
      },
      orderBy: { checkOut: 'asc' },
      take: 6,
    });

    const items = reservations
      .map((reservation) => {
        const outstanding = Number(reservation.totalAmount) - Number(reservation.paidAmount);
        return {
          id: reservation.id,
          guestName: `${reservation.guest.firstName} ${reservation.guest.lastName}`.trim(),
          roomNumber: reservation.room.number,
          amount: outstanding,
          dueLabel: this.dueLabel(reservation.checkOut),
        };
      })
      .filter((item) => item.amount > 0);

    return { items };
  }

  private async getPosSalesToday(hotelId: string) {
    const { start, end, yesterdayStart, yesterdayEnd } = this.getDayRange();

    const [todayOrders, yesterdayOrders] = await Promise.all([
      this.prisma.posOrder.findMany({
        where: {
          hotelId,
          createdAt: { gte: start, lte: end },
          isPaid: true,
        },
        select: { total: true },
      }),
      this.prisma.posOrder.findMany({
        where: {
          hotelId,
          createdAt: { gte: yesterdayStart, lte: yesterdayEnd },
          isPaid: true,
        },
        select: { total: true },
      }),
    ]);

    const total = todayOrders.reduce((sum, order) => sum + Number(order.total), 0);
    const previous = yesterdayOrders.reduce((sum, order) => sum + Number(order.total), 0);
    const orderCount = todayOrders.length;

    return {
      total,
      orderCount,
      averageOrderValue: orderCount ? total / orderCount : 0,
      changePct: this.percentDelta(total, previous),
    };
  }

  private async getActivePosOrders(hotelId: string) {
    const orders = await this.prisma.posOrder.findMany({
      where: {
        hotelId,
        status: { in: [OrderStatus.PENDING, OrderStatus.PREPARING, OrderStatus.READY] },
      },
      select: {
        id: true,
        orderNo: true,
        tableNo: true,
        roomNo: true,
        createdAt: true,
        total: true,
        status: true,
        items: {
          select: {
            prepStation: true,
            prepStatus: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 6,
    });

    const stationSummary = orders.reduce(
      (acc, order) => {
        order.items.forEach((item) => {
          if (item.prepStatus !== PrepStatus.QUEUED) return;
          if (item.prepStation === PrepStation.KITCHEN) acc.kitchenQueued += 1;
          if (item.prepStation === PrepStation.BAR) acc.barQueued += 1;
        });
        return acc;
      },
      { kitchenQueued: 0, barQueued: 0 },
    );

    return {
      items: orders.map((order) => ({
        id: order.id,
        orderNo: order.orderNo,
        label: order.tableNo || order.roomNo || 'Walk-in',
        itemCount: order.items.length,
        total: Number(order.total),
        status: order.status,
        delayed: dayjs().diff(order.createdAt, 'minute') >= 20,
        prepSummary: {
          totalRoutedItems: order.items.filter((item) => item.prepStation !== PrepStation.NONE).length,
          queued: order.items.filter((item) => item.prepStatus === PrepStatus.QUEUED).length,
          inProgress: order.items.filter((item) => item.prepStatus === PrepStatus.IN_PROGRESS).length,
          ready: order.items.filter((item) => item.prepStatus === PrepStatus.READY).length,
          isPrepComplete: order.items
            .filter((item) => item.prepStation !== PrepStation.NONE && item.prepStatus !== PrepStatus.CANCELLED)
            .every((item) =>
              item.prepStatus === PrepStatus.READY || item.prepStatus === PrepStatus.FULFILLED,
            ),
        },
      })),
      stationSummary,
    };
  }

  private async getLowStockAlerts(hotelId: string) {
    const items = await this.prisma.inventoryItem.findMany({
      where: { hotelId },
      select: {
        id: true,
        name: true,
        quantity: true,
        minStock: true,
        unit: true,
      },
      orderBy: { updatedAt: 'asc' },
      take: 30,
    });

    const alerts = items
      .filter((item) => Number(item.quantity) <= Number(item.minStock))
      .sort((a, b) => Number(a.quantity) - Number(b.quantity))
      .slice(0, 6)
      .map((item) => ({
        id: item.id,
        name: item.name,
        remaining: Number(item.quantity),
        minStock: Number(item.minStock),
        unit: item.unit,
      }));

    return { items: alerts };
  }

  private async getHousekeepingQueue(hotelId: string) {
    const tasks = await this.prisma.housekeepingTask.findMany({
      where: {
        hotelId,
        status: { in: [TaskStatus.PENDING, TaskStatus.IN_PROGRESS] },
      },
      select: {
        id: true,
        type: true,
        priority: true,
        dueBy: true,
        room: { select: { number: true } },
      },
      orderBy: [{ priority: 'desc' }, { dueBy: 'asc' }, { createdAt: 'desc' }],
      take: 6,
    });

    return {
      items: tasks.map((task) => ({
        id: task.id,
        roomNumber: task.room.number,
        taskType: task.type,
        priority: task.priority,
        dueLabel: task.dueBy ? this.dueLabel(task.dueBy) : 'Pending',
      })),
    };
  }

  private async getStaffOnDuty(hotelId: string) {
    const { start, end } = this.getDayRange();
    const records = await this.prisma.attendance.findMany({
      where: {
        hotelId,
        timestamp: { gte: start, lte: end },
      },
      select: {
        staffId: true,
        type: true,
        timestamp: true,
        staff: {
          select: {
            firstName: true,
            lastName: true,
            department: true,
            position: true,
          },
        },
      },
      orderBy: { timestamp: 'asc' },
    });

    const latestByStaff = new Map<string, (typeof records)[number]>();
    for (const record of records) latestByStaff.set(record.staffId, record);

    const items = Array.from(latestByStaff.values())
      .filter((record) => record.type === 'CLOCK_IN')
      .slice(0, 6)
      .map((record) => ({
        id: record.staffId,
        name: `${record.staff.firstName} ${record.staff.lastName}`.trim(),
        department: record.staff.department,
        position: record.staff.position,
        clockedInAt: record.timestamp,
      }));

    return { items };
  }

  private async getPendingApprovals(hotelId: string) {
    const [leaves, bookings, requisitions] = await Promise.all([
      this.prisma.leave.findMany({
        where: { hotelId, status: 'PENDING' },
        select: {
          id: true,
          createdAt: true,
          staff: { select: { firstName: true, lastName: true } },
          type: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 3,
      }),
      this.prisma.facilityBooking.findMany({
        where: { hotelId, status: 'PENDING' },
        select: {
          id: true,
          createdAt: true,
          guestName: true,
          facility: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 3,
      }),
      this.prisma.facilityRequisition.findMany({
        where: { hotelId, status: 'PENDING' },
        select: {
          id: true,
          createdAt: true,
          title: true,
          facility: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 3,
      }),
    ]);

    const items = [
      ...leaves.map((leave) => ({
        id: `leave-${leave.id}`,
        label: `${leave.type} leave · ${leave.staff.firstName} ${leave.staff.lastName}`.trim(),
        source: 'HR',
        status: 'Pending',
        createdAt: leave.createdAt,
      })),
      ...bookings.map((booking) => ({
        id: `booking-${booking.id}`,
        label: `${booking.facility.name} booking · ${booking.guestName}`,
        source: 'Facilities',
        status: 'Pending',
        createdAt: booking.createdAt,
      })),
      ...requisitions.map((req) => ({
        id: `requisition-${req.id}`,
        label: `${req.title} · ${req.facility.name}`,
        source: 'Requisition',
        status: 'Pending',
        createdAt: req.createdAt,
      })),
    ]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 6);

    return { items };
  }

  private async getMyAttendanceToday(staffId: string | null) {
    if (!staffId) {
      return { status: 'Unavailable', clockIn: null, clockOut: null };
    }

    const { start, end } = this.getDayRange();
    const records = await this.prisma.attendance.findMany({
      where: {
        staffId,
        timestamp: { gte: start, lte: end },
      },
      orderBy: { timestamp: 'asc' },
    });

    const clockIn = records.find((record) => record.type === 'CLOCK_IN')?.timestamp ?? null;
    const clockOut = [...records].reverse().find((record) => record.type === 'CLOCK_OUT')?.timestamp ?? null;
    const last = records[records.length - 1];

    let status = 'Not clocked in';
    if (last?.type === 'CLOCK_IN') status = 'On shift';
    else if (last?.type === 'CLOCK_OUT') status = 'Clocked out';

    return { status, clockIn, clockOut };
  }

  private async getMyTasksToday(hotelId: string, staffId: string | null) {
    if (!staffId) return { items: [] };

    const tasks = await this.prisma.housekeepingTask.findMany({
      where: {
        hotelId,
        assignedTo: staffId,
        status: { in: [TaskStatus.PENDING, TaskStatus.IN_PROGRESS, TaskStatus.DONE] },
      },
      select: {
        id: true,
        type: true,
        status: true,
        room: { select: { number: true } },
      },
      orderBy: [{ completedAt: 'asc' }, { createdAt: 'desc' }],
      take: 6,
    });

    return {
      items: tasks.map((task) => ({
        id: task.id,
        label: `Room ${task.room.number} · ${task.type}`,
        status: task.status,
      })),
    };
  }
}
