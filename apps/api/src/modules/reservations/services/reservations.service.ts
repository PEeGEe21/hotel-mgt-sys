import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ReservationStatus, PaymentStatus, RoomStatus, BookingType } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { genReservationNo, nightsBetween } from 'src/common/utils/reservation.utils';
import { buildCursor, buildCursorWhere, parseCursor } from 'src/common/utils/cursor.utils';
import { ReservationFilterDto } from '../dtos/reservation-filter.dto';
import { AvailabilityDto } from '../dtos/availability.dto';
import { CreateReservationDto } from '../dtos/create-reservation.dto';
import { UpdateReservationDto } from '../dtos/update-reservation.dto';

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
  constructor(private prisma: PrismaService) {}

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
  async create(hotelId: string, dto: CreateReservationDto) {
    const checkIn = new Date(dto.checkIn);
    const checkOut = new Date(dto.checkOut);

    if (checkOut <= checkIn) throw new BadRequestException('Check-out must be after check-in.');

    // Confirm room exists and belongs to hotel
    const room = await this.prisma.room.findFirst({
      where: { id: dto.roomId, hotelId },
    });
    if (!room) throw new NotFoundException('Room not found.');
    if (room.status === RoomStatus.MAINTENANCE || room.status === RoomStatus.OUT_OF_ORDER) {
      throw new BadRequestException(`Room ${room.number} is not available.`);
    }

    // Confirm guest exists
    const guest = await this.prisma.guest.findFirst({ where: { id: dto.guestId, hotelId } });
    if (!guest) throw new NotFoundException('Guest not found.');

    // Overlap check
    const overlap = await this.prisma.reservation.findFirst({
      where: {
        hotelId,
        roomId: dto.roomId,
        status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] },
        checkIn: { lt: checkOut },
        checkOut: { gt: checkIn },
      },
    });
    if (overlap)
      throw new ConflictException(
        `Room is already booked ${overlap.reservationNo} for those dates.`,
      );

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
        guestId: dto.guestId,
        roomId: dto.roomId,
        companyId: dto.companyId,
        groupBookingId: dto.groupBookingId,
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
      data: { reservationId: reservation.id, guestId: dto.guestId, role: 'PRIMARY' },
    });

    // Mark room as RESERVED
    await this.prisma.room.update({
      where: { id: dto.roomId },
      data: { status: RoomStatus.RESERVED },
    });

    return reservation;
  }

  // ── Update ──────────────────────────────────────────────────────────────────
  async update(hotelId: string, id: string, dto: UpdateReservationDto) {
    await this.findOne(hotelId, id);
    return this.prisma.reservation.update({
      where: { id },
      data: {
        ...dto,
        checkIn: dto.checkIn ? new Date(dto.checkIn) : undefined,
        checkOut: dto.checkOut ? new Date(dto.checkOut) : undefined,
      },
      include: RESERVATION_INCLUDE as any,
    });
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
    await this.prisma.folioItem.create({
      data: {
        hotelId,
        reservationId: id,
        description: `Room charge — ${(res as any).room.number} (${(res as any).room.type})`,
        amount: (res as any).room.baseRate,
        quantity: 1,
        category: 'ROOM',
      },
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
    return this.prisma.folioItem.create({
      data: {
        hotelId,
        reservationId: id,
        description: dto.description,
        amount: dto.amount,
        quantity: dto.quantity ?? 1,
        category: dto.category,
      },
    });
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
}
