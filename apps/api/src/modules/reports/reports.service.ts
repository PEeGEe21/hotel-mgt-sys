import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AttendanceType } from '@prisma/client';
import dayjs from 'dayjs';

type RangeInput = { from?: string; to?: string };
type Range = { from: Date; to: Date };
type MaybeRange = Range | null;

const REVENUE_TYPES = new Set(['RESERVATION', 'POS', 'FACILITY']);
const ACTIVE_FOLIO_STATUSES = ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'];

function resolveRange(params: RangeInput): Range {
  const from = params.from ? dayjs(params.from).startOf('day') : dayjs().startOf('month');
  const to = params.to ? dayjs(params.to).endOf('day') : dayjs().endOf('month');

  if (!from.isValid() || !to.isValid()) {
    throw new BadRequestException('Invalid report date range.');
  }

  if (from.isAfter(to)) {
    throw new BadRequestException('Report start date must be before end date.');
  }

  return { from: from.toDate(), to: to.toDate() };
}

function resolveOptionalRange(params: RangeInput): MaybeRange {
  if (!params.from && !params.to) return null;
  return resolveRange(params);
}

function rangePayload(range: MaybeRange) {
  if (!range) return null;
  return { from: range.from.toISOString(), to: range.to.toISOString() };
}

function addToBucket<T extends Record<string, any>>(
  buckets: Map<string, T>,
  key: string,
  initial: T,
  updater: (bucket: T) => void,
) {
  const bucket = buckets.get(key) ?? { ...initial };
  updater(bucket);
  buckets.set(key, bucket);
}

function money(value: unknown) {
  return Number(value ?? 0);
}

function percent(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function streamKey(type: string) {
  if (type === 'POS') return 'fnb' as const;
  if (type === 'FACILITY') return 'events' as const;
  return 'rooms' as const;
}

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  private async buildRevenueAggregation(hotelId: string, range: Range) {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        hotelId,
        issuedAt: { gte: range.from, lte: range.to },
        type: { in: Array.from(REVENUE_TYPES) },
      },
      orderBy: { issuedAt: 'desc' },
      include: {
        payments: true,
        reservation: {
          select: {
            id: true,
            reservationNo: true,
            guest: { select: { firstName: true, lastName: true } },
            room: { select: { number: true } },
          },
        },
        posOrder: {
          select: { id: true, orderNo: true, type: true, tableNo: true, roomNo: true },
        },
        facilityBooking: {
          select: {
            id: true,
            guestName: true,
            facility: { select: { name: true } },
          },
        },
      },
    });

    const byType = new Map<string, { type: string; invoiceTotal: number; paidAmount: number; balance: number; count: number }>();
    const byStatus = new Map<string, { status: string; invoiceTotal: number; paidAmount: number; balance: number; count: number }>();
    const daily = new Map<string, { date: string; invoiceTotal: number; paidAmount: number; balance: number; count: number }>();
    const streamDaily = new Map<string, { month: string; rooms: number; fnb: number; events: number; total: number }>();

    let invoiceTotal = 0;
    let paidAmount = 0;
    let outstanding = 0;

    const rows = invoices.map((invoice) => {
      const total = money(invoice.total);
      const paid = invoice.payments.reduce((sum, payment) => sum + money(payment.amount), 0);
      const balance = Math.max(total - paid, 0);
      const date = invoice.issuedAt.toISOString().slice(0, 10);
      const key = streamKey(invoice.type);

      invoiceTotal += total;
      paidAmount += paid;
      outstanding += balance;

      addToBucket(byType, invoice.type, { type: invoice.type, invoiceTotal: 0, paidAmount: 0, balance: 0, count: 0 }, (bucket) => {
        bucket.invoiceTotal += total;
        bucket.paidAmount += paid;
        bucket.balance += balance;
        bucket.count += 1;
      });

      addToBucket(byStatus, invoice.paymentStatus, { status: invoice.paymentStatus, invoiceTotal: 0, paidAmount: 0, balance: 0, count: 0 }, (bucket) => {
        bucket.invoiceTotal += total;
        bucket.paidAmount += paid;
        bucket.balance += balance;
        bucket.count += 1;
      });

      addToBucket(daily, date, { date, invoiceTotal: 0, paidAmount: 0, balance: 0, count: 0 }, (bucket) => {
        bucket.invoiceTotal += total;
        bucket.paidAmount += paid;
        bucket.balance += balance;
        bucket.count += 1;
      });

      addToBucket(
        streamDaily,
        date,
        { month: date, rooms: 0, fnb: 0, events: 0, total: 0 },
        (bucket) => {
          bucket[key] += total;
          bucket.total += total;
        },
      );

      return {
        id: invoice.id,
        invoiceNo: invoice.invoiceNo,
        issuedAt: invoice.issuedAt,
        type: invoice.type,
        paymentStatus: invoice.paymentStatus,
        invoiceTotal: total,
        paidAmount: paid,
        balance,
        reservation: invoice.reservation,
        posOrder: invoice.posOrder,
        facilityBooking: invoice.facilityBooking,
      };
    });

    return {
      summary: {
        invoiceTotal,
        paidAmount,
        outstanding,
        count: invoices.length,
      },
      byType: Array.from(byType.values()).sort((a, b) => b.invoiceTotal - a.invoiceTotal),
      byStatus: Array.from(byStatus.values()).sort((a, b) => b.invoiceTotal - a.invoiceTotal),
      daily: Array.from(daily.values()).sort((a, b) => a.date.localeCompare(b.date)),
      streamDaily: Array.from(streamDaily.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, row]) => ({ ...row, month: dayjs(date).format('MMM D') })),
      rows,
    };
  }

  async getOverview(hotelId: string, params: RangeInput) {
    const range = resolveRange(params);
    const [revenue, outstandingFolios, totalRooms, occupiedRooms, reservations] = await Promise.all([
      this.buildRevenueAggregation(hotelId, range),
      this.getOutstandingFolios(hotelId, { ...params, page: 1, limit: 1 }),
      this.prisma.room.count({ where: { hotelId } }),
      this.prisma.room.count({ where: { hotelId, status: 'OCCUPIED' } }),
      this.prisma.reservation.findMany({
        where: {
          hotelId,
          checkIn: { gte: range.from },
          checkOut: { lte: range.to },
        },
        select: { source: true },
      }),
    ]);

    const activeReservations = await this.prisma.reservation.findMany({
      where: { hotelId, status: { in: ['CHECKED_IN', 'CONFIRMED'] } },
      select: { totalAmount: true, checkIn: true, checkOut: true },
    });

    const adr = activeReservations.length
      ? Math.round(
          activeReservations.reduce((sum, reservation) => {
            const nights = Math.max(dayjs(reservation.checkOut).diff(dayjs(reservation.checkIn), 'day'), 1);
            return sum + money(reservation.totalAmount) / nights;
          }, 0) / activeReservations.length,
        )
      : 0;

    const sourceCounts = reservations.reduce<Record<string, number>>((acc, reservation) => {
      const key = reservation.source?.trim() || 'Direct';
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});

    const guestSourceData = Object.entries(sourceCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, count], index) => ({
        name,
        value: percent(count, reservations.length),
        color: ['#3b82f6', '#0ea5e9', '#8b5cf6', '#10b981', '#64748b'][index] ?? '#64748b',
      }));

    return {
      range: rangePayload(range),
      summary: {
        revenueTotal: revenue.summary.invoiceTotal,
        occupancyRate: percent(occupiedRooms, totalRooms),
        occupiedRooms,
        totalRooms,
        adr,
        outstandingFolios: outstandingFolios.summary.outstanding,
        outstandingCount: outstandingFolios.summary.count,
      },
      revenueChart: revenue.streamDaily,
      guestSourceData,
    };
  }

  async getRevenue(hotelId: string, params: RangeInput) {
    const range = resolveRange(params);
    const revenue = await this.buildRevenueAggregation(hotelId, range);

    return {
      range: rangePayload(range),
      summary: revenue.summary,
      byType: revenue.byType,
      byStatus: revenue.byStatus,
      daily: revenue.daily,
      streamDaily: revenue.streamDaily,
      rows: revenue.rows,
    };
  }

  async getCogs(hotelId: string, params: RangeInput) {
    const range = resolveRange(params);
    const movements = await this.prisma.stockMovement.findMany({
      where: {
        hotelId,
        type: 'OUT',
        sourceType: 'POS_SALE',
        createdAt: { gte: range.from, lte: range.to },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        item: {
          select: {
            id: true,
            name: true,
            sku: true,
            category: true,
            unit: true,
            costPerUnit: true,
          },
        },
      },
    });

    const byCategory = new Map<string, { category: string; cost: number; quantity: number; count: number }>();
    const byItem = new Map<string, { itemId: string; name: string; sku: string; category: string; unit: string; cost: number; quantity: number; count: number }>();
    const daily = new Map<string, { date: string; cost: number; quantity: number; count: number }>();
    let totalCost = 0;
    let totalQuantity = 0;

    const rows = movements.map((movement) => {
      const quantity = money(movement.quantity);
      const unitCost = money(movement.item.costPerUnit);
      const cost = quantity * unitCost;
      const date = movement.createdAt.toISOString().slice(0, 10);

      totalCost += cost;
      totalQuantity += quantity;

      addToBucket(byCategory, movement.item.category, { category: movement.item.category, cost: 0, quantity: 0, count: 0 }, (bucket) => {
        bucket.cost += cost;
        bucket.quantity += quantity;
        bucket.count += 1;
      });

      addToBucket(
        byItem,
        movement.item.id,
        {
          itemId: movement.item.id,
          name: movement.item.name,
          sku: movement.item.sku,
          category: movement.item.category,
          unit: movement.item.unit,
          cost: 0,
          quantity: 0,
          count: 0,
        },
        (bucket) => {
          bucket.cost += cost;
          bucket.quantity += quantity;
          bucket.count += 1;
        },
      );

      addToBucket(daily, date, { date, cost: 0, quantity: 0, count: 0 }, (bucket) => {
        bucket.cost += cost;
        bucket.quantity += quantity;
        bucket.count += 1;
      });

      return {
        id: movement.id,
        createdAt: movement.createdAt,
        sourceId: movement.sourceId,
        quantity,
        unitCost,
        cost,
        item: movement.item,
        note: movement.note,
      };
    });

    return {
      range: rangePayload(range),
      summary: {
        totalCost,
        totalQuantity,
        count: movements.length,
      },
      byCategory: Array.from(byCategory.values()).sort((a, b) => b.cost - a.cost),
      byItem: Array.from(byItem.values()).sort((a, b) => b.cost - a.cost),
      daily: Array.from(daily.values()).sort((a, b) => a.date.localeCompare(b.date)),
      rows,
    };
  }

  async getOutstandingFolios(
    hotelId: string,
    params: RangeInput & { search?: string; page?: number; limit?: number },
  ) {
    const range = resolveOptionalRange(params);
    const page = params.page ?? 1;
    const limit = params.limit ?? 100;
    const skip = (page - 1) * limit;

    const where: any = {
      hotelId,
      status: { in: ACTIVE_FOLIO_STATUSES },
    };

    if (range) {
      where.AND = [
        { checkIn: { lte: range.to } },
        { checkOut: { gte: range.from } },
      ];
    }

    if (params.search) {
      where.OR = [
        { reservationNo: { contains: params.search, mode: 'insensitive' } },
        { guest: { firstName: { contains: params.search, mode: 'insensitive' } } },
        { guest: { lastName: { contains: params.search, mode: 'insensitive' } } },
        { room: { number: { contains: params.search, mode: 'insensitive' } } },
        { company: { name: { contains: params.search, mode: 'insensitive' } } },
      ];
    }

    const reservations = await this.prisma.reservation.findMany({
      where,
      orderBy: { checkIn: 'desc' },
      include: {
        guest: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
        room: { select: { id: true, number: true, type: true } },
        company: { select: { id: true, name: true } },
        groupBooking: { select: { id: true, groupNo: true, name: true } },
        folioItems: true,
        invoices: { include: { payments: true } },
      },
    });

    const allRows = reservations
      .map((reservation) => {
        const folioCharges = reservation.folioItems.reduce((sum, item) => {
          return sum + money(item.amount) * (item.quantity ?? 1);
        }, 0);
        const roomFallback = money(reservation.totalAmount);
        const charges = folioCharges > 0 ? folioCharges : roomFallback;
        const invoiceTotal = reservation.invoices.reduce((sum, invoice) => sum + money(invoice.total), 0);
        const payments = reservation.invoices.reduce((sum, invoice) => {
          return sum + invoice.payments.reduce((paymentSum, payment) => paymentSum + money(payment.amount), 0);
        }, 0);
        const paidAmount = Math.max(payments, money(reservation.paidAmount));
        const outstanding = Math.max(charges - paidAmount, 0);

        return {
          id: reservation.id,
          reservationNo: reservation.reservationNo,
          checkIn: reservation.checkIn,
          checkOut: reservation.checkOut,
          status: reservation.status,
          paymentStatus: reservation.paymentStatus,
          charges,
          folioCharges,
          roomFallback,
          invoiceTotal,
          paidAmount,
          outstanding,
          folioItemCount: reservation.folioItems.length,
          guest: reservation.guest,
          room: reservation.room,
          company: reservation.company,
          groupBooking: reservation.groupBooking,
        };
      })
      .filter((row) => row.outstanding > 0)
      .sort((a, b) => b.outstanding - a.outstanding);

    const rows = allRows.slice(skip, skip + limit);

    return {
      range: rangePayload(range),
      summary: {
        outstanding: allRows.reduce((sum, row) => sum + row.outstanding, 0),
        charges: allRows.reduce((sum, row) => sum + row.charges, 0),
        paidAmount: allRows.reduce((sum, row) => sum + row.paidAmount, 0),
        count: allRows.length,
      },
      rows,
      total: allRows.length,
      page,
      limit,
      totalPages: Math.ceil(allRows.length / limit),
    };
  }

  async getGuestInsights(hotelId: string, params: RangeInput) {
    const range = resolveRange(params);
    const [guests, reservations, inHouse] = await Promise.all([
      this.prisma.guest.findMany({
        where: { hotelId },
        select: {
          nationality: true,
          isVip: true,
          _count: { select: { reservations: true } },
        },
      }),
      this.prisma.reservation.findMany({
        where: {
          hotelId,
          checkIn: { gte: range.from },
          checkOut: { lte: range.to },
        },
        select: {
          status: true,
          source: true,
          totalAmount: true,
          checkIn: true,
          checkOut: true,
        },
      }),
      this.prisma.reservation.count({ where: { hotelId, status: 'CHECKED_IN' } }),
    ]);

    const vipGuests = guests.filter((guest) => guest.isVip).length;
    const repeatGuests = guests.filter((guest) => guest._count.reservations > 1).length;
    const activeReservations = reservations.filter((reservation) =>
      reservation.status === 'CHECKED_IN' || reservation.status === 'CONFIRMED',
    );
    const avgStayNights = activeReservations.length
      ? (
          activeReservations.reduce((sum, reservation) => {
            const nights = Math.max(dayjs(reservation.checkOut).diff(dayjs(reservation.checkIn), 'day'), 1);
            return sum + nights;
          }, 0) / activeReservations.length
        ).toFixed(1)
      : '0.0';

    const bookingSourceCounts = reservations.reduce<Record<string, number>>((acc, reservation) => {
      const key = reservation.source?.trim() || 'Direct';
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
    const sourceData = Object.entries(bookingSourceCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, count], index) => ({
        name,
        value: percent(count, reservations.length),
        color: ['#3b82f6', '#0ea5e9', '#8b5cf6', '#10b981', '#64748b'][index] ?? '#64748b',
      }));

    const nationalityCounts = guests.reduce<Record<string, number>>((acc, guest) => {
      const key = guest.nationality?.trim() || 'Unspecified';
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
    const nationalityMix = Object.entries(nationalityCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([country, count], index) => ({
        country,
        pct: percent(count, guests.length),
        color: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#64748b'][index] ?? '#64748b',
      }));

    const reservationStatusRows = ['CHECKED_IN', 'CONFIRMED', 'CHECKED_OUT', 'PENDING', 'CANCELLED', 'NO_SHOW']
      .map((status) => {
        const matching = reservations.filter((reservation) => reservation.status === status);
        const revenue = matching.reduce((sum, reservation) => sum + money(reservation.totalAmount), 0);
        const avg =
          matching.length > 0
            ? (
                matching.reduce((sum, reservation) => {
                  const nights = Math.max(dayjs(reservation.checkOut).diff(dayjs(reservation.checkIn), 'day'), 1);
                  return sum + nights;
                }, 0) / matching.length
              ).toFixed(1)
            : '0.0';
        return {
          status: status.replace('_', ' '),
          count: matching.length,
          revenue,
          avg,
          pct: percent(matching.length, reservations.length),
        };
      })
      .filter((row) => row.count > 0);

    return {
      range: rangePayload(range),
      summary: {
        totalGuests: guests.length,
        inHouse,
        vipGuests,
        repeatGuests,
        avgStayNights,
      },
      sourceData,
      nationalityMix,
      reservationStatusRows,
    };
  }

  async getStaffInsights(hotelId: string, params: RangeInput) {
    const range = resolveRange(params);
    const todayStart = dayjs().startOf('day');
    const todayEnd = dayjs().endOf('day');
    const weekStart = dayjs(range.to).subtract(6, 'day').startOf('day');
    const weekEnd = dayjs(range.to).endOf('day');

    const [staff, attendanceToday, leavesToday, attendanceWeek] = await Promise.all([
      this.prisma.staff.findMany({
        where: { hotelId },
        select: { id: true, department: true },
        orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
      }),
      this.prisma.attendance.findMany({
        where: { hotelId, timestamp: { gte: todayStart.toDate(), lte: todayEnd.toDate() } },
        orderBy: { timestamp: 'asc' },
      }),
      this.prisma.leave.findMany({
        where: {
          hotelId,
          status: 'APPROVED',
          startDate: { lte: todayEnd.toDate() },
          endDate: { gte: todayStart.toDate() },
        },
        select: { staffId: true },
      }),
      this.prisma.attendance.findMany({
        where: { hotelId, timestamp: { gte: weekStart.toDate(), lte: weekEnd.toDate() } },
        orderBy: { timestamp: 'asc' },
      }),
    ]);

    const leaveSet = new Set(leavesToday.map((leave) => leave.staffId));
    const attendanceTodayMap = new Map<string, typeof attendanceToday>();
    attendanceToday.forEach((record) => {
      const list = attendanceTodayMap.get(record.staffId) ?? [];
      list.push(record);
      attendanceTodayMap.set(record.staffId, list);
    });

    const calcTotalMinutes = (records: typeof attendanceToday) => {
      let total = 0;
      for (let i = 0; i < records.length - 1; i += 2) {
        if (records[i]?.type === AttendanceType.CLOCK_IN && records[i + 1]?.type === AttendanceType.CLOCK_OUT) {
          total += dayjs(records[i + 1].timestamp).diff(records[i].timestamp, 'minute');
        }
      }
      return total;
    };

    const isLate = (records: typeof attendanceToday) => {
      const firstClockIn = records.find((record) => record.type === AttendanceType.CLOCK_IN);
      return firstClockIn ? dayjs(firstClockIn.timestamp).hour() >= 9 : false;
    };

    const departmentRows = Object.entries(
      staff.reduce<Record<string, { count: number; present: number; hours: number; hourCount: number }>>((acc, member) => {
        const department = member.department || 'Unassigned';
        const records = attendanceTodayMap.get(member.id) ?? [];
        const entry = acc[department] ?? { count: 0, present: 0, hours: 0, hourCount: 0 };
        entry.count += 1;
        if (!leaveSet.has(member.id) && records.length > 0) {
          entry.present += 1;
        }
        const totalMinutes = calcTotalMinutes(records);
        if (totalMinutes > 0) {
          entry.hours += totalMinutes / 60;
          entry.hourCount += 1;
        }
        acc[department] = entry;
        return acc;
      }, {}),
    ).map(([dept, row]) => ({
      dept,
      count: row.count,
      present: row.present,
      rate: percent(row.present, row.count),
      hours: row.hourCount ? (row.hours / row.hourCount).toFixed(1) : '0.0',
    }));

    const attendanceWeekMap = new Map<string, Map<string, typeof attendanceWeek>>();
    attendanceWeek.forEach((record) => {
      const dayKey = dayjs(record.timestamp).format('YYYY-MM-DD');
      const dayMap = attendanceWeekMap.get(dayKey) ?? new Map<string, typeof attendanceWeek>();
      const list = dayMap.get(record.staffId) ?? [];
      list.push(record);
      dayMap.set(record.staffId, list);
      attendanceWeekMap.set(dayKey, dayMap);
    });

    const weekRows = Array.from({ length: 7 }).map((_, index) => {
      const day = weekStart.add(index, 'day');
      const dayKey = day.format('YYYY-MM-DD');
      const dayRecords = attendanceWeekMap.get(dayKey) ?? new Map<string, typeof attendanceWeek>();

      let present = 0;
      let late = 0;
      let absent = 0;

      staff.forEach((member) => {
        const records = dayRecords.get(member.id) ?? [];
        if (!records.length) {
          absent += 1;
          return;
        }
        if (isLate(records)) {
          late += 1;
          return;
        }
        present += 1;
      });

      return {
        day: day.format('ddd'),
        present,
        late,
        absent,
      };
    });

    const hoursSamples = Array.from(attendanceTodayMap.values())
      .map((records) => calcTotalMinutes(records) / 60)
      .filter((hours) => hours > 0);
    const lateArrivals = Array.from(attendanceTodayMap.values()).filter((records) => isLate(records)).length;
    const presentCount = staff.filter((member) => {
      const records = attendanceTodayMap.get(member.id) ?? [];
      return !leaveSet.has(member.id) && records.length > 0;
    }).length;

    return {
      range: rangePayload(range),
      summary: {
        totalStaff: staff.length,
        attendanceRate: percent(presentCount, staff.length),
        avgHoursWorked: hoursSamples.length
          ? (hoursSamples.reduce((sum, value) => sum + value, 0) / hoursSamples.length).toFixed(1)
          : '0.0',
        lateArrivals,
      },
      attendanceWeek: weekRows,
      departmentRows,
    };
  }

  async getInventoryInsights(hotelId: string, params: RangeInput) {
    const range = resolveRange(params);
    const [items, turnoverCount] = await Promise.all([
      this.prisma.inventoryItem.findMany({
        where: { hotelId },
        select: {
          name: true,
          quantity: true,
          minStock: true,
          unit: true,
          category: true,
          costPerUnit: true,
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.stockMovement.count({
        where: {
          hotelId,
          type: 'OUT',
          sourceType: 'POS_SALE',
          createdAt: { gte: range.from, lte: range.to },
        },
      }),
    ]);

    const inventoryAlertRows = items
      .filter((item) => money(item.quantity) <= money(item.minStock))
      .slice(0, 8)
      .map((item) => ({
        item: item.name,
        current: money(item.quantity),
        par: money(item.minStock) || 1,
        unit: item.unit,
        category: item.category,
      }));

    return {
      range: rangePayload(range),
      summary: {
        totalItems: items.length,
        lowStockCount: items.filter((item) => money(item.quantity) <= money(item.minStock)).length,
        inventoryValue: items.reduce((sum, item) => sum + money(item.quantity) * money(item.costPerUnit), 0),
        turnoverRate: turnoverCount,
      },
      inventoryAlertRows,
    };
  }

  async getOccupancyInsights(hotelId: string, params: RangeInput) {
    const range = resolveRange(params);
    const [rooms, activeReservations, periodReservations] = await Promise.all([
      this.prisma.room.findMany({
        where: { hotelId },
        select: { id: true, status: true },
      }),
      this.prisma.reservation.findMany({
        where: { hotelId, status: { in: ['CHECKED_IN', 'CONFIRMED'] } },
        select: {
          totalAmount: true,
          checkIn: true,
          checkOut: true,
        },
      }),
      this.prisma.reservation.findMany({
        where: {
          hotelId,
          checkIn: { lte: range.to },
          checkOut: { gte: range.from },
          status: { in: ['CHECKED_IN', 'CONFIRMED', 'CHECKED_OUT'] },
        },
        select: {
          totalAmount: true,
          checkIn: true,
          checkOut: true,
          room: { select: { type: true } },
        },
      }),
    ]);

    const totalRooms = rooms.length;
    const occupiedRooms = rooms.filter((room) => room.status === 'OCCUPIED').length;
    const adr = activeReservations.length
      ? Math.round(
          activeReservations.reduce((sum, reservation) => {
            const nights = Math.max(dayjs(reservation.checkOut).diff(dayjs(reservation.checkIn), 'day'), 1);
            return sum + money(reservation.totalAmount) / nights;
          }, 0) / activeReservations.length,
        )
      : 0;
    const revPar = Math.round((adr * percent(occupiedRooms, totalRooms)) / 100);

    const dayCount = Math.max(dayjs(range.to).diff(dayjs(range.from), 'day') + 1, 1);
    const occupancyData = Array.from({ length: dayCount }).map((_, index) => {
      const date = dayjs(range.from).add(index, 'day');
      const overlapping = periodReservations.filter((reservation) => {
        const checkIn = dayjs(reservation.checkIn).startOf('day');
        const checkOut = dayjs(reservation.checkOut).startOf('day');
        return (date.isAfter(checkIn) || date.isSame(checkIn, 'day')) && date.isBefore(checkOut);
      });
      const dailyAdr = overlapping.length
        ? Math.round(
            overlapping.reduce((sum, reservation) => {
              const nights = Math.max(dayjs(reservation.checkOut).diff(dayjs(reservation.checkIn), 'day'), 1);
              return sum + money(reservation.totalAmount) / nights;
            }, 0) / overlapping.length,
          )
        : 0;
      const occupancy = percent(overlapping.length, totalRooms);
      return {
        month: date.format('MMM D'),
        occupancy,
        adr: dailyAdr,
        revpar: Math.round((dailyAdr * occupancy) / 100),
      };
    });

    const roomTypeMap = new Map<string, { type: string; revenue: number; nights: number; adr: number }>();
    periodReservations.forEach((reservation) => {
      const roomType = reservation.room?.type ?? 'Unknown';
      const nights = Math.max(dayjs(reservation.checkOut).diff(dayjs(reservation.checkIn), 'day'), 1);
      const revenue = money(reservation.totalAmount);
      const bucket = roomTypeMap.get(roomType) ?? { type: roomType, revenue: 0, nights: 0, adr: 0 };
      bucket.revenue += revenue;
      bucket.nights += nights;
      bucket.adr = bucket.nights ? Math.round(bucket.revenue / bucket.nights) : 0;
      roomTypeMap.set(roomType, bucket);
    });

    return {
      range: rangePayload(range),
      summary: {
        occupancyRate: percent(occupiedRooms, totalRooms),
        occupiedRooms,
        checkedIn: activeReservations.length,
        adr,
        revPar,
      },
      occupancyData,
      roomTypeRevenue: Array.from(roomTypeMap.values()).sort((a, b) => b.revenue - a.revenue),
    };
  }
}
