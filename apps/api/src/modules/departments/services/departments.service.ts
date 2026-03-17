import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateDepartmentDto } from '../dtos/create-department.dto';
import { UpdateDepartmentDto } from '../dtos/update-department.dto';

@Injectable()
export class DepartmentsService {
  constructor(private prisma: PrismaService) {}

  async list(hotelId: string) {
    const departments = await this.prisma.department.findMany({
      where: { hotelId },
      orderBy: { name: 'asc' },
    });

    const counts = await this.prisma.staff.groupBy({
      by: ['department'],
      where: { hotelId },
      _count: { _all: true },
    });
    const countMap = new Map(counts.map((c) => [c.department, c._count._all]));

    return departments.map((d) => ({
      id: d.id,
      name: d.name,
      description: d.description ?? '',
      color: d.color,
      headCount: countMap.get(d.name) ?? 0,
    }));
  }

  async create(hotelId: string, dto: CreateDepartmentDto) {
    const name = dto.name.trim();
    if (!name) throw new BadRequestException('Department name is required.');

    const existing = await this.prisma.department.findFirst({
      where: { hotelId, name: { equals: name, mode: 'insensitive' } },
      select: { id: true },
    });
    if (existing) throw new BadRequestException('A department with this name already exists.');

    return this.prisma.department.create({
      data: {
        hotelId,
        name,
        description: dto.description?.trim() || null,
        color: dto.color || undefined,
      },
    });
  }

  async update(hotelId: string, id: string, dto: UpdateDepartmentDto) {
    const dept = await this.prisma.department.findFirst({ where: { id, hotelId } });
    if (!dept) throw new NotFoundException('Department not found.');

    const nextName = dto.name ? dto.name.trim() : dept.name;
    if (dto.name && !nextName) {
      throw new BadRequestException('Department name is required.');
    }

    if (nextName !== dept.name) {
      const exists = await this.prisma.department.findFirst({
        where: { hotelId, name: { equals: nextName, mode: 'insensitive' } },
        select: { id: true },
      });
      if (exists && exists.id !== dept.id) {
        throw new BadRequestException('A department with this name already exists.');
      }
    }

    const data = {
      name: nextName,
      description: dto.description?.trim() || null,
      color: dto.color || dept.color,
    };

    if (nextName === dept.name) {
      return this.prisma.department.update({ where: { id: dept.id }, data });
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.department.update({ where: { id: dept.id }, data });
      await tx.staff.updateMany({
        where: { hotelId, department: dept.name },
        data: { department: nextName },
      });
      return updated;
    });
  }

  async remove(hotelId: string, id: string) {
    const dept = await this.prisma.department.findFirst({ where: { id, hotelId } });
    if (!dept) throw new NotFoundException('Department not found.');

    const staffCount = await this.prisma.staff.count({
      where: { hotelId, department: dept.name },
    });
    if (staffCount > 0) {
      throw new BadRequestException('This department has staff assigned and cannot be deleted.');
    }

    await this.prisma.department.delete({ where: { id: dept.id } });
    return { success: true };
  }
}
