import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateShiftTemplateDto } from './dtos/create-shift-template.dto';
import { UpdateShiftTemplateDto } from './dtos/update-shift-template.dto';
import { CreateShiftOverrideDto } from './dtos/create-shift-override.dto';
import { UpdateShiftOverrideDto } from './dtos/update-shift-override.dto';
import { ShiftOverrideFilterDto } from './dtos/shift-override-filter.dto';

@Injectable()
export class ShiftsService {
  constructor(private prisma: PrismaService) {}

  async list(hotelId: string) {
    return this.prisma.shiftTemplate.findMany({
      where: { hotelId },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            defaultStaff: true,
          },
        },
      },
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

    const assignedCount = await this.prisma.staff.count({
      where: { hotelId, shiftTemplateId: shift.id },
    });
    if (assignedCount > 0) {
      throw new BadRequestException(
        'This shift is still assigned to staff members. Reassign them before deleting the shift.',
      );
    }

    await this.prisma.shiftTemplate.delete({ where: { id: shift.id } });
    return { success: true };
  }

  async listOverrides(hotelId: string, filters: ShiftOverrideFilterDto) {
    const where: any = { hotelId };
    if (filters.staffId) where.staffId = filters.staffId;
    if (filters.dateFrom || filters.dateTo) {
      const from = filters.dateFrom ? new Date(filters.dateFrom) : null;
      const to = filters.dateTo ? new Date(filters.dateTo) : null;
      where.AND = [
        from ? { dateTo: { gte: from } } : {},
        to ? { dateFrom: { lte: to } } : {},
      ];
    }

    return (this.prisma as any).staffShiftOverride.findMany({
      where,
      orderBy: [{ dateFrom: 'asc' }, { createdAt: 'desc' }],
      include: {
        staff: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
            department: true,
            position: true,
          },
        },
        shiftTemplate: {
          select: {
            id: true,
            name: true,
            startTime: true,
            endTime: true,
            days: true,
            color: true,
          },
        },
      },
    });
  }

  async createOverride(hotelId: string, dto: CreateShiftOverrideDto) {
    const staff = await this.prisma.staff.findFirst({
      where: { id: dto.staffId, hotelId },
      select: { id: true },
    });
    if (!staff) throw new NotFoundException('Staff member not found.');

    const shift = await this.prisma.shiftTemplate.findFirst({
      where: { id: dto.shiftTemplateId, hotelId },
      select: { id: true },
    });
    if (!shift) throw new NotFoundException('Shift template not found.');

    const dateFrom = new Date(dto.dateFrom);
    const dateTo = new Date(dto.dateTo);
    if (dateTo < dateFrom) {
      throw new BadRequestException('Override end date cannot be earlier than the start date.');
    }

    return (this.prisma as any).staffShiftOverride.create({
      data: {
        hotel: {
          connect: { id: hotelId },
        },
        staff: {
          connect: { id: dto.staffId },
        },
        shiftTemplate: {
          connect: { id: dto.shiftTemplateId },
        },
        isActive: dto.isActive ?? true,
        dateFrom,
        dateTo,
        reason: dto.reason?.trim() || null,
      },
      include: {
        staff: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
            department: true,
            position: true,
          },
        },
        shiftTemplate: {
          select: {
            id: true,
            name: true,
            startTime: true,
            endTime: true,
            days: true,
            color: true,
          },
        },
      },
    });
  }

  async updateOverride(hotelId: string, id: string, dto: UpdateShiftOverrideDto) {
    const existing = await (this.prisma as any).staffShiftOverride.findFirst({
      where: { id, hotelId },
    });
    if (!existing) throw new NotFoundException('Shift override not found.');

    if (dto.staffId) {
      const staff = await this.prisma.staff.findFirst({
        where: { id: dto.staffId, hotelId },
        select: { id: true },
      });
      if (!staff) throw new NotFoundException('Staff member not found.');
    }

    if (dto.shiftTemplateId) {
      const shift = await this.prisma.shiftTemplate.findFirst({
        where: { id: dto.shiftTemplateId, hotelId },
        select: { id: true },
      });
      if (!shift) throw new NotFoundException('Shift template not found.');
    }

    const dateFrom = dto.dateFrom ? new Date(dto.dateFrom) : existing.dateFrom;
    const dateTo = dto.dateTo ? new Date(dto.dateTo) : existing.dateTo;
    if (dateTo < dateFrom) {
      throw new BadRequestException('Override end date cannot be earlier than the start date.');
    }

    return (this.prisma as any).staffShiftOverride.update({
      where: { id: existing.id },
      data: {
        isActive: dto.isActive ?? existing.isActive,
        dateFrom,
        dateTo,
        reason: dto.reason !== undefined ? dto.reason.trim() || null : existing.reason,
        ...(dto.staffId
          ? {
              staff: {
                connect: { id: dto.staffId },
              },
            }
          : {}),
        ...(dto.shiftTemplateId
          ? {
              shiftTemplate: {
                connect: { id: dto.shiftTemplateId },
              },
            }
          : {}),
      },
      include: {
        staff: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
            department: true,
            position: true,
          },
        },
        shiftTemplate: {
          select: {
            id: true,
            name: true,
            startTime: true,
            endTime: true,
            days: true,
            color: true,
          },
        },
      },
    });
  }

  async removeOverride(hotelId: string, id: string) {
    const existing = await (this.prisma as any).staffShiftOverride.findFirst({
      where: { id, hotelId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Shift override not found.');

    await (this.prisma as any).staffShiftOverride.delete({
      where: { id: existing.id },
    });
    return { success: true };
  }
}
