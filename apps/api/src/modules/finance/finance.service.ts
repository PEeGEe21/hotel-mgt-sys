import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaymentStatus, Prisma } from '@prisma/client';
import dayjs from 'dayjs';
import { PrismaService } from '../../prisma/prisma.service';
import { LedgerService } from '../ledger/ledger.service';
import { compileTemplate } from '../../common/utils/compile-template.utils';

type RangeInput = { from?: string; to?: string };

type Range = { from: Date; to: Date };

const REVENUE_TYPES = new Set(['RESERVATION', 'POS', 'FACILITY', 'MANUAL']);
const RECEIVABLE_TYPES = new Set(['RESERVATION', 'POS', 'FACILITY', 'MANUAL']);

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

function escapeCsv(value: unknown) {
  const text = String(value ?? '');
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

@Injectable()
export class FinanceService {
  constructor(
    private prisma: PrismaService,
    private ledgerService: LedgerService,
  ) {}

  private invoiceTemplateDefaults() {
    return {
      accentColor: '#1d4ed8',
      headerTitle: 'Invoice',
      footerNote: 'Thank you for your business.',
      showLogo: true,
      showTaxBreakdown: true,
      showNotes: true,
    };
  }

  private coerceInvoiceTemplateSettings(value: unknown) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return this.invoiceTemplateDefaults();
    }

    const raw = value as Record<string, unknown>;
    const defaults = this.invoiceTemplateDefaults();

    return {
      accentColor:
        typeof raw.accentColor === 'string' && raw.accentColor.trim()
          ? raw.accentColor.trim()
          : defaults.accentColor,
      headerTitle:
        typeof raw.headerTitle === 'string' && raw.headerTitle.trim()
          ? raw.headerTitle.trim()
          : defaults.headerTitle,
      footerNote:
        typeof raw.footerNote === 'string' && raw.footerNote.trim()
          ? raw.footerNote.trim()
          : defaults.footerNote,
      showLogo:
        typeof raw.showLogo === 'boolean' ? raw.showLogo : defaults.showLogo,
      showTaxBreakdown:
        typeof raw.showTaxBreakdown === 'boolean'
          ? raw.showTaxBreakdown
          : defaults.showTaxBreakdown,
      showNotes:
        typeof raw.showNotes === 'boolean' ? raw.showNotes : defaults.showNotes,
    };
  }

  private resolveCashAccount(method: string) {
    const normalized = method.toUpperCase();
    if (normalized === 'CARD' || normalized === 'POS') return '1020';
    if (normalized === 'BANK_TRANSFER') return '1010';
    return '1000';
  }

  private resolveExpenseAccount(type: string) {
    return type === 'REQUISITION' ? '6400' : '6900';
  }

  private resolveRevenueAccount(type: string) {
    if (type === 'RESERVATION') return '4100';
    if (type === 'POS') return '4200';
    if (type === 'FACILITY') return '4500';
    return '4900';
  }

  private resolveCounterpartyAccount(type: string) {
    return REVENUE_TYPES.has(type) ? '1100' : '2000';
  }

  private normalizeSourceType(value?: string | null) {
    return (value || 'MANUAL').trim().toUpperCase();
  }

  private derivePaymentStatus(total: number, paidAmount: number): PaymentStatus {
    if (paidAmount >= total) return PaymentStatus.PAID;
    if (paidAmount > 0) return PaymentStatus.PARTIAL;
    return PaymentStatus.UNPAID;
  }

  private async generateInvoiceNo(tx: Prisma.TransactionClient, prefix = 'INV') {
    const base = `${prefix}-${dayjs().format('YYYYMMDD')}`;
    let invoiceNo = base;
    let attempt = 1;

    while (await tx.invoice.findUnique({ where: { invoiceNo } })) {
      attempt += 1;
      invoiceNo = `${base}-${String(attempt).padStart(2, '0')}`;
      if (attempt > 50) {
        throw new ConflictException('Could not generate a unique invoice number.');
      }
    }

    return invoiceNo;
  }

  private async resolveInvoiceSource(
    hotelId: string,
    dto: {
      sourceType?: string;
      reservationId?: string;
      posOrderId?: string;
      facilityBookingId?: string;
      requisitionId?: string;
      counterpartyName: string;
      notes?: string;
    },
  ) {
    const sourceType = this.normalizeSourceType(dto.sourceType);

    if (sourceType === 'RESERVATION') {
      if (!dto.reservationId) {
        throw new BadRequestException('Reservation is required for reservation-linked invoices.');
      }
      const reservation = await this.prisma.reservation.findFirst({
        where: { id: dto.reservationId, hotelId },
        include: {
          guest: { select: { firstName: true, lastName: true } },
        },
      });
      if (!reservation) throw new NotFoundException('Reservation not found.');
      return {
        type: 'RESERVATION',
        reservationId: reservation.id,
        posOrderId: null,
        facilityBookingId: null,
        requisitionId: null,
        counterpartyName:
          dto.counterpartyName?.trim() ||
          `${reservation.guest.firstName} ${reservation.guest.lastName}`.trim(),
        notes: dto.notes?.trim() || `Reservation ${reservation.reservationNo}`,
        prefix: 'RSV',
      };
    }

    if (sourceType === 'POS') {
      if (!dto.posOrderId) {
        throw new BadRequestException('POS order is required for POS-linked invoices.');
      }
      const posOrder = await this.prisma.posOrder.findFirst({
        where: { id: dto.posOrderId, hotelId },
        include: {
          reservation: {
            include: {
              guest: { select: { firstName: true, lastName: true } },
            },
          },
        },
      });
      if (!posOrder) throw new NotFoundException('POS order not found.');
      return {
        type: 'POS',
        reservationId: null,
        posOrderId: posOrder.id,
        facilityBookingId: null,
        requisitionId: null,
        counterpartyName:
          dto.counterpartyName?.trim() ||
          (posOrder.reservation?.guest
            ? `${posOrder.reservation.guest.firstName} ${posOrder.reservation.guest.lastName}`.trim()
            : posOrder.roomNo
              ? `Room ${posOrder.roomNo}`
              : posOrder.tableNo
                ? `Table ${posOrder.tableNo}`
                : `POS ${posOrder.orderNo}`),
        notes: dto.notes?.trim() || `POS ${posOrder.orderNo}`,
        prefix: 'POS',
      };
    }

    if (sourceType === 'FACILITY') {
      if (!dto.facilityBookingId) {
        throw new BadRequestException('Facility booking is required for facility-linked invoices.');
      }
      const facilityBooking = await this.prisma.facilityBooking.findFirst({
        where: { id: dto.facilityBookingId, hotelId },
        include: {
          facility: { select: { name: true } },
        },
      });
      if (!facilityBooking) throw new NotFoundException('Facility booking not found.');
      return {
        type: 'FACILITY',
        reservationId: facilityBooking.reservationId ?? null,
        posOrderId: null,
        facilityBookingId: facilityBooking.id,
        requisitionId: null,
        counterpartyName:
          dto.counterpartyName?.trim() || facilityBooking.guestName || facilityBooking.facility.name,
        notes: dto.notes?.trim() || facilityBooking.notes || facilityBooking.facility.name,
        prefix: 'FAC',
      };
    }

    if (sourceType === 'REQUISITION') {
      if (!dto.requisitionId) {
        throw new BadRequestException('Requisition is required for requisition-linked invoices.');
      }
      const requisition = await this.prisma.facilityRequisition.findFirst({
        where: { id: dto.requisitionId, hotelId },
        include: {
          facility: { select: { name: true } },
          invoice: true,
        },
      });
      if (!requisition) throw new NotFoundException('Requisition not found.');
      if (!['APPROVED', 'FULFILLED'].includes(requisition.status)) {
        throw new BadRequestException('Only approved requisitions can be invoiced.');
      }
      if (requisition.invoiceId || requisition.invoice) {
        throw new ConflictException('This requisition already has a linked invoice.');
      }
      return {
        type: 'REQUISITION',
        reservationId: null,
        posOrderId: null,
        facilityBookingId: null,
        requisitionId: requisition.id,
        counterpartyName:
          dto.counterpartyName?.trim() || requisition.facility?.name || requisition.title,
        notes: dto.notes?.trim() || requisition.description || requisition.title,
        prefix: 'REQ',
      };
    }

    return {
      type: (dto.counterpartyName?.trim() ? 'MANUAL' : 'MANUAL') as string,
      reservationId: null,
      posOrderId: null,
      facilityBookingId: null,
      requisitionId: null,
      counterpartyName: dto.counterpartyName?.trim(),
      notes: dto.notes?.trim() || null,
      prefix: 'INV',
    };
  }

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
      const paid = inv.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
      const balance = Math.max(total - paid, 0);

      if (REVENUE_TYPES.has(inv.type)) revenue += total;
      else expenses += total;

      if (inv.paymentStatus !== 'PAID' && inv.paymentStatus !== 'REFUNDED') {
        outstanding += balance;
      }
    }

    return { revenue, expenses, net: revenue - expenses, outstanding };
  }

  private async syncReservationPaymentStatus(
    tx: Prisma.TransactionClient,
    hotelId: string,
    reservationId: string,
  ) {
    const reservation = await tx.reservation.findFirst({
      where: { id: reservationId, hotelId },
      include: {
        invoices: {
          include: { payments: true },
        },
      },
    });

    if (!reservation) return;

    const invoiceTotal = reservation.invoices.reduce(
      (sum, invoice) => sum + Number(invoice.total),
      0,
    );
    const paidAmount = reservation.invoices.reduce(
      (sum, invoice) =>
        sum + invoice.payments.reduce((inner, payment) => inner + Number(payment.amount), 0),
      0,
    );

    await tx.reservation.update({
      where: { id: reservation.id },
      data: {
        paidAmount,
        paymentStatus: this.derivePaymentStatus(invoiceTotal, paidAmount),
      },
    });
  }

  private async syncFacilityBookingPaymentStatus(
    tx: Prisma.TransactionClient,
    facilityBookingId: string,
    paymentStatus: PaymentStatus,
  ) {
    await tx.facilityBooking.update({
      where: { id: facilityBookingId },
      data: { isPaid: paymentStatus === PaymentStatus.PAID },
    });
  }

  private async postInvoiceLedgerEntry(
    hotelId: string,
    invoice: {
      id: string;
      invoiceNo: string;
      type: string;
      total: number;
      notes?: string | null;
      counterpartyName?: string | null;
    },
    overrides?: {
      debitAccountCode?: string;
      creditAccountCode?: string;
    },
  ) {
    const isReceivable = RECEIVABLE_TYPES.has(invoice.type);
    const detail = invoice.notes?.trim() || invoice.counterpartyName?.trim() || invoice.invoiceNo;

    await this.ledgerService.postEntry(hotelId, {
      description: `Invoice issued — ${invoice.invoiceNo}`,
      sourceType: 'INVOICE',
      sourceId: invoice.id,
      reference: invoice.invoiceNo,
      lines: [
        {
          accountCode:
            overrides?.debitAccountCode ||
            (isReceivable
              ? this.resolveCounterpartyAccount(invoice.type)
              : this.resolveExpenseAccount(invoice.type)),
          type: 'DEBIT',
          amount: invoice.total,
          description: detail,
        },
        {
          accountCode:
            overrides?.creditAccountCode ||
            (isReceivable
              ? this.resolveRevenueAccount(invoice.type)
              : this.resolveCounterpartyAccount(invoice.type)),
          type: 'CREDIT',
          amount: invoice.total,
          description: detail,
        },
      ],
    });
  }

  private async postInvoiceSettlementEntry(
    hotelId: string,
    invoice: {
      id: string;
      invoiceNo: string;
      type: string;
      notes?: string | null;
      counterpartyName?: string | null;
    },
    payment: {
      id: string;
      amount: number;
      method: string;
    },
    overrides?: {
      debitAccountCode?: string;
      creditAccountCode?: string;
    },
  ) {
    const isReceivable = RECEIVABLE_TYPES.has(invoice.type);
    const detail = invoice.notes?.trim() || invoice.counterpartyName?.trim() || invoice.invoiceNo;

    await this.ledgerService.postEntry(hotelId, {
      description: `${isReceivable ? 'Invoice payment' : 'Invoice disbursement'} — ${invoice.invoiceNo}`,
      sourceType: 'PAYMENT',
      sourceId: payment.id,
      reference: invoice.id,
      lines: [
        {
          accountCode:
            overrides?.debitAccountCode ||
            (isReceivable
              ? this.resolveCashAccount(payment.method)
              : this.resolveCounterpartyAccount(invoice.type)),
          type: 'DEBIT',
          amount: payment.amount,
          description: detail,
        },
        {
          accountCode:
            overrides?.creditAccountCode ||
            (isReceivable
              ? this.resolveCounterpartyAccount(invoice.type)
              : this.resolveCashAccount(payment.method)),
          type: 'CREDIT',
          amount: payment.amount,
          description: `Payment via ${payment.method}`,
        },
      ],
    });
  }

  async getOverview(hotelId: string, params: RangeInput) {
    const range = resolveRange(params);
    const current = await this.computeTotals(hotelId, range);

    const days = dayjs(range.to).diff(dayjs(range.from), 'day') + 1;
    const prevTo = dayjs(range.from).subtract(1, 'day').endOf('day');
    const prevFrom = prevTo.subtract(days - 1, 'day').startOf('day');
    const previous = await this.computeTotals(hotelId, {
      from: prevFrom.toDate(),
      to: prevTo.toDate(),
    });

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

    const where: Prisma.InvoiceWhereInput = {
      hotelId,
      issuedAt: { gte: range.from, lte: range.to },
    };

    if (params.type) where.type = params.type.toUpperCase();

    if (params.search) {
      where.OR = [
        { invoiceNo: { contains: params.search, mode: 'insensitive' } },
        { counterpartyName: { contains: params.search, mode: 'insensitive' } },
        { reservation: { reservationNo: { contains: params.search, mode: 'insensitive' } } },
        { reservation: { guest: { firstName: { contains: params.search, mode: 'insensitive' } } } },
        { reservation: { guest: { lastName: { contains: params.search, mode: 'insensitive' } } } },
        { posOrder: { orderNo: { contains: params.search, mode: 'insensitive' } } },
        { posOrder: { roomNo: { contains: params.search, mode: 'insensitive' } } },
        { facilityRequisition: { title: { contains: params.search, mode: 'insensitive' } } },
      ];
    }

    if (params.status) {
      if (params.status === 'OVERDUE') {
        where.AND = [
          { dueAt: { lt: now } },
          { paymentStatus: { in: ['UNPAID', 'PARTIAL'] } },
        ];
      } else {
        where.paymentStatus = params.status as PaymentStatus;
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
          facilityRequisition: {
            select: {
              id: true,
              title: true,
              status: true,
              facility: { select: { name: true } },
            },
          },
        },
      }),
      this.prisma.invoice.count({ where }),
    ]);

    const mapped = invoices.map((invoice) => {
      const totalAmount = Number(invoice.total);
      const paidAmount = invoice.payments.reduce(
        (sum, payment) => sum + Number(payment.amount),
        0,
      );
      const balance = Math.max(totalAmount - paidAmount, 0);
      const overdue =
        invoice.dueAt && invoice.dueAt < now && ['UNPAID', 'PARTIAL'].includes(invoice.paymentStatus);

      return {
        id: invoice.id,
        invoiceNo: invoice.invoiceNo,
        issuedAt: invoice.issuedAt,
        dueAt: invoice.dueAt,
        subtotal: Number(invoice.subtotal),
        tax: Number(invoice.tax),
        discount: Number(invoice.discount),
        total: totalAmount,
        paidAmount,
        balance,
        paymentStatus: invoice.paymentStatus,
        status: overdue ? 'OVERDUE' : invoice.paymentStatus,
        type: invoice.type,
        counterpartyName: invoice.counterpartyName,
        notes: invoice.notes,
        reservation: invoice.reservation,
        posOrder: invoice.posOrder,
        requisition: invoice.facilityRequisition,
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

    const where: Prisma.PaymentWhereInput = {
      hotelId,
      paidAt: { gte: range.from, lte: range.to },
    };

    if (params.search) {
      where.OR = [
        { reference: { contains: params.search, mode: 'insensitive' } },
        { invoice: { invoiceNo: { contains: params.search, mode: 'insensitive' } } },
        { invoice: { counterpartyName: { contains: params.search, mode: 'insensitive' } } },
        { invoice: { reservation: { reservationNo: { contains: params.search, mode: 'insensitive' } } } },
        { invoice: { reservation: { guest: { firstName: { contains: params.search, mode: 'insensitive' } } } } },
        { invoice: { reservation: { guest: { lastName: { contains: params.search, mode: 'insensitive' } } } } },
        { invoice: { posOrder: { orderNo: { contains: params.search, mode: 'insensitive' } } } },
        { invoice: { facilityRequisition: { title: { contains: params.search, mode: 'insensitive' } } } },
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
              counterpartyName: true,
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
              facilityRequisition: {
                select: {
                  id: true,
                  title: true,
                  status: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.payment.count({ where }),
    ]);

    const mapped = payments.map((payment) => ({
      id: payment.id,
      amount: Number(payment.amount),
      method: payment.method,
      reference: payment.reference,
      paidAt: payment.paidAt,
      note: payment.note,
      invoice: {
        ...payment.invoice,
        requisition: payment.invoice.facilityRequisition,
      },
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

  async createInvoice(
    hotelId: string,
    dto: {
      type?: string;
      sourceType?: string;
      reservationId?: string;
      posOrderId?: string;
      facilityBookingId?: string;
      requisitionId?: string;
      counterpartyName: string;
      notes?: string;
      subtotal: number;
      tax?: number;
      discount?: number;
      dueAt?: string;
      debitAccountCode?: string;
      creditAccountCode?: string;
      recordInitialPayment?: boolean;
      initialPaymentAmount?: number;
      initialPaymentMethod?: string;
      initialPaymentReference?: string;
      initialPaymentNote?: string;
      initialPaymentPaidAt?: string;
      initialPaymentDebitAccountCode?: string;
      initialPaymentCreditAccountCode?: string;
    },
  ) {
    const source = await this.resolveInvoiceSource(hotelId, dto);
    let requisitionEstimatedTotal = 0;
    if (source.requisitionId) {
      const requisition = await this.prisma.facilityRequisition.findUnique({
        where: { id: source.requisitionId },
        select: { estimatedTotal: true },
      });
      requisitionEstimatedTotal = Number(requisition?.estimatedTotal ?? 0);
    }

    const subtotal = Number(
      source.type === 'REQUISITION' ? requisitionEstimatedTotal || dto.subtotal || 0 : dto.subtotal ?? 0,
    );
    const tax = Number(source.type === 'REQUISITION' ? 0 : dto.tax ?? 0);
    const discount = Number(source.type === 'REQUISITION' ? 0 : dto.discount ?? 0);
    const total = subtotal + tax - discount;
    const recordInitialPayment = !!dto.recordInitialPayment;
    const initialPaymentAmount = Number(dto.initialPaymentAmount ?? 0);

    if (!source.counterpartyName?.trim()) {
      throw new BadRequestException('Counterparty name is required.');
    }
    if (subtotal < 0 || tax < 0 || discount < 0) {
      throw new BadRequestException('Invoice amounts cannot be negative.');
    }
    if (total <= 0) {
      throw new BadRequestException('Invoice total must be greater than zero.');
    }
    if (recordInitialPayment) {
      if (!dto.initialPaymentMethod?.trim()) {
        throw new BadRequestException('Initial payment method is required.');
      }
      if (initialPaymentAmount <= 0) {
        throw new BadRequestException('Initial payment amount must be greater than zero.');
      }
      if (initialPaymentAmount - total > 0.01) {
        throw new BadRequestException('Initial payment amount exceeds the invoice total.');
      }
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const invoiceNo = await this.generateInvoiceNo(tx, source.prefix);
      const paymentStatus = this.derivePaymentStatus(
        total,
        recordInitialPayment ? initialPaymentAmount : 0,
      );
      const invoice = await tx.invoice.create({
        data: {
          hotelId,
          invoiceNo,
          dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
          subtotal,
          tax,
          discount,
          total,
          type: source.type,
          paymentStatus,
          counterpartyName: source.counterpartyName.trim(),
          notes: source.notes?.trim() || null,
          reservationId: source.reservationId,
          posOrderId: source.posOrderId,
          facilityBookingId: source.facilityBookingId,
        },
      });

      if (source.requisitionId) {
        await tx.facilityRequisition.update({
          where: { id: source.requisitionId },
          data: { invoiceId: invoice.id },
        });
      }

      let payment: Prisma.PaymentGetPayload<object> | null = null;
      if (recordInitialPayment) {
        payment = await tx.payment.create({
          data: {
            hotelId,
            invoiceId: invoice.id,
            amount: initialPaymentAmount,
            method: dto.initialPaymentMethod!.trim().toUpperCase(),
            reference: dto.initialPaymentReference?.trim() || null,
            note: dto.initialPaymentNote?.trim() || null,
            paidAt: dto.initialPaymentPaidAt ? new Date(dto.initialPaymentPaidAt) : new Date(),
          },
        });
      }

      if (source.reservationId) {
        await this.syncReservationPaymentStatus(tx, hotelId, source.reservationId);
      }

      if (source.facilityBookingId) {
        await this.syncFacilityBookingPaymentStatus(
          tx,
          source.facilityBookingId,
          paymentStatus,
        );
      }

      return { invoice, payment };
    });

    await this.postInvoiceLedgerEntry(
      hotelId,
      {
        id: result.invoice.id,
        invoiceNo: result.invoice.invoiceNo,
        type: result.invoice.type,
        total: Number(result.invoice.total),
        notes: result.invoice.notes,
        counterpartyName: result.invoice.counterpartyName,
      },
      {
        debitAccountCode: dto.debitAccountCode?.trim() || undefined,
        creditAccountCode: dto.creditAccountCode?.trim() || undefined,
      },
    );

    if (result.payment) {
      await this.postInvoiceSettlementEntry(
        hotelId,
        {
          id: result.invoice.id,
          invoiceNo: result.invoice.invoiceNo,
          type: result.invoice.type,
          notes: result.invoice.notes,
          counterpartyName: result.invoice.counterpartyName,
        },
        {
          id: result.payment.id,
          amount: Number(result.payment.amount),
          method: result.payment.method,
        },
        {
          debitAccountCode: dto.initialPaymentDebitAccountCode?.trim() || undefined,
          creditAccountCode: dto.initialPaymentCreditAccountCode?.trim() || undefined,
        },
      );
    }

    return result;
  }

  async createInvoiceFromRequisition(hotelId: string, requisitionId: string) {
    return this.createInvoice(hotelId, {
      sourceType: 'REQUISITION',
      requisitionId,
      counterpartyName: '',
      subtotal: 0,
    });
  }

  async updateInvoice(
    hotelId: string,
    invoiceId: string,
    dto: {
      counterpartyName?: string;
      notes?: string;
      dueAt?: string;
    },
  ) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, hotelId },
      select: {
        id: true,
        invoiceNo: true,
        counterpartyName: true,
        notes: true,
        dueAt: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found.');
    }

    if (
      dto.counterpartyName !== undefined &&
      !dto.counterpartyName.trim()
    ) {
      throw new BadRequestException('Counterparty name cannot be empty.');
    }

    return this.prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        counterpartyName:
          dto.counterpartyName !== undefined
            ? dto.counterpartyName.trim()
            : undefined,
        notes: dto.notes !== undefined ? dto.notes.trim() || null : undefined,
        dueAt: dto.dueAt !== undefined ? new Date(dto.dueAt) : undefined,
      },
    });
  }

  async recordPayment(
    hotelId: string,
    dto: {
      invoiceId: string;
      amount: number;
      method: string;
      reference?: string;
      note?: string;
      paidAt?: string;
      debitAccountCode?: string;
      creditAccountCode?: string;
    },
  ) {
    const amount = Number(dto.amount ?? 0);
    if (amount <= 0) {
      throw new BadRequestException('Payment amount must be greater than zero.');
    }

    const invoice = await this.prisma.invoice.findFirst({
      where: { id: dto.invoiceId, hotelId },
      include: {
        payments: true,
        reservation: { select: { id: true } },
        facilityBooking: { select: { id: true } },
        facilityRequisition: { select: { id: true, title: true } },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found.');
    }

    const currentPaid = invoice.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
    const invoiceTotal = Number(invoice.total);
    const balance = Math.max(invoiceTotal - currentPaid, 0);

    if (balance <= 0) {
      throw new BadRequestException('This invoice is already fully settled.');
    }
    if (amount - balance > 0.01) {
      throw new BadRequestException('Payment amount exceeds the outstanding balance.');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          hotelId,
          invoiceId: invoice.id,
          amount,
          method: dto.method,
          reference: dto.reference?.trim() || null,
          note: dto.note?.trim() || null,
          paidAt: dto.paidAt ? new Date(dto.paidAt) : new Date(),
        },
      });

      const newPaid = currentPaid + amount;
      const paymentStatus = this.derivePaymentStatus(invoiceTotal, newPaid);

      await tx.invoice.update({
        where: { id: invoice.id },
        data: { paymentStatus },
      });

      if (invoice.reservation?.id) {
        await this.syncReservationPaymentStatus(tx, hotelId, invoice.reservation.id);
      }

      if (invoice.facilityBooking?.id) {
        await this.syncFacilityBookingPaymentStatus(
          tx,
          invoice.facilityBooking.id,
          paymentStatus,
        );
      }

      return {
        payment,
        paymentStatus,
      };
    });

    await this.postInvoiceSettlementEntry(
      hotelId,
      {
        id: invoice.id,
        invoiceNo: invoice.invoiceNo,
        type: invoice.type,
        notes: invoice.notes,
        counterpartyName: invoice.counterpartyName,
      },
      {
        id: result.payment.id,
        amount,
        method: dto.method,
      },
      {
        debitAccountCode: dto.debitAccountCode?.trim() || undefined,
        creditAccountCode: dto.creditAccountCode?.trim() || undefined,
      },
    );

    return {
      payment: {
        ...result.payment,
        amount: Number(result.payment.amount),
      },
      invoice: {
        id: invoice.id,
        invoiceNo: invoice.invoiceNo,
      },
      paymentStatus: result.paymentStatus,
    };
  }

  async exportInvoicesCsv(
    hotelId: string,
    params: {
      from?: string;
      to?: string;
      search?: string;
      status?: string;
      type?: string;
    },
  ) {
    const data = await this.listInvoices(hotelId, { ...params, page: 1, limit: 5000 });
    const lines = [
      [
        'Invoice No',
        'Type',
        'Counterparty',
        'Issued At',
        'Due At',
        'Total',
        'Paid',
        'Balance',
        'Status',
      ].join(','),
    ];

    for (const invoice of data.invoices) {
      lines.push(
        [
          escapeCsv(invoice.invoiceNo),
          escapeCsv(invoice.type),
          escapeCsv(invoice.counterpartyName ?? '—'),
          escapeCsv(new Date(invoice.issuedAt).toISOString().slice(0, 10)),
          escapeCsv(invoice.dueAt ? new Date(invoice.dueAt).toISOString().slice(0, 10) : ''),
          escapeCsv(invoice.total.toFixed(2)),
          escapeCsv(invoice.paidAmount.toFixed(2)),
          escapeCsv(invoice.balance.toFixed(2)),
          escapeCsv(invoice.status),
        ].join(','),
      );
    }

    return lines.join('\n');
  }

  async exportPaymentsCsv(
    hotelId: string,
    params: {
      from?: string;
      to?: string;
      search?: string;
    },
  ) {
    const data = await this.listPayments(hotelId, { ...params, page: 1, limit: 5000 });
    const lines = [
      ['Payment ID', 'Invoice No', 'Type', 'Counterparty', 'Method', 'Reference', 'Paid At', 'Amount'].join(','),
    ];

    for (const payment of data.payments) {
      lines.push(
        [
          escapeCsv(payment.id),
          escapeCsv(payment.invoice.invoiceNo),
          escapeCsv(payment.invoice.type),
          escapeCsv(payment.invoice.counterpartyName ?? '—'),
          escapeCsv(payment.method),
          escapeCsv(payment.reference ?? ''),
          escapeCsv(new Date(payment.paidAt).toISOString().slice(0, 10)),
          escapeCsv(payment.amount.toFixed(2)),
        ].join(','),
      );
    }

    return lines.join('\n');
  }

  async getInvoicePrintHtml(hotelId: string, invoiceId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, hotelId },
      include: {
        payments: true,
        reservation: {
          select: {
            reservationNo: true,
            guest: { select: { firstName: true, lastName: true } },
          },
        },
        posOrder: {
          select: {
            orderNo: true,
          },
        },
        facilityRequisition: {
          select: {
            title: true,
            facility: { select: { name: true } },
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found.');
    }

    const hotel = await this.prisma.hotel.findUnique({
      where: { id: hotelId },
      select: {
        name: true,
        address: true,
        city: true,
        country: true,
        email: true,
        phone: true,
        logo: true,
        invoiceTemplateSettings: true,
      },
    });

    if (!hotel) {
      throw new NotFoundException('Hotel not found.');
    }

    const settings = this.coerceInvoiceTemplateSettings(hotel.invoiceTemplateSettings);
    const paidAmount = invoice.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
    const balance = Math.max(Number(invoice.total) - paidAmount, 0);
    const guestName = invoice.reservation?.guest
      ? `${invoice.reservation.guest.firstName} ${invoice.reservation.guest.lastName}`
      : null;
    const referenceText = invoice.reservation?.reservationNo
      ? `Reservation ${invoice.reservation.reservationNo}`
      : invoice.posOrder?.orderNo
        ? `POS ${invoice.posOrder.orderNo}`
        : invoice.facilityRequisition?.title || 'Standard invoice';

    return compileTemplate('invoice', {
      hotelName: hotel.name,
      hotelAddress: hotel.address,
      hotelCity: hotel.city,
      hotelCountry: hotel.country,
      hotelEmail: hotel.email,
      hotelPhone: hotel.phone,
      hotelLogo: hotel.logo,
      invoiceNo: invoice.invoiceNo,
      invoiceType: invoice.type,
      counterpartyName:
        invoice.counterpartyName ??
        guestName ??
        invoice.facilityRequisition?.facility?.name ??
        'Customer',
      issuedAt: invoice.issuedAt.toLocaleDateString('en-NG', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
      dueAt: invoice.dueAt
        ? invoice.dueAt.toLocaleDateString('en-NG', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })
        : '—',
      subtotal: Number(invoice.subtotal).toLocaleString('en-NG', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      tax: Number(invoice.tax).toLocaleString('en-NG', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      discount: Number(invoice.discount).toLocaleString('en-NG', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      total: Number(invoice.total).toLocaleString('en-NG', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      paidAmount: paidAmount.toLocaleString('en-NG', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      balance: balance.toLocaleString('en-NG', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      paymentStatus: invoice.paymentStatus,
      notes: invoice.notes,
      referenceText,
      printedAt: new Date().toLocaleString('en-NG'),
      ...settings,
    });
  }
}
