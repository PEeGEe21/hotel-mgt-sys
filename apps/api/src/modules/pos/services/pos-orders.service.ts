import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { OrderStatus, PrepStation, PrepStatus, Prisma, Role } from '@prisma/client';
import { genInvoiceNo, genOrderNo } from 'src/common/utils/orders.utils';
import { PayOrderDto } from '../dtos/orders/pay-order.dto';
import { UpdateItemDto } from '../dtos/orders/update-item.dto';
import { AddItemDto } from '../dtos/orders/add-item.dto';
import { CreateOrderDto } from '../dtos/orders/create-order.dto';
import { OrderFilterDto } from '../dtos/orders/order-filter.dto';
import { PrepBoardQueryDto } from '../dtos/orders/prep-board-query.dto';
import { UpdateStatusDto } from '../dtos/orders/update-status.dto';
import dayjs from 'dayjs';
import { LedgerService } from '../../ledger/ledger.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import {
  POS_ORDERS_SYNC_EVENT,
  POS_PREP_SYNC_EVENT,
  type PosOrderSyncPayload,
  type PosPrepSyncPayload,
  type PrepRealtimeAction,
} from '../../realtime/realtime.events';
import { DEFAULT_ROLE_PERMISSIONS } from '../../../common/constants/role-permissions';
import { PosTerminalAuthService } from './pos-terminal-auth.service';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ORDER_INCLUDE = {
  items: {
    include: {
      product: {
        select: {
          id: true,
          name: true,
          type: true,
          prepStation: true,
          unit: true,
          category: { select: { id: true, name: true } },
        },
      },
    },
  },
  posTerminal: { select: { id: true, name: true, location: true } },
  reservation: {
    select: {
      id: true,
      reservationNo: true,
      guest: { select: { firstName: true, lastName: true } },
    },
  },
  staff: { select: { id: true, firstName: true, lastName: true } },
  invoices: { include: { payments: true } },
} as const;

const ACTIVE_PREP_STATUSES: PrepStatus[] = [
  PrepStatus.QUEUED,
  PrepStatus.IN_PROGRESS,
  PrepStatus.READY,
];

const PREP_PERMISSION_MAP: Record<
  PrepStation,
  { view: string; update: string } | null
> = {
  [PrepStation.NONE]: null,
  [PrepStation.KITCHEN]: {
    view: 'view:pos-kitchen-board',
    update: 'update:pos-kitchen-board',
  },
  [PrepStation.BAR]: {
    view: 'view:pos-bar-board',
    update: 'update:pos-bar-board',
  },
};

const PREP_TRANSITIONS: Record<PrepStatus, PrepStatus[]> = {
  [PrepStatus.QUEUED]: [PrepStatus.IN_PROGRESS, PrepStatus.READY, PrepStatus.CANCELLED],
  [PrepStatus.IN_PROGRESS]: [PrepStatus.QUEUED, PrepStatus.READY, PrepStatus.CANCELLED],
  [PrepStatus.READY]: [PrepStatus.IN_PROGRESS, PrepStatus.FULFILLED, PrepStatus.CANCELLED],
  [PrepStatus.FULFILLED]: [],
  [PrepStatus.CANCELLED]: [],
};

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class PosOrdersService {
  constructor(
    private prisma: PrismaService,
    private ledger: LedgerService,
    private realtimeGateway: RealtimeGateway,
    private terminalAuth: PosTerminalAuthService,
  ) {}

  private async logAudit(params: {
    actorUserId: string;
    hotelId: string;
    action: string;
    targetId?: string | null;
    metadata?: Prisma.InputJsonValue;
    ipAddress?: string | null;
    userAgent?: string | null;
  }) {
    await this.prisma.auditLog.create({
      data: {
        hotelId: params.hotelId,
        actorUserId: params.actorUserId,
        action: params.action,
        targetType: 'pos_order',
        targetId: params.targetId ?? null,
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
        metadata: params.metadata ?? undefined,
      },
    });
  }

  private async resolveTerminalOperator(args: {
    hotelId: string;
    posTerminalId?: string | null;
    terminalDeviceKey?: string | null;
    staffId?: string | null;
  }) {
    if (!args.posTerminalId) {
      return {
        posTerminalId: null,
        staffId: args.staffId ?? null,
      };
    }

    const terminal = await this.terminalAuth.assertTerminalDeviceAccess(
      args.posTerminalId,
      args.terminalDeviceKey,
    );

    if (terminal.hotelId !== args.hotelId) {
      throw new BadRequestException('POS terminal not found for this hotel.');
    }

    if (!terminal.currentStaffId) {
      throw new BadRequestException('No staff member is signed in on this terminal.');
    }

    if (args.staffId && args.staffId !== terminal.currentStaffId) {
      throw new BadRequestException('Terminal staff session does not match the submitted staff ID.');
    }

    await this.prisma.posTerminal.update({
      where: { id: terminal.id },
      data: { lastActivityAt: new Date() },
    });

    return {
      posTerminalId: terminal.id,
      staffId: terminal.currentStaffId,
    };
  }

  private async assertTerminalOrderAccess(args: {
    hotelId: string;
    order: { posTerminalId: string | null; status: OrderStatus };
    posTerminalId?: string | null;
    terminalDeviceKey?: string | null;
  }) {
    if (!args.posTerminalId && !args.terminalDeviceKey) return;
    if (!args.posTerminalId) {
      throw new BadRequestException('Terminal ID is required for terminal payment and delivery actions.');
    }

    const terminal = await this.terminalAuth.assertTerminalDeviceAccess(
      args.posTerminalId,
      args.terminalDeviceKey,
    );

    if (terminal.hotelId !== args.hotelId) {
      throw new BadRequestException('POS terminal not found for this hotel.');
    }

    if (args.order.posTerminalId !== terminal.id) {
      throw new BadRequestException('This order belongs to a different terminal.');
    }

    if (!terminal.currentStaffId) {
      throw new BadRequestException('No staff member is signed in on this terminal.');
    }

    await this.prisma.posTerminal.update({
      where: { id: terminal.id },
      data: { lastActivityAt: new Date() },
    });
  }

  private enrichOrder<T extends { items: Array<{ prepStation: PrepStation; prepStatus: PrepStatus }> }>(
    order: T,
  ) {
    return {
      ...order,
      prepSummary: this.buildPrepSummary(order.items),
    };
  }

  private emitOrderSync(
    action: PosOrderSyncPayload['action'],
    order: {
      id: string;
      hotelId: string;
      orderNo: string;
      status: OrderStatus;
      isPaid: boolean;
      posTerminalId: string | null;
      tableNo: string | null;
      roomNo: string | null;
      reservationId: string | null;
    },
  ) {
    this.realtimeGateway.emitPosOrderSync({
      type: POS_ORDERS_SYNC_EVENT,
      entity: 'pos.order',
      action,
      hotelId: order.hotelId,
      timestamp: new Date().toISOString(),
      data: {
        orderId: order.id,
        orderNo: order.orderNo,
        status: order.status,
        isPaid: order.isPaid,
        posTerminalId: order.posTerminalId,
        tableNo: order.tableNo,
        roomNo: order.roomNo,
        reservationId: order.reservationId,
      },
    });
  }

  private emitPrepSync(
    action: PrepRealtimeAction,
    payload: {
      hotelId: string;
      orderId: string;
      orderNo: string;
      orderItemId: string;
      prepStation: PrepStation;
      prepStatus: PrepStatus;
      tableNo: string | null;
      roomNo: string | null;
      itemName: string;
      quantity: number;
      orderType: string;
      note: string | null;
    },
  ) {
    if (payload.prepStation === PrepStation.NONE) return;

    const event: PosPrepSyncPayload = {
      type: POS_PREP_SYNC_EVENT,
      entity: 'pos.prep-item',
      action,
      hotelId: payload.hotelId,
      timestamp: new Date().toISOString(),
      data: {
        orderId: payload.orderId,
        orderNo: payload.orderNo,
        orderItemId: payload.orderItemId,
        prepStation: payload.prepStation,
        prepStatus: payload.prepStatus,
        tableNo: payload.tableNo,
        roomNo: payload.roomNo,
        ticketSummary: {
          itemName: payload.itemName,
          quantity: payload.quantity,
          orderType: payload.orderType,
          note: payload.note,
        },
      },
    };

    this.realtimeGateway.emitPosPrepSync(event);
  }

  private buildPrepSummary(
    items: Array<{ prepStation: PrepStation; prepStatus: PrepStatus }>,
  ) {
    const routedItems = items.filter((item) => item.prepStation !== PrepStation.NONE);
    const counts = {
      totalRoutedItems: routedItems.length,
      queued: 0,
      inProgress: 0,
      ready: 0,
      fulfilled: 0,
      cancelled: 0,
    };

    routedItems.forEach((item) => {
      if (item.prepStatus === PrepStatus.QUEUED) counts.queued += 1;
      if (item.prepStatus === PrepStatus.IN_PROGRESS) counts.inProgress += 1;
      if (item.prepStatus === PrepStatus.READY) counts.ready += 1;
      if (item.prepStatus === PrepStatus.FULFILLED) counts.fulfilled += 1;
      if (item.prepStatus === PrepStatus.CANCELLED) counts.cancelled += 1;
    });

    const activeRoutedItems = routedItems.filter((item) => item.prepStatus !== PrepStatus.CANCELLED);
    const isPrepComplete =
      activeRoutedItems.length === 0 ||
      activeRoutedItems.every(
        (item) =>
          item.prepStatus === PrepStatus.READY || item.prepStatus === PrepStatus.FULFILLED,
      );

    return {
      ...counts,
      isPrepComplete,
      hasQueuedPrepItems: counts.queued > 0,
      hasInProgressPrepItems: counts.inProgress > 0,
      hasReadyPrepItems: counts.ready > 0,
    };
  }

  private deriveOperationalOrderStatus(
    currentStatus: OrderStatus,
    items: Array<{ prepStation: PrepStation; prepStatus: PrepStatus }>,
  ): OrderStatus {
    if (currentStatus === OrderStatus.CANCELLED || currentStatus === OrderStatus.DELIVERED) {
      return currentStatus;
    }

    const summary = this.buildPrepSummary(items);
    if (summary.totalRoutedItems === 0) {
      return currentStatus;
    }

    if (summary.isPrepComplete) {
      return OrderStatus.READY;
    }

    if (summary.hasInProgressPrepItems || summary.hasReadyPrepItems) {
      return OrderStatus.PREPARING;
    }

    return OrderStatus.PENDING;
  }

  private async getEffectivePermissions(userId: string) {
    const dbUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        permissionGrants: true,
        permissionDenies: true,
        staff: { select: { hotelId: true } },
      },
    });

    if (!dbUser) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const role = dbUser.role as Role;
    if (role === Role.SUPER_ADMIN) {
      return new Set<string>(['*']);
    }

    let rolePerms = DEFAULT_ROLE_PERMISSIONS[role] ?? [];
    if (dbUser.staff?.hotelId) {
      const record = await this.prisma.rolePermission.findUnique({
        where: { hotelId_role: { hotelId: dbUser.staff.hotelId, role } },
      });
      if (record) {
        rolePerms = record.permissions ?? [];
      }
    }

    const effective = new Set(rolePerms);
    (dbUser.permissionGrants ?? []).forEach((perm) => effective.add(perm));
    (dbUser.permissionDenies ?? []).forEach((perm) => effective.delete(perm));
    return effective;
  }

  private async assertPrepPermission(
    userId: string,
    station: PrepStation,
    action: 'view' | 'update',
  ) {
    const permissionSet = PREP_PERMISSION_MAP[station];
    if (!permissionSet) {
      throw new BadRequestException('Stationless items do not belong on a prep board.');
    }

    const effective = await this.getEffectivePermissions(userId);
    if (effective.has('*')) return;

    const required = permissionSet[action];
    if (!effective.has(required)) {
      throw new ForbiddenException('Insufficient permissions');
    }
  }

  private prepActionForStatus(status: PrepStatus): PrepRealtimeAction {
    if (status === PrepStatus.QUEUED) return 'queued';
    if (status === PrepStatus.IN_PROGRESS) return 'started';
    if (status === PrepStatus.READY) return 'ready';
    if (status === PrepStatus.FULFILLED) return 'fulfilled';
    return 'cancelled';
  }

  private getPrepUrgency(createdAt: Date) {
    const ageMinutes = dayjs().diff(createdAt, 'minute');

    if (ageMinutes >= 20) return { ageMinutes, level: 'critical' as const };
    if (ageMinutes >= 10) return { ageMinutes, level: 'warning' as const };
    return { ageMinutes, level: 'normal' as const };
  }

  async getPrepBoard(hotelId: string, userId: string, query: PrepBoardQueryDto) {
    if (query.station === PrepStation.NONE) {
      throw new BadRequestException('Prep boards are only available for routed stations.');
    }

    await this.assertPrepPermission(userId, query.station, 'view');

    const statuses = query.statuses?.length ? query.statuses : ACTIVE_PREP_STATUSES;

    const matchingItems = await this.prisma.posOrderItem.findMany({
      where: {
        prepStation: query.station,
        prepStatus: { in: statuses },
        order: {
          hotelId,
          status: { not: OrderStatus.CANCELLED },
        },
      },
      orderBy: [{ order: { createdAt: 'asc' } }],
      include: {
        order: {
          select: {
            id: true,
            orderNo: true,
            tableNo: true,
            roomNo: true,
            type: true,
            status: true,
            isPaid: true,
            note: true,
            createdAt: true,
            staff: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    const orderIds = [...new Set(matchingItems.map((item) => item.orderId))];
    const relatedItems = orderIds.length
      ? await this.prisma.posOrderItem.findMany({
          where: { orderId: { in: orderIds }, prepStation: { not: PrepStation.NONE } },
          select: {
            orderId: true,
            prepStation: true,
            prepStatus: true,
          },
        })
      : [];

    const prepByOrder = relatedItems.reduce<
      Record<string, Array<{ prepStation: PrepStation; prepStatus: PrepStatus }>>
    >((acc, item) => {
      acc[item.orderId] ??= [];
      acc[item.orderId].push(item);
      return acc;
    }, {});

    const ticketsMap = new Map<
      string,
      {
        orderId: string;
        orderNo: string;
        tableNo: string | null;
        roomNo: string | null;
        type: string;
        orderStatus: OrderStatus;
        isPaid: boolean;
        note: string | null;
        createdAt: string;
        ageMinutes: number;
        urgency: 'normal' | 'warning' | 'critical';
        station: PrepStation;
        staff: { id: string; firstName: string; lastName: string } | null;
        items: Array<{
          id: string;
          name: string;
          quantity: number;
          note: string | null;
          prepStatus: PrepStatus;
          prepStartedAt: string | null;
          prepCompletedAt: string | null;
          bumpedAt: string | null;
        }>;
        prepSummary: ReturnType<PosOrdersService['buildPrepSummary']>;
      }
    >();

    for (const item of matchingItems) {
      const urgency = this.getPrepUrgency(item.order.createdAt);
      const prepSummary = this.buildPrepSummary(prepByOrder[item.orderId] ?? []);

      if (!ticketsMap.has(item.orderId)) {
        ticketsMap.set(item.orderId, {
          orderId: item.orderId,
          orderNo: item.order.orderNo,
          tableNo: item.order.tableNo,
          roomNo: item.order.roomNo,
          type: item.order.type,
          orderStatus: item.order.status,
          isPaid: item.order.isPaid,
          note: item.order.note,
          createdAt: item.order.createdAt.toISOString(),
          ageMinutes: urgency.ageMinutes,
          urgency: urgency.level,
          station: query.station,
          staff: item.order.staff,
          items: [],
          prepSummary,
        });
      }

      ticketsMap.get(item.orderId)!.items.push({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        note: item.note,
        prepStatus: item.prepStatus,
        prepStartedAt: item.prepStartedAt?.toISOString() ?? null,
        prepCompletedAt: item.prepCompletedAt?.toISOString() ?? null,
        bumpedAt: item.bumpedAt?.toISOString() ?? null,
      });
    }

    const tickets = [...ticketsMap.values()];
    const summary = {
      station: query.station,
      counts: {
        queued: matchingItems.filter((item) => item.prepStatus === PrepStatus.QUEUED).length,
        inProgress: matchingItems.filter((item) => item.prepStatus === PrepStatus.IN_PROGRESS).length,
        ready: matchingItems.filter((item) => item.prepStatus === PrepStatus.READY).length,
      },
      ageBuckets: {
        normal: tickets.filter((ticket) => ticket.urgency === 'normal').length,
        warning: tickets.filter((ticket) => ticket.urgency === 'warning').length,
        critical: tickets.filter((ticket) => ticket.urgency === 'critical').length,
      },
      totalTickets: tickets.length,
      totalItems: matchingItems.length,
    };

    return {
      station: query.station,
      statuses,
      summary,
      tickets,
    };
  }

  // ── List ───────────────────────────────────────────────────────────────────
  async findAll(hotelId: string, filters: OrderFilterDto) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 30;
    const skip = (page - 1) * limit;

    const where: any = { hotelId };
    if (filters.status) where.status = filters.status;
    if (filters.type) where.type = filters.type;
    if (filters.billing === 'room_charge') where.reservationId = { not: null };
    if (filters.billing === 'walk_in') where.reservationId = null;
    if (filters.posTerminalId) where.posTerminalId = filters.posTerminalId;
    if (filters.staffId) where.staffId = filters.staffId;
    if (filters.tableNo) where.tableNo = filters.tableNo;

    const rangeStart = filters.dateFrom
      ? dayjs(filters.dateFrom).startOf('day')
      : dayjs().startOf('day');
    const rangeEnd = filters.dateTo ? dayjs(filters.dateTo).endOf('day') : dayjs().endOf('day');
    if (!rangeStart.isValid() || !rangeEnd.isValid()) {
      throw new BadRequestException('Invalid date range.');
    }

    if (filters.dateFrom || filters.dateTo) {
      const todayStart = rangeStart.toDate();
      const todayEnd = rangeEnd.toDate();

      where.createdAt = { gte: todayStart, lte: todayEnd };
    }

    if (filters.search) {
      where.OR = [
        { orderNo: { contains: filters.search, mode: 'insensitive' } },
        { tableNo: { contains: filters.search, mode: 'insensitive' } },
        { roomNo: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [orders, total] = await Promise.all([
      this.prisma.posOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: ORDER_INCLUDE,
      }),
      this.prisma.posOrder.count({ where }),
    ]);

    // Today's stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [todayOrders, activeOrders] = await Promise.all([
      this.prisma.posOrder.findMany({
        where: {
          hotelId,
          createdAt: { gte: today, lt: tomorrow },
          status: { not: OrderStatus.CANCELLED },
        },
        select: { total: true, paymentMethod: true, isPaid: true },
      }),
      this.prisma.posOrder.count({
        where: {
          hotelId,
          status: { in: [OrderStatus.PENDING, OrderStatus.PREPARING, OrderStatus.READY] },
        },
      }),
    ]);

    const enrichedOrders = orders.map((order) => this.enrichOrder(order));
    const activeVisibleOrders = enrichedOrders.filter(
      (order) =>
        order.status === OrderStatus.PENDING ||
        order.status === OrderStatus.PREPARING ||
        order.status === OrderStatus.READY,
    );

    const todayRevenue = todayOrders
      .filter((o) => o.isPaid)
      .reduce((s, o) => s + Number(o.total), 0);
    const todayCount = todayOrders.length;
    const paymentMix = todayOrders.reduce((acc: Record<string, number>, o) => {
      const m = o.paymentMethod ?? 'UNKNOWN';
      acc[m] = (acc[m] ?? 0) + Number(o.total);
      return acc;
    }, {});
    const delayedOrders = activeVisibleOrders.filter(
      (order) => dayjs().diff(order.createdAt, 'minute') >= 20,
    ).length;
    const prepReadyOrders = activeVisibleOrders.filter((order) => order.prepSummary.isPrepComplete).length;
    const stationQueues = activeVisibleOrders.reduce(
      (acc, order) => {
        order.items.forEach((item) => {
          if (item.prepStatus !== PrepStatus.QUEUED) return;
          if (item.prepStation === PrepStation.KITCHEN) acc.kitchen += 1;
          if (item.prepStation === PrepStation.BAR) acc.bar += 1;
        });
        return acc;
      },
      { kitchen: 0, bar: 0 },
    );

    return {
      orders: enrichedOrders,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      meta: {
        total,
        current_page: page,
        last_page: Math.ceil(total / limit),
        per_page: limit,
        from: skip + 1,
        to: Math.min(skip + limit, total),
      },
      stats: {
        todayRevenue,
        todayCount,
        activeOrders,
        paymentMix,
        prepReadyOrders,
        delayedOrders,
        stationQueues,
      },
    };
  }

  // ── Single ─────────────────────────────────────────────────────────────────
  async findOne(hotelId: string, id: string) {
    const order = await this.prisma.posOrder.findFirst({
      where: { id, hotelId },
      include: ORDER_INCLUDE,
    });
    if (!order) throw new NotFoundException('Order not found.');
    return this.enrichOrder(order);
  }

  // ── Create ─────────────────────────────────────────────────────────────────
  async create(hotelId: string, dto: CreateOrderDto) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Order must have at least one item.');
    }

    const terminalContext = await this.resolveTerminalOperator({
      hotelId,
      posTerminalId: dto.posTerminalId,
      terminalDeviceKey: dto.terminalDeviceKey,
      staffId: dto.staffId,
    });

    await this.validateOrderOwnershipFields(hotelId, {
      ...dto,
      posTerminalId: terminalContext.posTerminalId ?? undefined,
      staffId: terminalContext.staffId ?? undefined,
    });

    // Validate reservation if provided
    if (dto.reservationId) {
      const res = await this.prisma.reservation.findFirst({
        where: { id: dto.reservationId, hotelId, status: 'CHECKED_IN' },
      });
      if (!res) throw new NotFoundException('Active reservation not found for room charge.');
    }

    // Fetch all products in one query
    const productIds = dto.items.map((i) => i.productId);
    const products = await this.prisma.posProduct.findMany({
      where: { id: { in: productIds }, hotelId },
    });

    if (products.length !== productIds.length) {
      throw new NotFoundException('One or more products not found.');
    }

    const unavailable = products.find((p) => !p.isAvailable);
    if (unavailable) {
      throw new BadRequestException(`"${unavailable.name}" is not currently available.`);
    }

    // Calculate totals
    const hotel = await this.prisma.hotel.findUnique({
      where: { id: hotelId },
      select: { taxRate: true },
    });
    const taxRate = Number(hotel?.taxRate ?? 0) / 100;

    const lineItems = dto.items.map((item) => {
      const product = products.find((p) => p.id === item.productId)!;
      const total = Number(product.price) * item.quantity;
      return { ...item, product, total, price: Number(product.price) };
    });

    const subtotal = lineItems.reduce((s, i) => s + i.total, 0);
    const discount = dto.discount ?? 0;
    const taxable = subtotal - discount;
    const tax = Math.round(taxable * taxRate * 100) / 100;
    const total = taxable + tax;

    // Generate unique order number
    let orderNo: string;
    let attempts = 0;
    do {
      orderNo = genOrderNo();
      const exists = await this.prisma.posOrder.findUnique({ where: { orderNo } });
      if (!exists) break;
    } while (++attempts < 5);

    const order = await this.prisma.posOrder.create({
      data: {
        hotelId,
        orderNo: orderNo!,
        type: dto.type,
        tableNo: dto.tableNo,
        roomNo: dto.roomNo,
        reservationId: dto.reservationId,
        posTerminalId: terminalContext.posTerminalId,
        staffId: terminalContext.staffId,
        note: dto.note,
        subtotal,
        tax,
        discount,
        total,
        status: OrderStatus.PENDING,
        isPaid: false,
        items: {
          create: lineItems.map((item) => ({
            productId: item.productId,
            name: item.product.name,
            price: item.price,
            quantity: item.quantity,
            total: item.total,
            note: item.note,
            prepStation: (item.product.prepStation as PrepStation | null) ?? PrepStation.NONE,
          })),
        },
      },
      include: ORDER_INCLUDE,
    });

    this.emitOrderSync('created', order);
    order.items.forEach((item) => {
      this.emitPrepSync('queued', {
        hotelId: order.hotelId,
        orderId: order.id,
        orderNo: order.orderNo,
        orderItemId: item.id,
        prepStation: item.prepStation,
        prepStatus: item.prepStatus,
        tableNo: order.tableNo,
        roomNo: order.roomNo,
        itemName: item.name,
        quantity: item.quantity,
        orderType: order.type,
        note: item.note,
      });
    });

    return this.enrichOrder(order);
  }

  private async validateOrderOwnershipFields(hotelId: string, dto: CreateOrderDto) {
    const [staff, terminal] = await Promise.all([
      dto.staffId
        ? this.prisma.staff.findFirst({
            where: { id: dto.staffId, hotelId },
            select: { id: true },
          })
        : Promise.resolve(null),
      dto.posTerminalId
        ? this.prisma.posTerminal.findFirst({
            where: { id: dto.posTerminalId, hotelId },
            select: { id: true },
          })
        : Promise.resolve(null),
    ]);

    if (dto.staffId && !staff) {
      throw new BadRequestException('Staff not found for this hotel.');
    }

    if (dto.posTerminalId && !terminal) {
      throw new BadRequestException('POS terminal not found for this hotel.');
    }
  }

  // ── Add item to existing order ─────────────────────────────────────────────
  async addItem(hotelId: string, orderId: string, dto: AddItemDto) {
    const order = await this.findOne(hotelId, orderId);
    if (!['PENDING', 'PREPARING'].includes(order.status)) {
      throw new BadRequestException(`Cannot add items to an order with status ${order.status}.`);
    }

    const product = await this.prisma.posProduct.findFirst({
      where: { id: dto.productId, hotelId, isAvailable: true },
    });
    if (!product) throw new NotFoundException('Product not found or unavailable.');

    const itemTotal = Number(product.price) * dto.quantity;

    const createdItem = await this.prisma.posOrderItem.create({
      data: {
        orderId,
        productId: dto.productId,
        name: product.name,
        price: Number(product.price),
        quantity: dto.quantity,
        total: itemTotal,
        note: dto.note,
        prepStation: product.prepStation,
      },
    });

    const updated = await this.recalcAndSave(orderId);
    this.emitOrderSync('updated', updated);
    this.emitPrepSync('queued', {
      hotelId: updated.hotelId,
      orderId: updated.id,
      orderNo: updated.orderNo,
      orderItemId: createdItem.id,
      prepStation: createdItem.prepStation,
      prepStatus: createdItem.prepStatus,
      tableNo: updated.tableNo,
      roomNo: updated.roomNo,
      itemName: createdItem.name,
      quantity: createdItem.quantity,
      orderType: updated.type,
      note: createdItem.note,
    });
    return this.enrichOrder(updated);
  }

  // ── Update item quantity ───────────────────────────────────────────────────
  async updateItem(hotelId: string, orderId: string, itemId: string, dto: UpdateItemDto) {
    const order = await this.findOne(hotelId, orderId);
    if (!['PENDING', 'PREPARING'].includes(order.status)) {
      throw new BadRequestException('Cannot modify a delivered or cancelled order.');
    }

    const item = await this.prisma.posOrderItem.findFirst({
      where: { id: itemId, orderId },
    });
    if (!item) throw new NotFoundException('Item not found.');

    if (dto.quantity === 0) {
      const orderForDelete = order;
      await this.prisma.posOrderItem.delete({ where: { id: item.id } });
      this.emitPrepSync('cancelled', {
        hotelId,
        orderId,
        orderNo: orderForDelete.orderNo,
        orderItemId: item.id,
        prepStation: item.prepStation,
        prepStatus: PrepStatus.CANCELLED,
        tableNo: orderForDelete.tableNo,
        roomNo: orderForDelete.roomNo,
        itemName: item.name,
        quantity: item.quantity,
        orderType: orderForDelete.type,
        note: item.note,
      });
    } else {
      await this.prisma.posOrderItem.update({
        where: { id: item.id },
        data: {
          quantity: dto.quantity,
          total: dto.quantity ? Number(item.price) * dto.quantity : undefined,
          note: dto.note,
        },
      });
    }

    const updated = await this.recalcAndSave(orderId);
    this.emitOrderSync('updated', updated);
    return this.enrichOrder(updated);
  }

  async updatePrepStatus(
    hotelId: string,
    userId: string,
    staffId: string | null,
    orderId: string,
    itemId: string,
    status: PrepStatus,
  ) {
    const item = await this.prisma.posOrderItem.findFirst({
      where: {
        id: itemId,
        orderId,
        order: { hotelId },
      },
      include: {
        order: {
          select: {
            id: true,
            hotelId: true,
            orderNo: true,
            tableNo: true,
            roomNo: true,
            type: true,
            status: true,
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundException('Order item not found.');
    }

    if (item.order.status === OrderStatus.CANCELLED || item.order.status === OrderStatus.DELIVERED) {
      throw new BadRequestException('Prep items on delivered or cancelled orders cannot be updated.');
    }

    if (item.prepStation === PrepStation.NONE) {
      throw new BadRequestException('This item is not routed to a prep station.');
    }

    await this.assertPrepPermission(userId, item.prepStation, 'update');

    if (item.prepStatus === status) {
      const order = await this.findOne(hotelId, orderId);
      return order;
    }

    if (!PREP_TRANSITIONS[item.prepStatus].includes(status)) {
      throw new BadRequestException(
        `Cannot transition prep status from ${item.prepStatus} to ${status}.`,
      );
    }

    const now = new Date();
    await this.prisma.posOrderItem.update({
      where: { id: item.id },
      data: {
        prepStatus: status,
        prepStartedAt:
          status === PrepStatus.IN_PROGRESS
            ? item.prepStartedAt ?? now
            : status === PrepStatus.QUEUED
              ? null
              : undefined,
        prepCompletedAt:
          status === PrepStatus.READY || status === PrepStatus.FULFILLED
            ? item.prepCompletedAt ?? now
            : status === PrepStatus.IN_PROGRESS || status === PrepStatus.QUEUED
              ? null
              : undefined,
        bumpedAt: status === PrepStatus.FULFILLED ? now : undefined,
        bumpedByStaffId: status === PrepStatus.FULFILLED ? staffId : undefined,
      },
    });

    const refreshedItems = await this.prisma.posOrderItem.findMany({
      where: { orderId },
      select: {
        prepStation: true,
        prepStatus: true,
      },
    });
    const nextOrderStatus = this.deriveOperationalOrderStatus(item.order.status, refreshedItems);

    const updateData =
      nextOrderStatus !== item.order.status ? { status: nextOrderStatus } : {};

    const updatedOrder = await this.prisma.posOrder.update({
      where: { id: orderId },
      data: updateData,
      include: ORDER_INCLUDE,
    });

    this.emitPrepSync(this.prepActionForStatus(status), {
      hotelId,
      orderId,
      orderNo: item.order.orderNo,
      orderItemId: item.id,
      prepStation: item.prepStation,
      prepStatus: status,
      tableNo: item.order.tableNo,
      roomNo: item.order.roomNo,
      itemName: item.name,
      quantity: item.quantity,
      orderType: item.order.type,
      note: item.note,
    });

    if (nextOrderStatus !== item.order.status) {
      this.emitOrderSync('status_changed', updatedOrder);
    } else {
      this.emitOrderSync('updated', updatedOrder);
    }

    return this.enrichOrder(updatedOrder);
  }

  // ── Update order status ────────────────────────────────────────────────────
  async updateStatus(
    hotelId: string,
    actorUserId: string,
    id: string,
    dto: UpdateStatusDto,
    meta?: { ipAddress?: string | null; userAgent?: string | null },
  ) {
    const order = await this.findOne(hotelId, id);
    const status = dto.status;

    await this.assertTerminalOrderAccess({
      hotelId,
      order,
      posTerminalId: dto.posTerminalId,
      terminalDeviceKey: dto.terminalDeviceKey,
    });

    const validTransitions: Record<string, string[]> = {
      PENDING: ['PREPARING', 'READY', 'DELIVERED', 'CANCELLED'],
      PREPARING: ['READY', 'DELIVERED', 'CANCELLED'],
      READY: ['DELIVERED', 'CANCELLED'],
      DELIVERED: [],
      CANCELLED: [],
    };

    if (!validTransitions[order.status]?.includes(status)) {
      throw new BadRequestException(`Cannot transition from ${order.status} to ${status}.`);
    }

    // DELIVERED triggers inventory deduction + journal entries
    if (status === OrderStatus.DELIVERED) {
      const prepSummary = this.buildPrepSummary(order.items);
      if (!prepSummary.isPrepComplete) {
        throw new BadRequestException('All routed prep items must be ready before delivery.');
      }
      return this.fulfillOrder(hotelId, actorUserId, id, order, meta);
    }

    const updated = await this.prisma.posOrder.update({
      where: { id },
      data: { status },
      include: ORDER_INCLUDE,
    });
    await this.logAudit({
      actorUserId,
      hotelId,
      action: 'pos.order.status_updated',
      targetId: updated.id,
      ipAddress: meta?.ipAddress ?? null,
      userAgent: meta?.userAgent ?? null,
      metadata: {
        orderNo: updated.orderNo,
        status: updated.status,
      },
    });
    this.emitOrderSync('status_changed', updated);
    return this.enrichOrder(updated);
  }

  // ── Fulfil order (DELIVERED) — the big one ────────────────────────────────
  private async fulfillOrder(
    hotelId: string,
    actorUserId: string,
    id: string,
    order: any,
    meta?: { ipAddress?: string | null; userAgent?: string | null },
  ) {
    const result = await this.prisma.$transaction(async (tx) => {
      let createdFolio: {
        id: string;
        reservationId: string;
        description: string;
        amount: number;
        category: string;
      } | null = null;
      // 1. Mark order as DELIVERED
      await tx.posOrder.update({
        where: { id },
        data: { status: OrderStatus.DELIVERED },
      });

      // 2. Deduct inventory for each order item
      for (const item of order.items) {
        const ingredients = await tx.productIngredient.findMany({
          where: { productId: item.productId, hotelId },
          include: { inventoryItem: true },
        });

        for (const ing of ingredients) {
          const deductQty = Number(ing.quantity) * item.quantity;
          if (Number(ing.inventoryItem.quantity) < deductQty) {
            throw new BadRequestException(
              `Insufficient stock for ${ing.inventoryItem.name}. Available: ${ing.inventoryItem.quantity}.`,
            );
          }

          // Deduct from inventory
          await tx.inventoryItem.update({
            where: { id: ing.inventoryItemId },
            data: { quantity: { decrement: deductQty } },
          });

          // Record stock movement
          await tx.stockMovement.create({
            data: {
              hotelId,
              itemId: ing.inventoryItemId,
              type: 'OUT',
              quantity: deductQty,
              sourceType: 'POS_SALE',
              sourceId: id,
              note: `${item.name} × ${item.quantity} — ${order.orderNo}`,
            },
          });
        }

        // For products using direct stock (no ingredients)
        const hasIngredients = await tx.productIngredient.count({
          where: { productId: item.productId, hotelId },
        });
        if (hasIngredients === 0) {
          // Deduct direct stock if tracked
          const product = await tx.posProduct.findFirst({
            where: { id: item.productId, hotelId },
            select: { stock: true },
          });
          if (product?.stock !== null && product?.stock !== undefined) {
            if (product.stock < item.quantity) {
              throw new BadRequestException(`Insufficient direct stock for ${item.name}.`);
            }
            await tx.posProduct.update({
              where: { id: item.productId },
              data: { stock: { decrement: item.quantity } },
            });
          }
        }
      }

      // 3. Room charge path — create FolioItem on reservation
      if (order.reservationId) {
        const description = `POS charge — ${order.orderNo} (${order.type.replace('_', ' ')})`;
        const created = await tx.folioItem.create({
          data: {
            hotelId,
            reservationId: order.reservationId,
            description,
            amount: order.total,
            quantity: 1,
            category: this.mapOrderTypeToFolioCategory(order.type),
            posOrderId: id,
          },
        });
        createdFolio = {
          id: created.id,
          reservationId: created.reservationId,
          description: created.description,
          amount: Number(created.amount),
          category: created.category,
        };

        // Update reservation paymentStatus to PARTIAL if previously UNPAID
        const res = await tx.reservation.findUnique({
          where: { id: order.reservationId },
          select: { paymentStatus: true, totalAmount: true, paidAmount: true },
        });
        if (res && res.paymentStatus === 'UNPAID') {
          await tx.reservation.update({
            where: { id: order.reservationId },
            data: { paymentStatus: 'PARTIAL' },
          });
        }
      }

      // 4. Walk-in path — auto-create Invoice (payment recorded separately via PayOrderDto)
      // Invoice is created here but payment is recorded when guest actually pays
      // The order stays isPaid=false until payOrder() is called
      const invoiceNo = await this.genUniqueInvoiceNo(tx, order.orderNo);
      const invoice = await tx.invoice.create({
        data: {
          hotelId,
          posOrderId: id,
          invoiceNo,
          type: 'POS',
          subtotal: order.subtotal,
          tax: order.tax,
          discount: order.discount,
          total: order.total,
          paymentStatus: 'UNPAID',
        },
      });

      const updated = await tx.posOrder.findFirst({
        where: { id },
        include: ORDER_INCLUDE,
      });

      return { updated, createdFolio };
    });

    if (result.createdFolio) {
      await this.ledger.postFolioCharge(hotelId, {
        amount: result.createdFolio.amount,
        category: result.createdFolio.category,
        description: result.createdFolio.description,
        reservationId: result.createdFolio.reservationId,
        folioItemId: result.createdFolio.id,
      });
    }

    if (result.updated) {
      await this.logAudit({
        actorUserId,
        hotelId,
        action: 'pos.order.delivered',
        targetId: result.updated.id,
        ipAddress: meta?.ipAddress ?? null,
        userAgent: meta?.userAgent ?? null,
        metadata: {
          orderNo: result.updated.orderNo,
          status: result.updated.status,
          isPaid: result.updated.isPaid,
        },
      });
      this.emitOrderSync('status_changed', result.updated);
    }

    return result.updated ? this.enrichOrder(result.updated) : result.updated;
  }

  // ── Pay order (walk-in direct payment) ────────────────────────────────────
  async payOrder(
    hotelId: string,
    actorUserId: string,
    id: string,
    dto: PayOrderDto,
    meta?: { ipAddress?: string | null; userAgent?: string | null },
  ) {
    const order = await this.findOne(hotelId, id);

    await this.assertTerminalOrderAccess({
      hotelId,
      order,
      posTerminalId: dto.posTerminalId,
      terminalDeviceKey: dto.terminalDeviceKey,
    });

    if (order.status !== OrderStatus.DELIVERED) {
      throw new BadRequestException('Order must be delivered before payment.');
    }
    if (order.isPaid) {
      throw new BadRequestException('Order is already paid.');
    }
    if (order.reservationId) {
      throw new BadRequestException('Room charge orders are settled at checkout — not here.');
    }
    if (dto.method === 'CASH' && dto.amountTendered !== undefined && dto.amountTendered < Number(order.total)) {
      throw new BadRequestException('Amount tendered cannot be less than order total.');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // Find the invoice created at fulfillment
      const invoice = await tx.invoice.findFirst({
        where: { posOrderId: id, hotelId },
      });
      if (!invoice) throw new NotFoundException('Invoice not found for this order.');

      // Record payment
      await tx.payment.create({
        data: {
          hotelId,
          invoiceId: invoice.id,
          amount: order.total,
          method: dto.method,
          reference: dto.reference,
          note: dto.note,
          paidAt: new Date(),
        },
      });

      // Mark invoice as PAID
      await tx.invoice.update({
        where: { id: invoice.id },
        data: { paymentStatus: 'PAID' },
      });

      // Mark order as paid
      const updated = await tx.posOrder.update({
        where: { id },
        data: { isPaid: true, paymentMethod: dto.method },
        include: ORDER_INCLUDE,
      });

      // Calculate change if cash
      const change =
        dto.method === 'CASH' && dto.amountTendered ? dto.amountTendered - Number(order.total) : 0;

      return { order: updated, invoice, change: Math.max(0, change) };
    });

    await this.ledger.postPosSale(hotelId, {
      subtotal: Number(result.order.subtotal),
      tax: Number(result.order.tax),
      total: Number(result.order.total),
      orderType: result.order.type,
      method: dto.method,
      orderId: result.order.id,
      invoiceId: result.invoice.id,
    });

    await this.logAudit({
      actorUserId,
      hotelId,
      action: 'pos.order.payment_recorded',
      targetId: result.order.id,
      ipAddress: meta?.ipAddress ?? null,
      userAgent: meta?.userAgent ?? null,
      metadata: {
        orderNo: result.order.orderNo,
        method: dto.method,
        isPaid: result.order.isPaid,
        amount: Number(result.order.total),
      },
    });
    this.emitOrderSync('paid', result.order);
    return result;
  }

  // ── Cancel order ───────────────────────────────────────────────────────────
  async cancel(hotelId: string, id: string, reason?: string) {
    const order = await this.findOne(hotelId, id);

    if (order.status === OrderStatus.DELIVERED) {
      throw new BadRequestException(
        'Delivered orders cannot be cancelled. Use void/retirement instead.',
      );
    }
    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Order is already cancelled.');
    }

    const updated = await this.prisma.posOrder.update({
      where: { id },
      data: {
        status: OrderStatus.CANCELLED,
        note: reason ?? order.note,
        items: {
          updateMany: {
            where: { prepStation: { not: PrepStation.NONE } },
            data: { prepStatus: PrepStatus.CANCELLED },
          },
        },
      },
      include: ORDER_INCLUDE,
    });
    this.emitOrderSync('cancelled', updated);
    updated.items.forEach((item) => {
      this.emitPrepSync('cancelled', {
        hotelId: updated.hotelId,
        orderId: updated.id,
        orderNo: updated.orderNo,
        orderItemId: item.id,
        prepStation: item.prepStation,
        prepStatus: item.prepStatus,
        tableNo: updated.tableNo,
        roomNo: updated.roomNo,
        itemName: item.name,
        quantity: item.quantity,
        orderType: updated.type,
        note: item.note,
      });
    });
    return this.enrichOrder(updated);
  }

  // ── Close table (aggregate all orders for a table) ─────────────────────────
  async closeTable(hotelId: string, tableNo: string) {
    const orders = await this.prisma.posOrder.findMany({
      where: {
        hotelId,
        tableNo,
        status: {
          in: [
            OrderStatus.PENDING,
            OrderStatus.PREPARING,
            OrderStatus.READY,
            OrderStatus.DELIVERED,
          ],
        },
        isPaid: false,
      },
      include: { items: true },
    });

    if (orders.length === 0) {
      throw new NotFoundException(`No open orders for table ${tableNo}.`);
    }

    const unpaidDelivered = orders.filter((o) => o.status === OrderStatus.DELIVERED);
    const undelivered = orders.filter((o) => o.status !== OrderStatus.DELIVERED);

    const total = orders.reduce((s, o) => s + Number(o.total), 0);
    const itemCount = orders.reduce((s, o) => s + o.items.length, 0);
    const orderIds = orders.map((o) => o.id);

    return {
      tableNo,
      orders: orders.length,
      itemCount,
      total,
      unpaidDelivered: unpaidDelivered.length,
      undelivered: undelivered.length,
      orderIds,
      message:
        undelivered.length > 0
          ? `${undelivered.length} order(s) not yet delivered. Deliver all before closing.`
          : `Table ${tableNo} ready to close. Total: ₦${total.toLocaleString()}`,
    };
  }

  // ── Z-report for a terminal/shift ──────────────────────────────────────────
  async getZReport(
    hotelId: string,
    options: {
      posTerminalId?: string;
      date?: string;
      staffId?: string;
    },
  ) {
    const day = options.date ? new Date(options.date) : new Date();
    const start = new Date(day);
    start.setHours(0, 0, 0, 0);
    const end = new Date(day);
    end.setHours(23, 59, 59, 999);

    const where: any = {
      hotelId,
      createdAt: { gte: start, lte: end },
      status: { not: OrderStatus.CANCELLED },
    };
    if (options.posTerminalId) {
      const terminal = await this.prisma.posTerminal.findFirst({
        where: { id: options.posTerminalId, hotelId },
        select: { id: true },
      });
      if (!terminal) throw new NotFoundException('Terminal not found.');
      where.posTerminalId = options.posTerminalId;
    }
    if (options.staffId) {
      const staff = await this.prisma.staff.findFirst({
        where: { id: options.staffId, hotelId },
        select: { id: true },
      });
      if (!staff) throw new NotFoundException('Staff not found.');
      where.staffId = options.staffId;
    }

    const orders = await this.prisma.posOrder.findMany({
      where,
      include: {
        items: true,
        posTerminal: { select: { name: true } },
      },
    });

    const paid = orders.filter((o) => o.isPaid);
    const unpaid = orders.filter((o) => !o.isPaid && o.status === OrderStatus.DELIVERED);

    // Revenue by payment method
    const byMethod = paid.reduce((acc: Record<string, number>, o) => {
      const m = o.paymentMethod ?? 'UNKNOWN';
      acc[m] = (acc[m] ?? 0) + Number(o.total);
      return acc;
    }, {});

    // Revenue by order type
    const byType = orders.reduce((acc: Record<string, number>, o) => {
      acc[o.type] = (acc[o.type] ?? 0) + Number(o.total);
      return acc;
    }, {});

    // Top selling items
    const itemMap: Record<string, { name: string; qty: number; revenue: number }> = {};
    orders.forEach((o) => {
      o.items.forEach((item) => {
        if (!itemMap[item.productId]) {
          itemMap[item.productId] = { name: item.name, qty: 0, revenue: 0 };
        }
        itemMap[item.productId].qty += item.quantity;
        itemMap[item.productId].revenue += Number(item.total);
      });
    });
    const topItems = Object.values(itemMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    return {
      date: day.toISOString().slice(0, 10),
      terminal: options.posTerminalId ?? 'All Terminals',
      totalOrders: orders.length,
      paidOrders: paid.length,
      unpaidOrders: unpaid.length,
      grossRevenue: orders.reduce((s, o) => s + Number(o.total), 0),
      netRevenue: paid.reduce((s, o) => s + Number(o.total), 0),
      totalTax: paid.reduce((s, o) => s + Number(o.tax), 0),
      totalDiscount: orders.reduce((s, o) => s + Number(o.discount), 0),
      byMethod,
      byType,
      topItems,
      openTables: [...new Set(orders.filter((o) => !o.isPaid && o.tableNo).map((o) => o.tableNo))],
    };
  }

  // ── Private helpers ────────────────────────────────────────────────────────
  private async recalcAndSave(orderId: string) {
    const items = await this.prisma.posOrderItem.findMany({ where: { orderId } });
    const subtotal = items.reduce((s, i) => s + Number(i.total), 0);

    const order = await this.prisma.posOrder.findUnique({
      where: { id: orderId },
      select: { discount: true, hotelId: true },
    });

    const hotel = await this.prisma.hotel.findUnique({
      where: { id: order!.hotelId },
      select: { taxRate: true },
    });
    const taxRate = Number(hotel?.taxRate ?? 0) / 100;
    const discount = Number(order!.discount ?? 0);
    const taxable = subtotal - discount;
    const tax = Math.round(taxable * taxRate * 100) / 100;
    const total = taxable + tax;

    return this.prisma.posOrder.update({
      where: { id: orderId },
      data: {
        subtotal,
        tax,
        total,
        status: this.deriveOperationalOrderStatus(
          (
            await this.prisma.posOrder.findUnique({
              where: { id: orderId },
              select: { status: true },
            })
          )!.status,
          items.map((item) => ({
            prepStation: item.prepStation,
            prepStatus: item.prepStatus,
          })),
        ),
      },
      include: ORDER_INCLUDE,
    });
  }

  private mapOrderTypeToFolioCategory(type: string): string {
    const map: Record<string, string> = {
      ROOM_SERVICE: 'FOOD',
      DINE_IN: 'FOOD',
      TAKEAWAY: 'FOOD',
      RETAIL: 'MISC',
    };
    return map[type] ?? 'MISC';
  }

  private async genUniqueInvoiceNo(tx: any, orderNo: string): Promise<string> {
    let invoiceNo = genInvoiceNo(orderNo);
    let attempt = 0;
    while (await tx.invoice.findUnique({ where: { invoiceNo } })) {
      attempt++;
      invoiceNo = `${genInvoiceNo(orderNo)}-${attempt}`;
      if (attempt > 10) throw new ConflictException('Could not generate unique invoice number.');
    }
    return invoiceNo;
  }
}
