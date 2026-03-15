import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { GuestFilterDto } from '../dtos/guest-filter.dto';
import { CreateGuestDto } from '../dtos/create-guest.dto';
import { UpdateGuestDto } from '../dtos/update-guest.dto';
import { normalizePhone } from 'src/common/utils/phone.utils';
import { buildCursor, buildCursorWhere, parseCursor } from 'src/common/utils/cursor.utils';

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class GuestsService {
  constructor(private prisma: PrismaService) {}

  async findAll(hotelId: string, filters: GuestFilterDto) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: any = { hotelId };

    if (filters.nationality)
      where.nationality = { contains: filters.nationality, mode: 'insensitive' };
    if (filters.stayType) {
      where.stayType = filters.stayType;
    }
    if (filters.isVip !== undefined) where.isVip = filters.isVip;
    if (filters.search) {
      where.OR = [
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
        { phone: { contains: filters.search, mode: 'insensitive' } },
        { phoneNormalized: { contains: filters.search, mode: 'insensitive' } },
        { idNumber: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    // Status filter — join through reservations
    if (filters.status === 'in_house') {
      where.reservations = { some: { status: 'CHECKED_IN' } };
    } else if (filters.status === 'reserved') {
      where.reservations = { some: { status: { in: ['PENDING', 'CONFIRMED'] } } };
    } else if (filters.status === 'checked_out') {
      where.reservations = {
        some: { status: 'CHECKED_OUT' },
        none: { status: { in: ['CHECKED_IN', 'CONFIRMED', 'PENDING'] } },
      };
    }

    const [guests, total] = await Promise.all([
      this.prisma.guest.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        include: {
          reservations: {
            orderBy: { checkIn: 'desc' },
            take: 1,
            include: { room: { select: { number: true, type: true } } },
          },
          _count: { select: { reservations: true } },
        },
      }),
      this.prisma.guest.count({ where }),
    ]);

    // Stats — always for the whole hotel, not filtered
    const [totalGuests, inHouse, reserved, vips] = await Promise.all([
      this.prisma.guest.count({ where: { hotelId } }),
      this.prisma.guest.count({
        where: { hotelId, reservations: { some: { status: 'CHECKED_IN' } } },
      }),
      this.prisma.guest.count({
        where: { hotelId, reservations: { some: { status: { in: ['PENDING', 'CONFIRMED'] } } } },
      }),
      this.prisma.guest.count({ where: { hotelId, isVip: true } }),
    ]);

    return {
      guests,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      // meta shape matching your Pagination component
      meta: {
        total,
        current_page: page,
        per_page: limit,
        last_page: Math.ceil(total / limit),
        from: skip + 1,
        to: Math.min(skip + limit, total),
      },
      stats: { totalGuests, inHouse, reserved, vips },
    };
  }

  async findOne(hotelId: string, id: string) {
    const guest = await this.prisma.guest.findFirst({
      where: { id, hotelId },
      include: {
        reservations: {
          orderBy: { checkIn: 'desc' },
          include: {
            room: {
              select: { id: true, number: true, type: true, floor: { select: { name: true } } },
            },
            folioItems: { orderBy: { createdAt: 'asc' } },
            company: { select: { id: true, name: true } },
            groupBooking: { select: { id: true, groupNo: true, name: true } },
          },
        },
        _count: { select: { reservations: true } },
      },
    });
    if (!guest) throw new NotFoundException('Guest not found.');

    // Compute lifetime value from all paid folio items
    const lifetimeValue = await this.prisma.folioItem.aggregate({
      where: { hotelId, reservation: { guestId: id }, amount: { gt: 0 } },
      _sum: { amount: true },
    });

    return {
      ...guest,
      lifetimeValue: lifetimeValue._sum.amount ?? 0,
    };
  }

  async getFolioItems(
    hotelId: string,
    guestId: string,
    options: { limit?: number; cursor?: string } = {},
  ) {
    const guest = await this.prisma.guest.findFirst({
      where: { id: guestId, hotelId },
      select: { id: true },
    });
    if (!guest) throw new NotFoundException('Guest not found.');

    const limit = Math.min(Math.max(options.limit ?? 20, 1), 100);
    const cursor = parseCursor(options.cursor);

    const items = await this.prisma.folioItem.findMany({
      where: {
        hotelId,
        reservation: { guestId },
        ...(cursor ? buildCursorWhere(cursor) : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit,
      include: {
        reservation: {
          select: {
            id: true,
            reservationNo: true,
            checkIn: true,
            checkOut: true,
            room: { select: { id: true, number: true, type: true } },
          },
        },
      },
    });

    const nextCursor = items.length === limit ? buildCursor(items[items.length - 1]) : null;

    return { items, nextCursor };
  }

  async create(hotelId: string, dto: CreateGuestDto) {
    // Soft duplicate check on phone within hotel
    let normalizedPhone = null;
    if (dto.phone) {
      normalizedPhone = normalizePhone(dto.phone, 'NG');

      if (normalizedPhone) {
        const byPhone = await this.prisma.guest.findFirst({
          where: { hotelId, phoneNormalized: normalizedPhone },
        });
        if (byPhone) {
          throw new ConflictException({
            message: `Guest already exists`,
            guestId: byPhone.id,
            name: `${byPhone.firstName} ${byPhone.lastName}`,
          });
        }
      }
    }

    return this.prisma.guest.create({
      data: {
        hotelId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        phoneNormalized: normalizedPhone,
        email: dto.email,
        nationality: dto.nationality,
        idType: dto.idType,
        idNumber: dto.idNumber,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        address: dto.address,
        notes: dto.notes,
        stayType: dto.stayType ?? 'full_time',
        isVip: dto.isVip ?? false,
      },
    });
  }

  async update(hotelId: string, id: string, dto: UpdateGuestDto) {
    await this.findOne(hotelId, id);
    const phoneNormalized = dto.phone ? normalizePhone(dto.phone, 'NG') : undefined;
    return this.prisma.guest.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.phone ? { phoneNormalized } : {}),
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
      },
    });
  }

  async toggleVip(hotelId: string, id: string) {
    const guest = await this.findOne(hotelId, id);
    return this.prisma.guest.update({
      where: { id },
      data: { isVip: !guest.isVip },
    });
  }

  async remove(hotelId: string, id: string) {
    const guest = await this.findOne(hotelId, id);
    const active = await this.prisma.reservation.count({
      where: { guestId: id, status: { in: ['CONFIRMED', 'CHECKED_IN'] } },
    });
    if (active > 0) throw new ConflictException('Cannot delete a guest with active reservations.');
    await this.prisma.guest.delete({ where: { id } });
    return { message: `Guest ${guest.firstName} ${guest.lastName} deleted.` };
  }
}
