import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateShiftTemplateDto } from './dtos/create-shift-template.dto';
import { UpdateShiftTemplateDto } from './dtos/update-shift-template.dto';

@Injectable()
export class ShiftsService {
  constructor(private prisma: PrismaService) {}

  async list(hotelId: string) {
    return this.prisma.shiftTemplate.findMany({
      where: { hotelId },
      orderBy: { name: 'asc' },
    });
  }

  async create(hotelId: string, dto: CreateShiftTemplateDto) {
    const name = dto.name.trim();
    if (!name) throw new BadRequestException('Shift name is required.');

    const existing = await this.prisma.shiftTemplate.findFirst({
      where: { hotelId, name: { equals: name, mode: 'insensitive' } },
      select: { id: true },
    });
    if (existing) throw new BadRequestException('A shift with this name already exists.');

    return this.prisma.shiftTemplate.create({
      data: {
        hotelId,
        name,
        startTime: dto.startTime,
        endTime: dto.endTime,
        days: dto.days ?? [],
        color: dto.color || undefined,
      },
    });
  }

  async update(hotelId: string, id: string, dto: UpdateShiftTemplateDto) {
    const shift = await this.prisma.shiftTemplate.findFirst({ where: { id, hotelId } });
    if (!shift) throw new NotFoundException('Shift template not found.');

    const nextName = dto.name ? dto.name.trim() : shift.name;
    if (dto.name && !nextName) throw new BadRequestException('Shift name is required.');

    if (nextName !== shift.name) {
      const exists = await this.prisma.shiftTemplate.findFirst({
        where: { hotelId, name: { equals: nextName, mode: 'insensitive' } },
        select: { id: true },
      });
      if (exists && exists.id !== shift.id) {
        throw new BadRequestException('A shift with this name already exists.');
      }
    }

    return this.prisma.shiftTemplate.update({
      where: { id: shift.id },
      data: {
        name: nextName,
        startTime: dto.startTime ?? shift.startTime,
        endTime: dto.endTime ?? shift.endTime,
        days: dto.days ?? shift.days,
        color: dto.color || shift.color,
      },
    });
  }

  async remove(hotelId: string, id: string) {
    const shift = await this.prisma.shiftTemplate.findFirst({ where: { id, hotelId } });
    if (!shift) throw new NotFoundException('Shift template not found.');

    await this.prisma.shiftTemplate.delete({ where: { id: shift.id } });
    return { success: true };
  }
}
