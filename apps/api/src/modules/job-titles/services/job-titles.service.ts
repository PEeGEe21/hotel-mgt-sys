import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateJobTitleDto } from '../dtos/create-job-title.dto';
import { UpdateJobTitleDto } from '../dtos/update-job-title.dto';

@Injectable()
export class JobTitlesService {
  constructor(private prisma: PrismaService) {}

  private async ensureDepartment(hotelId: string, departmentId?: string | null) {
    if (!departmentId) return null;
    const department = await this.prisma.department.findFirst({
      where: { id: departmentId, hotelId },
      select: { id: true, name: true },
    });
    if (!department) throw new NotFoundException('Department not found.');
    return department;
  }

  async list(hotelId: string) {
    const [jobTitles, counts] = await Promise.all([
      this.prisma.jobTitle.findMany({
        where: { hotelId },
        include: {
          department: { select: { id: true, name: true } },
        },
        orderBy: [{ name: 'asc' }],
      }),
      this.prisma.staff.groupBy({
        by: ['jobTitleId'],
        where: { hotelId, jobTitleId: { not: null } },
        _count: { _all: true },
      }),
    ]);

    const countMap = new Map(counts.map((row) => [row.jobTitleId, row._count._all]));

    return jobTitles.map((jobTitle) => ({
      id: jobTitle.id,
      name: jobTitle.name,
      description: jobTitle.description ?? '',
      color: jobTitle.color,
      departmentId: jobTitle.departmentId,
      departmentName: jobTitle.department?.name ?? '',
      staffCount: countMap.get(jobTitle.id) ?? 0,
    }));
  }

  async create(hotelId: string, dto: CreateJobTitleDto) {
    const name = dto.name.trim();
    if (!name) throw new BadRequestException('Job title name is required.');

    const existing = await this.prisma.jobTitle.findFirst({
      where: { hotelId, name: { equals: name, mode: 'insensitive' } },
      select: { id: true },
    });
    if (existing) throw new BadRequestException('A job title with this name already exists.');

    const department = await this.ensureDepartment(hotelId, dto.departmentId?.trim() || null);

    return this.prisma.jobTitle.create({
      data: {
        hotelId,
        name,
        description: dto.description?.trim() || null,
        departmentId: department?.id || null,
        color: dto.color || undefined,
      },
    });
  }

  async update(hotelId: string, id: string, dto: UpdateJobTitleDto) {
    const existing = await this.prisma.jobTitle.findFirst({
      where: { id, hotelId },
    });
    if (!existing) throw new NotFoundException('Job title not found.');

    const nextName = dto.name ? dto.name.trim() : existing.name;
    if (dto.name && !nextName) {
      throw new BadRequestException('Job title name is required.');
    }

    if (nextName !== existing.name) {
      const duplicate = await this.prisma.jobTitle.findFirst({
        where: { hotelId, name: { equals: nextName, mode: 'insensitive' } },
        select: { id: true },
      });
      if (duplicate && duplicate.id !== existing.id) {
        throw new BadRequestException('A job title with this name already exists.');
      }
    }

    const department =
      dto.departmentId !== undefined
        ? await this.ensureDepartment(hotelId, dto.departmentId?.trim() || null)
        : undefined;

    if (nextName === existing.name) {
      return this.prisma.jobTitle.update({
        where: { id: existing.id },
        data: {
          description: dto.description !== undefined ? dto.description.trim() || null : undefined,
          departmentId: department === undefined ? undefined : department?.id || null,
          color: dto.color || undefined,
        },
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.jobTitle.update({
        where: { id: existing.id },
        data: {
          name: nextName,
          description: dto.description !== undefined ? dto.description.trim() || null : undefined,
          departmentId: department === undefined ? undefined : department?.id || null,
          color: dto.color || undefined,
        },
      });

      await tx.staff.updateMany({
        where: { hotelId, jobTitleId: existing.id },
        data: { position: nextName },
      });

      return updated;
    });
  }

  async remove(hotelId: string, id: string) {
    const existing = await this.prisma.jobTitle.findFirst({
      where: { id, hotelId },
    });
    if (!existing) throw new NotFoundException('Job title not found.');

    const staffCount = await this.prisma.staff.count({
      where: { hotelId, jobTitleId: existing.id },
    });
    if (staffCount > 0) {
      throw new BadRequestException('This job title has staff assigned and cannot be deleted.');
    }

    await this.prisma.jobTitle.delete({ where: { id: existing.id } });
    return { success: true };
  }
}
