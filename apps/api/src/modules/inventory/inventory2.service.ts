import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateInventoryItemDto } from './dtos/create-inventory-item.dto';
import { UpdateInventoryItemDto } from './dtos/update-inventory-item.dto';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  async list(
    hotelId: string,
    query: { page?: string; limit?: string; search?: string; category?: string },
  ) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
    const search = query.search?.trim();
    const category = query.category?.trim();

    const where: any = { hotelId };
    if (category && category !== 'All') where.category = category;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }

    const total = await this.prisma.inventoryItem.count({ where });
    const items = await this.prisma.inventoryItem.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const allItems = await this.prisma.inventoryItem.findMany({
      where: { hotelId },
      select: {
        id: true,
        name: true,
        quantity: true,
        minStock: true,
        costPerUnit: true,
        supplier: true,
      },
    });

    const totalItems = allItems.length;
    const lowStockItems = allItems.filter((i) => Number(i.quantity) <= Number(i.minStock));
    const totalValue = allItems.reduce(
      (sum, item) => sum + Number(item.quantity) * Number(item.costPerUnit),
      0,
    );

    return {
      items: items.map((item) => ({
        id: item.id,
        uniqueId: item.sku,
        name: item.name,
        sku: item.sku,
        category: item.category,
        description: item.description,
        unit: item.unit,
        quantity: Number(item.quantity),
        minStock: Number(item.minStock),
        costPrice: Number(item.costPerUnit),
        sellPrice: item.sellPrice === null ? null : Number(item.sellPrice),
        supplier: item.supplier,
      })),
      meta: {
        total,
        current_page: page,
        per_page: limit,
        last_page: Math.max(1, Math.ceil(total / limit)),
        from: total === 0 ? 0 : (page - 1) * limit + 1,
        to: Math.min(total, page * limit),
      },
      stats: {
        totalItems,
        lowStockCount: lowStockItems.length,
        totalValue,
        todaySales: 0,
        todayTransactions: 0,
        lowStockItems: lowStockItems.slice(0, 6).map((item) => ({
          id: item.id,
          name: item.name,
          quantity: Number(item.quantity),
          minStock: Number(item.minStock),
          supplier: item.supplier,
        })),
      },
    };
  }

  async create(hotelId: string, dto: CreateInventoryItemDto) {
    const name = dto.name.trim();
    const sku = dto.sku.trim();
    const category = dto.category.trim();
    const unit = dto.unit.trim();

    if (!name || !sku || !category || !unit) {
      throw new BadRequestException('Name, unique ID, category and unit are required.');
    }

    const existing = await this.prisma.inventoryItem.findFirst({
      where: { hotelId, sku },
      select: { id: true },
    });
    if (existing) throw new BadRequestException('Item unique ID already exists.');

    const categoryExists = await this.prisma.inventoryCategory.findFirst({
      where: { hotelId, name: category },
      select: { id: true },
    });
    if (!categoryExists) throw new BadRequestException('Category not found.');

    const supplier = dto.supplier?.trim();
    const description = dto.description?.trim();

    const item = await this.prisma.inventoryItem.create({
      data: {
        hotelId,
        name,
        sku,
        category,
        description: description || null,
        unit,
        quantity: dto.quantity ?? 0,
        minStock: dto.minStock ?? 0,
        costPerUnit: dto.costPrice ?? 0,
        sellPrice: dto.sellPrice ?? null,
        supplier: supplier || null,
        location: dto.location?.trim() || null,
      },
    });

    return {
      id: item.id,
      uniqueId: item.sku,
      name: item.name,
      sku: item.sku,
      category: item.category,
      description: item.description,
      unit: item.unit,
      quantity: Number(item.quantity),
      minStock: Number(item.minStock),
      costPrice: Number(item.costPerUnit),
      sellPrice: item.sellPrice === null ? null : Number(item.sellPrice),
      supplier: item.supplier,
    };
  }

  async update(hotelId: string, id: string, dto: UpdateInventoryItemDto) {
    const item = await this.prisma.inventoryItem.findFirst({
      where: { id, hotelId },
    });
    if (!item) throw new NotFoundException('Inventory item not found.');

    if (dto.sku && dto.sku.trim() !== item.sku) {
      const existing = await this.prisma.inventoryItem.findFirst({
        where: { hotelId, sku: dto.sku.trim() },
        select: { id: true },
      });
      if (existing) throw new BadRequestException('Item unique ID already exists.');
    }

    if (dto.category) {
      const categoryExists = await this.prisma.inventoryCategory.findFirst({
        where: { hotelId, name: dto.category.trim() },
        select: { id: true },
      });
      if (!categoryExists) throw new BadRequestException('Category not found.');
    }

    const nextSupplier = dto.supplier === undefined ? item.supplier : dto.supplier.trim() || null;
    const nextDescription =
      dto.description === undefined ? item.description : dto.description.trim() || null;

    const updated = await this.prisma.inventoryItem.update({
      where: { id: item.id },
      data: {
        name: dto.name?.trim() ?? item.name,
        sku: dto.sku?.trim() ?? item.sku,
        category: dto.category?.trim() ?? item.category,
        description: nextDescription,
        unit: dto.unit?.trim() ?? item.unit,
        quantity: dto.quantity ?? item.quantity,
        minStock: dto.minStock ?? item.minStock,
        costPerUnit: dto.costPrice ?? item.costPerUnit,
        sellPrice: dto.sellPrice ?? item.sellPrice,
        supplier: nextSupplier,
        location: dto.location?.trim() ?? item.location,
      },
    });

    return {
      id: updated.id,
      uniqueId: updated.sku,
      name: updated.name,
      sku: updated.sku,
      category: updated.category,
      description: updated.description,
      unit: updated.unit,
      quantity: Number(updated.quantity),
      minStock: Number(updated.minStock),
      costPrice: Number(updated.costPerUnit),
      sellPrice: updated.sellPrice === null ? null : Number(updated.sellPrice),
      supplier: updated.supplier,
    };
  }

  async remove(hotelId: string, id: string) {
    const item = await this.prisma.inventoryItem.findFirst({
      where: { id, hotelId },
      select: { id: true },
    });
    if (!item) throw new NotFoundException('Inventory item not found.');

    await this.prisma.inventoryItem.delete({ where: { id: item.id } });
    return { success: true };
  }

  async generateSku(hotelId: string): Promise<string> {
    let sku: string;
    let exists = true;

    while (exists) {
      const random = Math.random().toString(36).substring(2, 8).toUpperCase();
      sku = `SKU-${random}`;

      const found = await this.prisma.inventoryItem.findFirst({
        where: { sku, hotelId },
      });

      exists = !!found;
    }

    return sku!;
  }
}
