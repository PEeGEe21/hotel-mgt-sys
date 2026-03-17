import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateInventoryCategoryDto } from './dtos/create-inventory-category.dto';
import { UpdateInventoryCategoryDto } from './dtos/update-inventory-category.dto';

@Injectable()
export class InventoryCategoriesService {
  constructor(private prisma: PrismaService) {}

  async list(hotelId: string) {
    const categories = await this.prisma.inventoryCategory.findMany({
      where: { hotelId },
      orderBy: { name: 'asc' },
    });

    const counts = await this.prisma.inventoryItem.groupBy({
      by: ['category'],
      where: { hotelId },
      _count: { _all: true },
    });
    const countMap = new Map(counts.map((c) => [c.category, c._count._all]));

    return categories.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description ?? '',
      color: c.color,
      itemCount: countMap.get(c.name) ?? 0,
    }));
  }

  async create(hotelId: string, dto: CreateInventoryCategoryDto) {
    const name = dto.name.trim();
    if (!name) throw new BadRequestException('Category name is required.');

    const existing = await this.prisma.inventoryCategory.findFirst({
      where: { hotelId, name: { equals: name, mode: 'insensitive' } },
      select: { id: true },
    });
    if (existing) throw new BadRequestException('A category with this name already exists.');

    return this.prisma.inventoryCategory.create({
      data: {
        hotelId,
        name,
        description: dto.description?.trim() || null,
        color: dto.color || undefined,
      },
    });
  }

  async update(hotelId: string, id: string, dto: UpdateInventoryCategoryDto) {
    const category = await this.prisma.inventoryCategory.findFirst({ where: { id, hotelId } });
    if (!category) throw new NotFoundException('Category not found.');

    const nextName = dto.name ? dto.name.trim() : category.name;
    if (dto.name && !nextName) {
      throw new BadRequestException('Category name is required.');
    }

    if (nextName !== category.name) {
      const exists = await this.prisma.inventoryCategory.findFirst({
        where: { hotelId, name: { equals: nextName, mode: 'insensitive' } },
        select: { id: true },
      });
      if (exists && exists.id !== category.id) {
        throw new BadRequestException('A category with this name already exists.');
      }
    }

    const data = {
      name: nextName,
      description: dto.description?.trim() || null,
      color: dto.color || category.color,
    };

    if (nextName === category.name) {
      return this.prisma.inventoryCategory.update({ where: { id: category.id }, data });
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.inventoryCategory.update({ where: { id: category.id }, data });
      await tx.inventoryItem.updateMany({
        where: { hotelId, category: category.name },
        data: { category: nextName },
      });
      return updated;
    });
  }

  async remove(hotelId: string, id: string) {
    const category = await this.prisma.inventoryCategory.findFirst({ where: { id, hotelId } });
    if (!category) throw new NotFoundException('Category not found.');

    const itemCount = await this.prisma.inventoryItem.count({
      where: { hotelId, category: category.name },
    });
    if (itemCount > 0) {
      throw new BadRequestException('This category has items assigned and cannot be deleted.');
    }

    await this.prisma.inventoryCategory.delete({ where: { id: category.id } });
    return { success: true };
  }
}
