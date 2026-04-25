import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { ReservationStatus, PaymentStatus, RoomStatus, BookingType } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { genReservationNo, nightsBetween } from 'src/common/utils/reservation.utils';
import { buildCursor, buildCursorWhere, parseCursor } from 'src/common/utils/cursor.utils';
import { ReservationFilterDto } from '../dtos/reservation-filter.dto';
import { AvailabilityDto } from '../dtos/availability.dto';
import { CreateReservationDto } from '../dtos/create-reservation.dto';
import { UpdateReservationDto } from '../dtos/update-reservation.dto';
import { RecordPaymentDto } from '../dtos/record-payment.dto';
import * as path from 'path';
import { readFile } from 'fs/promises';
import * as handlebars from 'handlebars';
import { compileTemplate } from 'src/common/utils/compile-template.utils';
import { LedgerService } from '../../ledger/ledger.service';
import { NotificationsService } from '../../notifications/notifications.service';

// ─── Service ──────────────────────────────────────────────────────────────────

const RESERVATION_INCLUDE = {
  guest: true,
  room: { include: { floor: { select: { name: true } } } },
  company: { select: { id: true, name: true, email: true, contactName: true } },
  groupBooking: { select: { id: true, groupNo: true, name: true } },
  guests: { include: { guest: true }, orderBy: { addedAt: 'asc' as const } },
  folioItems: { orderBy: { createdAt: 'asc' as const } },
  invoices: { include: { payments: true } },
};

@Injectable()
export class ReservationsService {
  private readonly logger = new Logger(ReservationsService.name);

  constructor(
    private prisma: PrismaService,
    private ledger: LedgerService,
    private notifications: NotificationsService,
  ) {}

  private buildNewReservationNotificationEmail(args: {
    hotelName: string;
    reservationNo: string;
    guestName: string;
    roomNumber: string;
    checkIn: Date;
    checkOut: Date;
    totalAmount: number;
  }) {
    const hotelName = escapeHtml(args.hotelName);
    const reservationNo = escapeHtml(args.reservationNo);
    const guestName = escapeHtml(args.guestName);
    const roomNumber = escapeHtml(args.roomNumber);
    const checkIn = fmtDate(args.checkIn);
    const checkOut = fmtDate(args.checkOut);
    const totalAmount = fmtMoney(args.totalAmount);

    return {
      subject: `New reservation ${reservationNo} for ${guestName}`,
      text:
        `${args.hotelName}: a new reservation has been created.\n` +
        `Reservation: ${args.reservationNo}\n` +
        `Guest: ${args.guestName}\n` +
        `Room: ${args.roomNumber}\n` +
        `Check-in: ${checkIn}\n` +
        `Check-out: ${checkOut}\n` +
        `Total: ${totalAmount}`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.6;">
          <p style="margin: 0 0 12px;">A new reservation has been created for <strong>${hotelName}</strong>.</p>
          <table style="border-collapse: collapse;">
            <tr><td style="padding: 4px 12px 4px 0;"><strong>Reservation</strong></td><td style="padding: 4px 0;">${reservationNo}</td></tr>
            <tr><td style="padding: 4px 12px 4px 0;"><strong>Guest</strong></td><td style="padding: 4px 0;">${guestName}</td></tr>
            <tr><td style="padding: 4px 12px 4px 0;"><strong>Room</strong></td><td style="padding: 4px 0;">${roomNumber}</td></tr>
            <tr><td style="padding: 4px 12px 4px 0;"><strong>Check-in</strong></td><td style="padding: 4px 0;">${checkIn}</td></tr>
            <tr><td style="padding: 4px 12px 4px 0;"><strong>Check-out</strong></td><td style="padding: 4px 0;">${checkOut}</td></tr>
            <tr><td style="padding: 4px 12px 4px 0;"><strong>Total</strong></td><td style="padding: 4px 0;">${totalAmount}</td></tr>
          </table>
        </div>
      `,
    };
  }

  private buildNewReservationInAppNotification(args: {
    reservationNo: string;
    guestName: string;
    roomNumber: string;
    checkIn: Date;
    checkOut: Date;
  }) {
    return {
      title: 'New reservation created',
      message:
        `${args.guestName} was booked into room ${args.roomNumber} ` +
        `from ${fmtDate(args.checkIn)} to ${fmtDate(args.checkOut)}.`,
      metadata: {
        reservationNo: args.reservationNo,
        guestName: args.guestName,
        roomNumber: args.roomNumber,
        checkIn: args.checkIn.toISOString(),
        checkOut: args.checkOut.toISOString(),
      },
    };
  }

  private buildPaymentReceivedNotificationEmail(args: {
    hotelName: string;
    reservationNo: string;
    guestName: string;
    roomNumber: string;
    amount: number;
    method: string;
    reference?: string | null;
    paidAt: Date;
    paidAmount: number;
    balance: number;
  }) {
    const hotelName = escapeHtml(args.hotelName);
    const reservationNo = escapeHtml(args.reservationNo);
    const guestName = escapeHtml(args.guestName);
    const roomNumber = escapeHtml(args.roomNumber);
    const method = escapeHtml(args.method);
    const reference = args.reference ? escapeHtml(args.reference) : null;
    const amount = fmtMoney(args.amount);
    const paidAmount = fmtMoney(args.paidAmount);
    const balance = fmtMoney(args.balance);
    const paidAt = fmtDate(args.paidAt);

    return {
      subject: `Payment received for reservation ${reservationNo}`,
      text:
        `${args.hotelName}: a payment has been recorded.\n` +
        `Reservation: ${args.reservationNo}\n` +
        `Guest: ${args.guestName}\n` +
        `Room: ${args.roomNumber}\n` +
        `Amount: ${amount}\n` +
        `Method: ${args.method}\n` +
        `Paid at: ${paidAt}\n` +
        `Total paid: ${paidAmount}\n` +
        `Balance: ${balance}` +
        (args.reference ? `\nReference: ${args.reference}` : ''),
      html: `
        <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.6;">
          <p style="margin: 0 0 12px;">A payment has been recorded for <strong>${hotelName}</strong>.</p>
          <table style="border-collapse: collapse;">
            <tr><td style="padding: 4px 12px 4px 0;"><strong>Reservation</strong></td><td style="padding: 4px 0;">${reservationNo}</td></tr>
            <tr><td style="padding: 4px 12px 4px 0;"><strong>Guest</strong></td><td style="padding: 4px 0;">${guestName}</td></tr>
            <tr><td style="padding: 4px 12px 4px 0;"><strong>Room</strong></td><td style="padding: 4px 0;">${roomNumber}</td></tr>
            <tr><td style="padding: 4px 12px 4px 0;"><strong>Amount</strong></td><td style="padding: 4px 0;">${amount}</td></tr>
            <tr><td style="padding: 4px 12px 4px 0;"><strong>Method</strong></td><td style="padding: 4px 0;">${method}</td></tr>
            <tr><td style="padding: 4px 12px 4px 0;"><strong>Paid at</strong></td><td style="padding: 4px 0;">${paidAt}</td></tr>
            <tr><td style="padding: 4px 12px 4px 0;"><strong>Total paid</strong></td><td style="padding: 4px 0;">${paidAmount}</td></tr>
            <tr><td style="padding: 4px 12px 4px 0;"><strong>Balance</strong></td><td style="padding: 4px 0;">${balance}</td></tr>
            ${reference ? `<tr><td style="padding: 4px 12px 4px 0;"><strong>Reference</strong></td><td style="padding: 4px 0;">${reference}</td></tr>` : ''}
          </table>
        </div>
      `,
    };
  }

  private buildPaymentReceivedInAppNotification(args: {
    reservationNo: string;
    guestName: string;
    amount: number;
    method: string;
    balance: number;
  }) {
    return {
      title: 'Payment received',
      message:
        `${fmtMoney(args.amount)} was received for ${args.guestName} ` +
        `on reservation ${args.reservationNo} via ${args.method}. ` +
        `Balance remaining: ${fmtMoney(args.balance)}.`,
      metadata: {
        reservationNo: args.reservationNo,
        guestName: args.guestName,
        amount: args.amount,
        method: args.method,
        balance: args.balance,
      },
    };
  }

  private async assertGuestBelongsToHotel(hotelId: string, guestId?: string | null) {
    if (!guestId) return;
    const guest = await this.prisma.guest.findFirst({
      where: { id: guestId, hotelId },
      select: { id: true },
    });
    if (!guest) throw new NotFoundException('Guest not found.');
  }

  private async assertCompanyBelongsToHotel(hotelId: string, companyId?: string | null) {
    if (!companyId) return;
    const company = await this.prisma.company.findFirst({
      where: { id: companyId, hotelId },
      select: { id: true },
    });
    if (!company) throw new NotFoundException('Company not found.');
  }

  private async assertGroupBookingBelongsToHotel(hotelId: string, groupBookingId?: string | null) {
    if (!groupBookingId) return;
    const groupBooking = await this.prisma.groupBooking.findFirst({
      where: { id: groupBookingId, hotelId },
      select: { id: true },
    });
    if (!groupBooking) throw new NotFoundException('Group booking not found.');
  }

  private async getAvailableRoomForReservation(
    hotelId: string,
    roomId: string,
    checkIn: Date,
    checkOut: Date,
    excludeReservationId?: string,
  ) {
    const room = await this.prisma.room.findFirst({
      where: { id: roomId, hotelId },
    });
    if (!room) throw new NotFoundException('Room not found.');
    if (room.status === RoomStatus.MAINTENANCE || room.status === RoomStatus.OUT_OF_ORDER) {
      throw new BadRequestException(`Room ${room.number} is not available.`);
    }

    const overlap = await this.prisma.reservation.findFirst({
      where: {
        hotelId,
        roomId,
        id: excludeReservationId ? { not: excludeReservationId } : undefined,
        status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] },
        checkIn: { lt: checkOut },
        checkOut: { gt: checkIn },
      },
    });
    if (overlap) {
      throw new ConflictException(
        `Room is already booked ${overlap.reservationNo} for those dates.`,
      );
    }

    return room;
  }

  private normalizeOptionalRelations<T extends Record<string, any>>(dto: T) {
    return {
      ...dto,
      companyId: dto.companyId === undefined ? undefined : dto.companyId?.trim() || null,
      groupBookingId:
        dto.groupBookingId === undefined ? undefined : dto.groupBookingId?.trim() || null,
    };
  }

  // ── List ────────────────────────────────────────────────────────────────────
  async findAll(hotelId: string, filters: ReservationFilterDto) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = { hotelId };
    if (filters.status) where.status = filters.status;
    if (filters.roomId) where.roomId = filters.roomId;
    if (filters.guestId) where.guestId = filters.guestId;

    if (filters.dateFrom || filters.dateTo) {
      where.AND = [
        filters.dateFrom ? { checkIn: { gte: new Date(filters.dateFrom) } } : {},
        filters.dateTo ? { checkOut: { lte: new Date(filters.dateTo) } } : {},
      ];
    }

    if (filters.search) {
      where.OR = [
        { reservationNo: { contains: filters.search, mode: 'insensitive' } },
        { guest: { firstName: { contains: filters.search, mode: 'insensitive' } } },
        { guest: { lastName: { contains: filters.search, mode: 'insensitive' } } },
        { room: { number: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

    const [reservations, total] = await Promise.all([
      this.prisma.reservation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { checkIn: 'desc' },
        include: {
          guest: {
            select: { id: true, firstName: true, lastName: true, isVip: true, phone: true },
          },
          room: {
            select: { id: true, number: true, type: true, floor: { select: { name: true } } },
          },
          company: { select: { id: true, name: true } },
          groupBooking: { select: { id: true, groupNo: true, name: true } },
          _count: { select: { folioItems: true } },
        },
      }),
      this.prisma.reservation.count({ where }),
    ]);

    // Today's stats (always hotel-wide)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [arrivals, departures, inHouse, pending] = await Promise.all([
      this.prisma.reservation.count({
        where: {
          hotelId,
          checkIn: { gte: today, lt: tomorrow },
          status: { in: ['CONFIRMED', 'PENDING'] },
        },
      }),
      this.prisma.reservation.count({
        where: { hotelId, checkOut: { gte: today, lt: tomorrow }, status: 'CHECKED_IN' },
      }),
      this.prisma.reservation.count({ where: { hotelId, status: 'CHECKED_IN' } }),
      this.prisma.reservation.count({ where: { hotelId, status: 'PENDING' } }),
    ]);

    return {
      reservations,
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
      stats: { arrivals, departures, inHouse, pending },
    };
  }

  // ── Single ──────────────────────────────────────────────────────────────────
  async findOne(hotelId: string, id: string) {
    const res = await this.prisma.reservation.findFirst({
      where: { id, hotelId },
      include: RESERVATION_INCLUDE as any,
    });
    if (!res) throw new NotFoundException('Reservation not found.');
    return res;
  }

  // ── Availability ────────────────────────────────────────────────────────────
  async getAvailableRooms(hotelId: string, dto: AvailabilityDto) {
    const checkIn = new Date(dto.checkIn);
    const checkOut = new Date(dto.checkOut);

    if (checkOut <= checkIn) throw new BadRequestException('Check-out must be after check-in.');

    // Rooms with overlapping active reservations
    const occupied = await this.prisma.reservation.findMany({
      where: {
        hotelId,
        status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] },
        checkIn: { lt: checkOut },
        checkOut: { gt: checkIn },
      },
      select: { roomId: true },
    });
    const occupiedIds = occupied.map((r) => r.roomId);

    const where: any = {
      hotelId,
      id: { notIn: occupiedIds },
      status: { notIn: [RoomStatus.MAINTENANCE, RoomStatus.OUT_OF_ORDER, RoomStatus.DIRTY] },
    };
    if (dto.type) where.type = dto.type;
    if (dto.minGuests) where.maxGuests = { gte: dto.minGuests };

    return this.prisma.room.findMany({
      where,
      orderBy: [{ floor: { level: 'asc' } }, { number: 'asc' }],
      include: { floor: { select: { name: true, level: true } } },
    });
  }

  // ── Create ──────────────────────────────────────────────────────────────────
  async create(hotelId: string, dto: CreateReservationDto, actorUserId?: string) {
    const data = this.normalizeOptionalRelations(dto);
    const checkIn = new Date(dto.checkIn);
    const checkOut = new Date(dto.checkOut);

    if (checkOut <= checkIn) throw new BadRequestException('Check-out must be after check-in.');

    const room = await this.getAvailableRoomForReservation(hotelId, dto.roomId, checkIn, checkOut);
    await Promise.all([
      this.assertGuestBelongsToHotel(hotelId, data.guestId),
      this.assertCompanyBelongsToHotel(hotelId, data.companyId),
      this.assertGroupBookingBelongsToHotel(hotelId, data.groupBookingId),
    ]);

    const nights = nightsBetween(checkIn, checkOut);
    const totalAmount = dto.totalAmount ?? nights * Number(room.baseRate);

    // Unique reservation number
    let reservationNo: string;
    let attempts = 0;
    do {
      reservationNo = genReservationNo(hotelId);
      const exists = await this.prisma.reservation.findUnique({ where: { reservationNo } });
      if (!exists) break;
    } while (++attempts < 5);

    const reservation = await this.prisma.reservation.create({
      data: {
        hotelId,
        guestId: data.guestId,
        roomId: data.roomId,
        companyId: data.companyId,
        groupBookingId: data.groupBookingId,
        bookingType: dto.bookingType ?? BookingType.INDIVIDUAL,
        reservationNo: reservationNo!,
        checkIn,
        checkOut,
        adults: dto.adults ?? 1,
        children: dto.children ?? 0,
        status: ReservationStatus.CONFIRMED,
        paymentStatus: PaymentStatus.UNPAID,
        totalAmount,
        paidAmount: 0,
        source: dto.source ?? 'DIRECT',
        specialRequests: dto.specialRequests,
        notes: dto.notes,
      },
      include: RESERVATION_INCLUDE as any,
    });

    // Add primary guest to ReservationGuest
    await this.prisma.reservationGuest.create({
      data: { reservationId: reservation.id, guestId: data.guestId, role: 'PRIMARY' },
    });

    // Mark room as RESERVED
    await this.prisma.room.update({
      where: { id: dto.roomId },
      data: { status: RoomStatus.RESERVED },
    });

    const hotel = await this.prisma.hotel.findUnique({
      where: { id: hotelId },
      select: { name: true },
    });

    const reservationDetails = reservation as any;
    const guestName =
      `${reservationDetails.guest?.firstName ?? ''} ${reservationDetails.guest?.lastName ?? ''}`.trim() ||
      'Guest';

    try {
      await this.notifications.dispatch({
        hotelId,
        event: 'newReservation',
        excludeEmailUserIds: actorUserId ? [actorUserId] : undefined,
        email: this.buildNewReservationNotificationEmail({
          hotelName: hotel?.name ?? 'HotelOS',
          reservationNo: reservation.reservationNo,
          guestName,
          roomNumber: reservationDetails.room?.number ?? 'Unassigned',
          checkIn: reservation.checkIn,
          checkOut: reservation.checkOut,
          totalAmount: Number(reservation.totalAmount),
        }),
        inApp: this.buildNewReservationInAppNotification({
          reservationNo: reservation.reservationNo,
          guestName,
          roomNumber: reservationDetails.room?.number ?? 'Unassigned',
          checkIn: reservation.checkIn,
          checkOut: reservation.checkOut,
        }),
      });
    } catch (error) {
      this.logger.warn(
        `Failed to dispatch newReservation notification for ${reservation.reservationNo}: ${String(error)}`,
      );
    }

    return reservation;
  }

  // ── Update ──────────────────────────────────────────────────────────────────
  async update(hotelId: string, id: string, dto: UpdateReservationDto) {
    const data = this.normalizeOptionalRelations(dto);
    const current = await this.findOne(hotelId, id);
    const nextRoomId = data.roomId ?? current.roomId;
    const nextCheckIn = data.checkIn ? new Date(data.checkIn) : current.checkIn;
    const nextCheckOut = data.checkOut ? new Date(data.checkOut) : current.checkOut;
    const roomOrDateChanged =
      nextRoomId !== current.roomId ||
      nextCheckIn.getTime() !== current.checkIn.getTime() ||
      nextCheckOut.getTime() !== current.checkOut.getTime();

    if (nextCheckOut <= nextCheckIn) {
      throw new BadRequestException('Check-out must be after check-in.');
    }

    if (roomOrDateChanged && !['PENDING', 'CONFIRMED'].includes(current.status)) {
      throw new BadRequestException(`Cannot change room or dates for status ${current.status}.`);
    }

    await Promise.all([
      this.assertGuestBelongsToHotel(hotelId, data.guestId),
      this.assertCompanyBelongsToHotel(hotelId, data.companyId),
      this.assertGroupBookingBelongsToHotel(hotelId, data.groupBookingId),
      roomOrDateChanged
        ? this.getAvailableRoomForReservation(hotelId, nextRoomId, nextCheckIn, nextCheckOut, id)
        : Promise.resolve(null),
    ]);

    const updated = await this.prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.update({
        where: { id: current.id },
        data: {
          ...data,
          checkIn: data.checkIn ? nextCheckIn : undefined,
          checkOut: data.checkOut ? nextCheckOut : undefined,
        },
        include: RESERVATION_INCLUDE as any,
      });

      if (data.roomId && data.roomId !== current.roomId && ['PENDING', 'CONFIRMED'].includes(reservation.status)) {
        await tx.room.update({ where: { id: current.roomId }, data: { status: RoomStatus.AVAILABLE } });
        await tx.room.update({ where: { id: data.roomId }, data: { status: RoomStatus.RESERVED } });
      }

      return reservation;
    });

    return updated;
  }

  // ── Check In ────────────────────────────────────────────────────────────────
  async checkIn(hotelId: string, id: string) {
    const res = await this.findOne(hotelId, id);
    if (!['CONFIRMED', 'PENDING'].includes(res.status)) {
      throw new BadRequestException(`Cannot check in a reservation with status ${res.status}.`);
    }

    const [updated] = await Promise.all([
      this.prisma.reservation.update({
        where: { id },
        data: { status: ReservationStatus.CHECKED_IN },
        include: RESERVATION_INCLUDE as any,
      }),
      this.prisma.room.update({
        where: { id: res.roomId },
        data: { status: RoomStatus.OCCUPIED },
      }),
    ]);

    // Seed first room-night folio item
    const description = `Room charge — ${(res as any).room.number} (${(res as any).room.type})`;
    const folioItem = await this.prisma.folioItem.create({
      data: {
        hotelId,
        reservationId: id,
        description,
        amount: (res as any).room.baseRate,
        quantity: 1,
        category: 'ROOM',
      },
    });

    await this.ledger.postFolioCharge(hotelId, {
      amount: Number(folioItem.amount),
      category: folioItem.category,
      description: folioItem.description,
      reservationId: folioItem.reservationId,
      folioItemId: folioItem.id,
    });

    return updated;
  }

  // ── Check Out ───────────────────────────────────────────────────────────────
  async checkOut(hotelId: string, id: string) {
    const res = await this.findOne(hotelId, id);
    if (res.status !== 'CHECKED_IN') {
      throw new BadRequestException(`Cannot check out a reservation with status ${res.status}.`);
    }

    const [updated] = await Promise.all([
      this.prisma.reservation.update({
        where: { id },
        data: { status: ReservationStatus.CHECKED_OUT },
        include: RESERVATION_INCLUDE as any,
      }),
      this.prisma.room.update({
        where: { id: res.roomId },
        data: { status: RoomStatus.DIRTY },
      }),
    ]);

    return updated;
  }

  // ── Cancel ──────────────────────────────────────────────────────────────────
  async cancel(hotelId: string, id: string) {
    const res = await this.findOne(hotelId, id);
    if (['CHECKED_IN', 'CHECKED_OUT'].includes(res.status)) {
      throw new BadRequestException(`Cannot cancel a reservation with status ${res.status}.`);
    }

    const [updated] = await Promise.all([
      this.prisma.reservation.update({
        where: { id },
        data: { status: ReservationStatus.CANCELLED },
        include: RESERVATION_INCLUDE as any,
      }),
      this.prisma.room.update({
        where: { id: res.roomId },
        data: { status: RoomStatus.AVAILABLE },
      }),
    ]);

    return updated;
  }

  // ── No Show ─────────────────────────────────────────────────────────────────
  async noShow(hotelId: string, id: string) {
    const res = await this.findOne(hotelId, id);
    if (!['CONFIRMED', 'PENDING'].includes(res.status)) {
      throw new BadRequestException(`Cannot mark no-show for status ${res.status}.`);
    }

    const [updated] = await Promise.all([
      this.prisma.reservation.update({
        where: { id },
        data: { status: ReservationStatus.NO_SHOW },
        include: RESERVATION_INCLUDE as any,
      }),
      this.prisma.room.update({
        where: { id: res.roomId },
        data: { status: RoomStatus.AVAILABLE },
      }),
    ]);

    return updated;
  }

  // ── Add Folio Item ──────────────────────────────────────────────────────────
  async addFolioItem(
    hotelId: string,
    id: string,
    dto: { description: string; amount: number; category: string; quantity?: number },
  ) {
    await this.findOne(hotelId, id);
    const folioItem = await this.prisma.folioItem.create({
      data: {
        hotelId,
        reservationId: id,
        description: dto.description,
        amount: dto.amount,
        quantity: dto.quantity ?? 1,
        category: dto.category,
      },
    });

    await this.ledger.postFolioCharge(hotelId, {
      amount: Number(folioItem.amount),
      category: folioItem.category,
      description: folioItem.description,
      reservationId: folioItem.reservationId,
      folioItemId: folioItem.id,
    });

    return folioItem;
  }

  async getFolioItems(
    hotelId: string,
    reservationId: string,
    options: { limit?: number; cursor?: string } = {},
  ) {
    const reservation = await this.prisma.reservation.findFirst({
      where: { id: reservationId, hotelId },
      select: { id: true },
    });
    if (!reservation) throw new NotFoundException('Reservation not found.');

    const limit = Math.min(Math.max(options.limit ?? 20, 1), 100);
    const cursor = parseCursor(options.cursor);

    const items = await this.prisma.folioItem.findMany({
      where: {
        hotelId,
        reservationId,
        ...(cursor ? buildCursorWhere(cursor) : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit,
    });

    const nextCursor = items.length === limit ? buildCursor(items[items.length - 1]) : null;

    return { items, nextCursor };
  }

  // ── Payments ───────────────────────────────────────────────────────────────
  private async ensureReservationInvoice(tx: any, hotelId: string, reservation: any) {
    let invoice = await tx.invoice.findFirst({
      where: { hotelId, reservationId: reservation.id },
      orderBy: { issuedAt: 'desc' },
    });
    if (invoice) return invoice;

    const base = `INV-${reservation.reservationNo}`;
    let invoiceNo = base;
    let attempt = 1;
    while (await tx.invoice.findUnique({ where: { invoiceNo } })) {
      attempt += 1;
      if (attempt > 50) throw new ConflictException('Could not generate a unique invoice number.');
      invoiceNo = `${base}-${attempt}`;
    }

    invoice = await tx.invoice.create({
      data: {
        hotelId,
        reservationId: reservation.id,
        invoiceNo,
        issuedAt: new Date(),
        subtotal: reservation.totalAmount,
        tax: 0,
        discount: 0,
        total: reservation.totalAmount,
        paymentStatus: PaymentStatus.UNPAID,
        notes: reservation.notes ?? undefined,
      },
    });
    return invoice;
  }

  async recordPayment(
    hotelId: string,
    reservationId: string,
    dto: RecordPaymentDto,
    actorUserId?: string,
  ) {
    const result = await this.prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.findFirst({
        where: { id: reservationId, hotelId },
        include: { guest: true, room: true },
      });
      if (!reservation) throw new NotFoundException('Reservation not found.');

      const paidAgg = await tx.payment.aggregate({
        where: { invoice: { reservationId, hotelId } },
        _sum: { amount: true },
      });
      const alreadyPaid = Number(paidAgg._sum.amount ?? 0);
      const balance = Number(reservation.totalAmount) - alreadyPaid;
      if (dto.amount > balance)
        throw new BadRequestException('Amount exceeds outstanding balance.');

      const invoice = await this.ensureReservationInvoice(tx, hotelId, reservation);
      const payment = await tx.payment.create({
        data: {
          hotelId,
          invoiceId: invoice.id,
          amount: dto.amount,
          method: dto.method,
          reference: dto.reference,
          note: dto.note,
          paidAt: dto.paidAt ? new Date(dto.paidAt) : new Date(),
        },
      });

      const invoicePaidAgg = await tx.payment.aggregate({
        where: { invoiceId: invoice.id },
        _sum: { amount: true },
      });
      const invoicePaid = Number(invoicePaidAgg._sum.amount ?? 0);
      const invoiceStatus =
        invoicePaid >= Number(invoice.total)
          ? PaymentStatus.PAID
          : invoicePaid > 0
            ? PaymentStatus.PARTIAL
            : PaymentStatus.UNPAID;
      await tx.invoice.update({
        where: { id: invoice.id },
        data: { paymentStatus: invoiceStatus },
      });

      const totalPaidAgg = await tx.payment.aggregate({
        where: { invoice: { reservationId, hotelId } },
        _sum: { amount: true },
      });
      const totalPaid = Number(totalPaidAgg._sum.amount ?? 0);
      const resPaymentStatus =
        totalPaid >= Number(reservation.totalAmount)
          ? PaymentStatus.PAID
          : totalPaid > 0
            ? PaymentStatus.PARTIAL
            : PaymentStatus.UNPAID;

      const updatedReservation = await tx.reservation.update({
        where: { id: reservation.id },
        data: { paidAmount: totalPaid, paymentStatus: resPaymentStatus },
        include: RESERVATION_INCLUDE as any,
      });

      return { payment, reservation: updatedReservation };
    });

    await this.ledger.postPayment(hotelId, {
      amount: Number(result.payment.amount),
      method: result.payment.method,
      description: `Reservation payment — ${result.reservation.reservationNo}`,
      invoiceId: result.payment.invoiceId,
      paymentId: result.payment.id,
    });

    const hotel = await this.prisma.hotel.findUnique({
      where: { id: hotelId },
      select: { name: true },
    });

    const reservationDetails = result.reservation as any;
    const guestName =
      `${reservationDetails.guest?.firstName ?? ''} ${reservationDetails.guest?.lastName ?? ''}`.trim() ||
      'Guest';

    try {
      const balance = Math.max(
        0,
        Number(result.reservation.totalAmount) - Number(result.reservation.paidAmount),
      );

      await this.notifications.dispatch({
        hotelId,
        event: 'paymentReceived',
        excludeEmailUserIds: actorUserId ? [actorUserId] : undefined,
        email: this.buildPaymentReceivedNotificationEmail({
          hotelName: hotel?.name ?? 'HotelOS',
          reservationNo: result.reservation.reservationNo,
          guestName,
          roomNumber: reservationDetails.room?.number ?? 'Unassigned',
          amount: Number(result.payment.amount),
          method: result.payment.method,
          reference: result.payment.reference,
          paidAt: result.payment.paidAt,
          paidAmount: Number(result.reservation.paidAmount),
          balance,
        }),
        inApp: this.buildPaymentReceivedInAppNotification({
          reservationNo: result.reservation.reservationNo,
          guestName,
          amount: Number(result.payment.amount),
          method: result.payment.method,
          balance,
        }),
      });
    } catch (error) {
      this.logger.warn(
        `Failed to dispatch paymentReceived notification for ${result.reservation.reservationNo}: ${String(error)}`,
      );
    }

    return result;
  }

  async getPaymentReceiptHtml(hotelId: string, reservationId: string, paymentId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, invoice: { reservationId, hotelId } },
      include: {
        invoice: {
          include: {
            reservation: {
              include: { guest: true, room: true },
            },
          },
        },
      },
    });
    if (!payment) throw new NotFoundException('Payment not found.');

    const reservation = payment.invoice.reservation;
    const guestName =
      `${reservation?.guest?.firstName ?? ''} ${reservation?.guest?.lastName ?? ''}`.trim();
    const paidAt = payment.paidAt.toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const printedAt = new Date().toLocaleString('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const html = await compileTemplate('payment-receipt', {
      reservationNo: reservation?.reservationNo ?? '—',
      receiptId: payment.id ?? '—',
      guestName,
      roomNumber: reservation?.room?.number ?? '—',
      stayRange: `${reservation?.checkIn ? fmtDate(reservation.checkIn) : '—'} → ${
        reservation?.checkOut ? fmtDate(reservation.checkOut) : '—'
      }`,
      paidAt,
      paymentMethod: payment.method ?? '—',
      paymentReference: payment.reference ?? '',
      paymentNote: payment.note ?? '',
      amount: fmtMoney(Number(payment.amount)),
      printedAt,
    });

    return html;
  }
}

function fmtMoney(n: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtDate(value: Date) {
  return new Date(value).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
