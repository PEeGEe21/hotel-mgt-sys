import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { OrderStatus } from '@prisma/client';
import { genInvoiceNo, genOrderNo } from 'src/common/utils/orders.utils';
import { PayOrderDto } from '../dtos/orders/pay-order.dto';
import { UpdateItemDto } from '../dtos/orders/update-item.dto';
import { AddItemDto } from '../dtos/orders/add-item.dto';
import { CreateOrderDto } from '../dtos/orders/create-order.dto';
import { OrderFilterDto } from '../dtos/orders/order-filter.dto';
import dayjs from 'dayjs';
import { LedgerService } from '../../ledger/ledger.service';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ORDER_INCLUDE = {
  items: {
    include: {
      product: {
        select: { id: true, name: true, type: true, category: true, unit: true },
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

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class PosOrdersService {
  constructor(
    private prisma: PrismaService,
    private ledger: LedgerService,
  ) {}

  // ── List ───────────────────────────────────────────────────────────────────
  async findAll(hotelId: string, filters: OrderFilterDto) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 30;
    const skip = (page - 1) * limit;

    const where: any = { hotelId };
    if (filters.status) where.status = filters.status;
    if (filters.type) where.type = filters.type;
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

      console.log(filters.dateFrom);
      where.createdAt = { gte: todayStart, lte: todayEnd };
    }

    if (filters.search) {
      where.OR = [
        { orderNo: { contains: filters.search, mode: 'insensitive' } },
        { tableNo: { contains: filters.search, mode: 'insensitive' } },
        { roomNo: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    console.log(filters, 'ccw');
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

    const todayRevenue = todayOrders
      .filter((o) => o.isPaid)
      .reduce((s, o) => s + Number(o.total), 0);
    const todayCount = todayOrders.length;
    const paymentMix = todayOrders.reduce((acc: Record<string, number>, o) => {
      const m = o.paymentMethod ?? 'UNKNOWN';
      acc[m] = (acc[m] ?? 0) + Number(o.total);
      return acc;
    }, {});

    return {
      orders,
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
      stats: { todayRevenue, todayCount, activeOrders, paymentMix },
    };
  }

  // ── Single ─────────────────────────────────────────────────────────────────
  async findOne(hotelId: string, id: string) {
    const order = await this.prisma.posOrder.findFirst({
      where: { id, hotelId },
      include: ORDER_INCLUDE,
    });
    if (!order) throw new NotFoundException('Order not found.');
    return order;
  }

  // ── Create ─────────────────────────────────────────────────────────────────
  async create(hotelId: string, dto: CreateOrderDto) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Order must have at least one item.');
    }

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
        posTerminalId: dto.posTerminalId,
        staffId: dto.staffId,
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
          })),
        },
      },
      include: ORDER_INCLUDE,
    });

    return order;
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

    await this.prisma.posOrderItem.create({
      data: {
        orderId,
        productId: dto.productId,
        name: product.name,
        price: Number(product.price),
        quantity: dto.quantity,
        total: itemTotal,
        note: dto.note,
      },
    });

    return this.recalcAndSave(orderId);
  }

  // ── Update item quantity ───────────────────────────────────────────────────
  async updateItem(hotelId: string, orderId: string, itemId: string, dto: UpdateItemDto) {
    const order = await this.findOne(hotelId, orderId);
    if (!['PENDING', 'PREPARING'].includes(order.status)) {
      throw new BadRequestException('Cannot modify a delivered or cancelled order.');
    }

    if (dto.quantity === 0) {
      await this.prisma.posOrderItem.delete({ where: { id: itemId } });
    } else {
      const item = await this.prisma.posOrderItem.findFirst({
        where: { id: itemId, orderId },
      });
      if (!item) throw new NotFoundException('Item not found.');

      await this.prisma.posOrderItem.update({
        where: { id: itemId },
        data: {
          quantity: dto.quantity,
          total: dto.quantity ? Number(item.price) * dto.quantity : undefined,
          note: dto.note,
        },
      });
    }

    return this.recalcAndSave(orderId);
  }

  // ── Update order status ────────────────────────────────────────────────────
  async updateStatus(hotelId: string, id: string, status: OrderStatus) {
    const order = await this.findOne(hotelId, id);

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
      return this.fulfillOrder(hotelId, id, order);
    }

    return this.prisma.posOrder.update({
      where: { id },
      data: { status },
      include: ORDER_INCLUDE,
    });
  }

  // ── Fulfil order (DELIVERED) — the big one ────────────────────────────────
  private async fulfillOrder(hotelId: string, id: string, order: any) {
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
          where: { productId: item.productId },
          include: { inventoryItem: true },
        });

        for (const ing of ingredients) {
          const deductQty = Number(ing.quantity) * item.quantity;

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
          where: { productId: item.productId },
        });
        if (hasIngredients === 0) {
          // Deduct direct stock if tracked
          const product = await tx.posProduct.findUnique({
            where: { id: item.productId },
            select: { stock: true },
          });
          if (product?.stock !== null && product?.stock !== undefined) {
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

    return result.updated;
  }

  // ── Pay order (walk-in direct payment) ────────────────────────────────────
  async payOrder(hotelId: string, id: string, dto: PayOrderDto) {
    const order = await this.findOne(hotelId, id);

    if (order.status !== OrderStatus.DELIVERED) {
      throw new BadRequestException('Order must be delivered before payment.');
    }
    if (order.isPaid) {
      throw new BadRequestException('Order is already paid.');
    }
    if (order.reservationId) {
      throw new BadRequestException('Room charge orders are settled at checkout — not here.');
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

    return this.prisma.posOrder.update({
      where: { id },
      data: { status: OrderStatus.CANCELLED, note: reason ?? order.note },
      include: ORDER_INCLUDE,
    });
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
    if (options.posTerminalId) where.posTerminalId = options.posTerminalId;
    if (options.staffId) where.staffId = options.staffId;

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
      data: { subtotal, tax, total },
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
