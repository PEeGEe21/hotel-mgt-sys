import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRoomTypeDto } from './dtos/create-room-type.dto';
import { UpdateRoomTypeDto } from './dtos/update-room-type.dto';

@Injectable()
export class RoomTypesService {
  constructor(private prisma: PrismaService) {}

  async list(hotelId: string) {
    const types = await this.prisma.roomTypeConfig.findMany({
      where: { hotelId },
      orderBy: { name: 'asc' },
    });

    const roomCounts = await this.prisma.room.groupBy({
      by: ['type'],
      where: { hotelId },
      _count: { _all: true },
    });
    const countMap = new Map(
      roomCounts.map((c) => [String(c.type).toLowerCase(), c._count._all]),
    );

    return types.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description ?? '',
      baseRate: Number(t.baseRate ?? 0),
      capacity: t.capacity,
      beds: t.beds,
      amenities: t.amenities ?? [],
      color: t.color,
      count: countMap.get(t.name.toLowerCase()) ?? 0,
    }));
  }

  async create(hotelId: string, dto: CreateRoomTypeDto) {
    const name = dto.name.trim();
    if (!name) throw new BadRequestException('Room type name is required.');

    const existing = await this.prisma.roomTypeConfig.findFirst({
      where: { hotelId, name: { equals: name, mode: 'insensitive' } },
      select: { id: true },
    });
    if (existing) throw new BadRequestException('A room type with this name already exists.');

    return this.prisma.roomTypeConfig.create({
      data: {
        hotelId,
        name,
        description: dto.description?.trim() || null,
        baseRate: dto.baseRate ?? 0,
        capacity: dto.capacity ?? 1,
        beds: dto.beds ?? '1 Queen',
        amenities: dto.amenities ?? [],
        color: dto.color || undefined,
      },
    });
  }

  async update(hotelId: string, id: string, dto: UpdateRoomTypeDto) {
    const type = await this.prisma.roomTypeConfig.findFirst({ where: { id, hotelId } });
    if (!type) throw new NotFoundException('Room type not found.');

    const nextName = dto.name ? dto.name.trim() : type.name;
    if (dto.name && !nextName) throw new BadRequestException('Room type name is required.');

    if (nextName !== type.name) {
      const exists = await this.prisma.roomTypeConfig.findFirst({
        where: { hotelId, name: { equals: nextName, mode: 'insensitive' } },
        select: { id: true },
      });
      if (exists && exists.id !== type.id) {
        throw new BadRequestException('A room type with this name already exists.');
      }
    }

    return this.prisma.roomTypeConfig.update({
      where: { id: type.id },
      data: {
        name: nextName,
        description: dto.description?.trim() || null,
        baseRate: dto.baseRate ?? type.baseRate,
        capacity: dto.capacity ?? type.capacity,
        beds: dto.beds ?? type.beds,
        amenities: dto.amenities ?? type.amenities,
        color: dto.color || type.color,
      },
    });
  }

  async remove(hotelId: string, id: string) {
    const type = await this.prisma.roomTypeConfig.findFirst({ where: { id, hotelId } });
    if (!type) throw new NotFoundException('Room type not found.');

    await this.prisma.roomTypeConfig.delete({ where: { id: type.id } });
    return { success: true };
  }
}
