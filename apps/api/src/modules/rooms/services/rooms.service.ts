import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RoomStatus } from '@prisma/client';
import { RoomFilterDto } from '../dtos/room-filter.dto';
import { CreateRoomDto } from '../dtos/create-room.dto';
import { UpdateRoomDto } from '../dtos/update-room.dto';
import { RoomReservationsDto } from '../dtos/room-reservations.dto';

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class RoomsService {
  constructor(private prisma: PrismaService) {}

  private async assertFloorBelongsToHotel(hotelId: string, floorId?: string | null) {
    if (!floorId) return;
    const floor = await this.prisma.floor.findFirst({
      where: { id: floorId, hotelId },
      select: { id: true },
    });
    if (!floor) throw new BadRequestException('Floor not found for this hotel.');
  }

  async findAll(hotelId: string, filters: RoomFilterDto) {
    const where: any = { hotelId };

    if (filters.status) where.status = filters.status;
    if (filters.type) where.type = filters.type;
    if (filters.floorId) where.floorId = filters.floorId;
    if (filters.search) {
      where.OR = [
        { number: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 50; // default 50 — enough for most hotels per floor
    const skip = (page - 1) * limit;

    const [rooms, total] = await Promise.all([
      this.prisma.room.findMany({
        where,
        orderBy: [{ floor: { level: 'asc' } }, { number: 'asc' }],
        skip,
        take: limit,
        include: {
          floor: true,
          _count: { select: { reservations: true } },
          housekeepingTasks: {
            where: { status: { in: ['PENDING', 'IN_PROGRESS'] } },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      }),
      this.prisma.room.count({ where }),
    ]);

    const stats = await this.prisma.room.groupBy({
      by: ['status'],
      where: { hotelId },
      _count: { status: true },
    });

    return {
      rooms,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      stats: stats.reduce((acc: any, s) => ({ ...acc, [s.status]: s._count.status }), {}),
    };
  }

  async findOne(hotelId: string, id: string) {
    const room = await this.prisma.room.findFirst({
      where: { id, hotelId },
      include: {
        floor: true,
        reservations: {
          where: { status: { in: ['CONFIRMED', 'CHECKED_IN'] } },
          include: {
            guest: true, // primary guest
            company: true, // company if corporate booking
            groupBooking: true, // group if group booking
            guests: {
              // all guests on reservation
              include: { guest: true },
              orderBy: { addedAt: 'asc' },
            },
            folioItems: { orderBy: { createdAt: 'asc' } },
          },
          orderBy: { checkIn: 'asc' },
          take: 1,
        },
        housekeepingTasks: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { staff: { select: { firstName: true, lastName: true } } },
        },
      },
    });
    if (!room) throw new NotFoundException(`Room not found.`);
    return room;
  }

  async listReservations(hotelId: string, roomId: string, filters: RoomReservationsDto) {
    const room = await this.prisma.room.findFirst({
      where: { id: roomId, hotelId },
      select: { id: true, number: true },
    });
    if (!room) throw new NotFoundException(`Room not found.`);

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 10;
    const skip = (page - 1) * limit;
    const where: any = { hotelId, roomId };
    if (filters.status) where.status = filters.status;

    const [reservations, total] = await Promise.all([
      this.prisma.reservation.findMany({
        where,
        orderBy: { checkIn: 'desc' },
        skip,
        take: limit,
        include: {
          guest: true,
          company: true,
          groupBooking: true,
        },
      }),
      this.prisma.reservation.count({ where }),
    ]);

    return {
      roomId: room.id,
      roomNumber: room.number,
      reservations,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async create(hotelId: string, dto: CreateRoomDto) {
    const floorId = dto.floorId?.trim() || null;
    await this.assertFloorBelongsToHotel(hotelId, floorId);

    const existing = await this.prisma.room.findUnique({
      where: { hotelId_number: { hotelId, number: dto.number } },
    });
    if (existing) throw new ConflictException(`Room ${dto.number} already exists.`);

    return this.prisma.room.create({
      data: {
        hotelId,
        number: dto.number,
        floorId,
        type: dto.type,
        baseRate: dto.baseRate,
        maxGuests: dto.maxGuests ?? 2,
        description: dto.description,
        amenities: dto.amenities ?? [],
        images: dto.images ?? [],
        status: RoomStatus.AVAILABLE,
      },
    });
  }

  async update(hotelId: string, id: string, dto: UpdateRoomDto) {
    const room = await this.findOne(hotelId, id);
    const data = { ...dto, floorId: dto.floorId === undefined ? undefined : dto.floorId.trim() || null };
    await this.assertFloorBelongsToHotel(hotelId, data.floorId);

    if (data.number && data.number !== room.number) {
      const existing = await this.prisma.room.findUnique({
        where: { hotelId_number: { hotelId, number: data.number } },
        select: { id: true },
      });
      if (existing && existing.id !== room.id) {
        throw new ConflictException(`Room ${data.number} already exists.`);
      }
    }

    return this.prisma.room.update({ where: { id: room.id }, data });
  }

  async updateStatus(hotelId: string, id: string, status: RoomStatus) {
    await this.findOne(hotelId, id);
    return this.prisma.room.update({ where: { id }, data: { status } });
  }

  async remove(hotelId: string, id: string) {
    const room = await this.findOne(hotelId, id);
    const active = await this.prisma.reservation.count({
      where: { hotelId, roomId: id, status: { in: ['CONFIRMED', 'CHECKED_IN'] } },
    });
    if (active > 0) throw new BadRequestException('Cannot delete a room with active reservations.');
    await this.prisma.room.delete({ where: { id } });
    return { message: `Room ${room.number} deleted.` };
  }
}
