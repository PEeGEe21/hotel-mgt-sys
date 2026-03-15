import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateFloorDto } from '../dtos/create-floor.dto';
import { UpdateFloorDto } from '../dtos/update-floor.dto';

// ─── Service ──────────────────────────────────────────────────────────────────
@Injectable()
export class FloorsService {
  constructor(private prisma: PrismaService) {}

  async findAll(hotelId: string) {
    const floors = await this.prisma.floor.findMany({
      where: { hotelId },
      orderBy: { level: 'asc' },
      include: { _count: { select: { rooms: true } } },
    });
    return floors;
  }

  async findOne(hotelId: string, id: string) {
    const floor = await this.prisma.floor.findFirst({
      where: { id, hotelId },
      include: {
        rooms: {
          orderBy: { number: 'asc' },
          select: { id: true, number: true, type: true, status: true, baseRate: true },
        },
        _count: { select: { rooms: true } },
      },
    });
    if (!floor) throw new NotFoundException('Floor not found.');
    return floor;
  }

  async create(hotelId: string, dto: CreateFloorDto) {
    // Check name uniqueness
    const byName = await this.prisma.floor.findUnique({
      where: { hotelId_name: { hotelId, name: dto.name } },
    });
    if (byName) throw new ConflictException(`A floor named "${dto.name}" already exists.`);

    // Check level uniqueness
    const byLevel = await this.prisma.floor.findUnique({
      where: { hotelId_level: { hotelId, level: dto.level } },
    });
    if (byLevel)
      throw new ConflictException(`Level ${dto.level} is already taken by "${byLevel.name}".`);

    return this.prisma.floor.create({
      data: { hotelId, name: dto.name, level: dto.level, description: dto.description },
    });
  }

  async update(hotelId: string, id: string, dto: UpdateFloorDto) {
    await this.findOne(hotelId, id);

    if (dto.name) {
      const byName = await this.prisma.floor.findUnique({
        where: { hotelId_name: { hotelId, name: dto.name } },
      });
      if (byName && byName.id !== id) {
        throw new ConflictException(`A floor named "${dto.name}" already exists.`);
      }
    }

    if (dto.level !== undefined) {
      const byLevel = await this.prisma.floor.findUnique({
        where: { hotelId_level: { hotelId, level: dto.level } },
      });
      if (byLevel && byLevel.id !== id) {
        throw new ConflictException(`Level ${dto.level} is already taken by "${byLevel.name}".`);
      }
    }

    return this.prisma.floor.update({ where: { id }, data: dto });
  }

  async remove(hotelId: string, id: string) {
    const floor = await this.findOne(hotelId, id);

    if (floor._count.rooms > 0) {
      throw new BadRequestException(
        `Cannot delete "${floor.name}" — it has ${floor._count.rooms} room(s). Move or delete the rooms first.`,
      );
    }

    await this.prisma.floor.delete({ where: { id } });
    return { message: `Floor "${floor.name}" deleted.` };
  }
}
