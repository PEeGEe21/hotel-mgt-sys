import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import dayjs from 'dayjs';

type RangeInput = { from?: string; to?: string };

type Range = { from: Date; to: Date };

const REVENUE_TYPES = new Set(['RESERVATION', 'POS']);

function resolveRange(params: RangeInput): Range {
  const hasFrom = !!params.from;
  const hasTo = !!params.to;

  if (!hasFrom && !hasTo) {
    return {
      from: dayjs().startOf('month').toDate(),
      to: dayjs().endOf('month').toDate(),
    };
  }

  const from = hasFrom ? dayjs(params.from).startOf('day') : dayjs().startOf('month');
  const to = hasTo ? dayjs(params.to).endOf('day') : dayjs().endOf('month');

  if (!from.isValid() || !to.isValid()) {
    return {
      from: dayjs().startOf('month').toDate(),
      to: dayjs().endOf('month').toDate(),
    };
  }

  return { from: from.toDate(), to: to.toDate() };
}

function pctChange(current: number, previous: number | null) {
  if (previous === null || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

@Injectable()
export class FinanceService {
  constructor(private prisma: PrismaService) {}

  private async computeTotals(hotelId: string, range: Range) {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        hotelId,
        issuedAt: { gte: range.from, lte: range.to },
      },
      include: { payments: true },
    });

    let revenue = 0;
    let expenses = 0;
    let outstanding = 0;

    for (const inv of invoices) {
      const total = Number(inv.total);
      const paid = inv.payments.reduce((s, p) => s + Number(p.amount), 0);
      const balance = Math.max(total - paid, 0);

      if (REVENUE_TYPES.has(inv.type)) revenue += total;
      else expenses += total;

      if (inv.paymentStatus !== 'PAID' && inv.paymentStatus !== 'REFUNDED') {
        outstanding += balance;
      }
    }

    return { revenue, expenses, net: revenue - expenses, outstanding };
  }

  async getOverview(hotelId: string, params: RangeInput) {
    const range = resolveRange(params);
    const current = await this.computeTotals(hotelId, range);

    const days = dayjs(range.to).diff(dayjs(range.from), 'day') + 1;
    const prevTo = dayjs(range.from).subtract(1, 'day').endOf('day');
    const prevFrom = prevTo.subtract(days - 1, 'day').startOf('day');
    const previous = await this.computeTotals(hotelId, { from: prevFrom.toDate(), to: prevTo.toDate() });

    return {
      range: { from: range.from.toISOString(), to: range.to.toISOString() },
      ...current,
      changes: {
        revenue: pctChange(current.revenue, previous.revenue),
        expenses: pctChange(current.expenses, previous.expenses),
        net: pctChange(current.net, previous.net),
        outstanding: pctChange(current.outstanding, previous.outstanding),
      },
    };
  }

  async listInvoices(
    hotelId: string,
    params: {
      from?: string;
      to?: string;
      search?: string;
      status?: string;
      type?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const range = resolveRange(params);
    const page = params.page ?? 1;
    const limit = params.limit ?? 200;
    const skip = (page - 1) * limit;
    const now = new Date();

    const where: any = {
      hotelId,
      issuedAt: { gte: range.from, lte: range.to },
    };

    if (params.type) where.type = params.type;

    if (params.search) {
      where.OR = [
        { invoiceNo: { contains: params.search, mode: 'insensitive' } },
        { reservation: { reservationNo: { contains: params.search, mode: 'insensitive' } } },
        { reservation: { guest: { firstName: { contains: params.search, mode: 'insensitive' } } } },
        { reservation: { guest: { lastName: { contains: params.search, mode: 'insensitive' } } } },
        { posOrder: { orderNo: { contains: params.search, mode: 'insensitive' } } },
        { posOrder: { roomNo: { contains: params.search, mode: 'insensitive' } } },
      ];
    }

    if (params.status) {
      if (params.status === 'OVERDUE') {
        where.AND = [
          { dueAt: { lt: now } },
          { paymentStatus: { in: ['UNPAID', 'PARTIAL'] } },
        ];
      } else {
        where.paymentStatus = params.status;
      }
    }

    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { issuedAt: 'desc' },
        include: {
          payments: true,
          reservation: {
            select: {
              id: true,
              reservationNo: true,
              room: { select: { number: true } },
              guest: { select: { firstName: true, lastName: true } },
            },
          },
          posOrder: {
            select: {
              id: true,
              orderNo: true,
              tableNo: true,
              roomNo: true,
              type: true,
              reservation: {
                select: {
                  id: true,
                  reservationNo: true,
                  guest: { select: { firstName: true, lastName: true } },
                },
              },
            },
          },
        },
      }),
      this.prisma.invoice.count({ where }),
    ]);

    const mapped = invoices.map((inv) => {
      const total = Number(inv.total);
      const paidAmount = inv.payments.reduce((s, p) => s + Number(p.amount), 0);
      const balance = Math.max(total - paidAmount, 0);
      const overdue =
        inv.dueAt && inv.dueAt < now && ['UNPAID', 'PARTIAL'].includes(inv.paymentStatus);

      return {
        id: inv.id,
        invoiceNo: inv.invoiceNo,
        issuedAt: inv.issuedAt,
        dueAt: inv.dueAt,
        total,
        paidAmount,
        balance,
        paymentStatus: inv.paymentStatus,
        status: overdue ? 'OVERDUE' : inv.paymentStatus,
        type: inv.type,
        reservation: inv.reservation,
        posOrder: inv.posOrder,
      };
    });

    return {
      range: { from: range.from.toISOString(), to: range.to.toISOString() },
      invoices: mapped,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async listPayments(
    hotelId: string,
    params: {
      from?: string;
      to?: string;
      search?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const range = resolveRange(params);
    const page = params.page ?? 1;
    const limit = params.limit ?? 200;
    const skip = (page - 1) * limit;

    const where: any = {
      hotelId,
      paidAt: { gte: range.from, lte: range.to },
    };

    if (params.search) {
      where.OR = [
        { reference: { contains: params.search, mode: 'insensitive' } },
        { invoice: { invoiceNo: { contains: params.search, mode: 'insensitive' } } },
        { invoice: { reservation: { reservationNo: { contains: params.search, mode: 'insensitive' } } } },
        { invoice: { reservation: { guest: { firstName: { contains: params.search, mode: 'insensitive' } } } } },
        { invoice: { reservation: { guest: { lastName: { contains: params.search, mode: 'insensitive' } } } } },
        { invoice: { posOrder: { orderNo: { contains: params.search, mode: 'insensitive' } } } },
      ];
    }

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { paidAt: 'desc' },
        include: {
          invoice: {
            select: {
              id: true,
              invoiceNo: true,
              type: true,
              reservation: {
                select: {
                  id: true,
                  reservationNo: true,
                  guest: { select: { firstName: true, lastName: true } },
                },
              },
              posOrder: {
                select: {
                  id: true,
                  orderNo: true,
                  tableNo: true,
                  roomNo: true,
                  type: true,
                  reservation: {
                    select: {
                      id: true,
                      reservationNo: true,
                      guest: { select: { firstName: true, lastName: true } },
                    },
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.payment.count({ where }),
    ]);

    const mapped = payments.map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      method: p.method,
      reference: p.reference,
      paidAt: p.paidAt,
      note: p.note,
      invoice: p.invoice,
    }));

    return {
      range: { from: range.from.toISOString(), to: range.to.toISOString() },
      payments: mapped,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
