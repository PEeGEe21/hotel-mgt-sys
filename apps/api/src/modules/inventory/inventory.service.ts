import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

// ─── Movement types ───────────────────────────────────────────────────────────
export type MovementType = 'IN' | 'OUT' | 'WASTAGE' | 'ADJUSTMENT';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  private isLowStock(quantity: number, minStock: number) {
    return quantity <= minStock;
  }

  private buildLowInventoryNotificationEmail(args: {
    hotelName: string;
    itemName: string;
    sku: string;
    quantity: number;
    minStock: number;
    unit: string;
    category: string;
    supplier?: string | null;
    location?: string | null;
  }) {
    const hotelName = escapeHtml(args.hotelName);
    const itemName = escapeHtml(args.itemName);
    const sku = escapeHtml(args.sku);
    const unit = escapeHtml(args.unit);
    const category = escapeHtml(args.category);
    const supplier = args.supplier ? escapeHtml(args.supplier) : null;
    const location = args.location ? escapeHtml(args.location) : null;

    return {
      subject: `Low inventory alert: ${args.itemName}`,
      text:
        `${args.hotelName}: inventory is low for ${args.itemName}.\n` +
        `SKU: ${args.sku}\n` +
        `Category: ${args.category}\n` +
        `Quantity: ${args.quantity} ${args.unit}\n` +
        `Minimum stock: ${args.minStock} ${args.unit}` +
        (args.supplier ? `\nSupplier: ${args.supplier}` : '') +
        (args.location ? `\nLocation: ${args.location}` : ''),
      html: `
        <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.6;">
          <p style="margin: 0 0 12px;">Inventory is low for <strong>${hotelName}</strong>.</p>
          <table style="border-collapse: collapse;">
            <tr><td style="padding: 4px 12px 4px 0;"><strong>Item</strong></td><td style="padding: 4px 0;">${itemName}</td></tr>
            <tr><td style="padding: 4px 12px 4px 0;"><strong>SKU</strong></td><td style="padding: 4px 0;">${sku}</td></tr>
            <tr><td style="padding: 4px 12px 4px 0;"><strong>Category</strong></td><td style="padding: 4px 0;">${category}</td></tr>
            <tr><td style="padding: 4px 12px 4px 0;"><strong>Quantity</strong></td><td style="padding: 4px 0;">${args.quantity} ${unit}</td></tr>
            <tr><td style="padding: 4px 12px 4px 0;"><strong>Minimum stock</strong></td><td style="padding: 4px 0;">${args.minStock} ${unit}</td></tr>
            ${supplier ? `<tr><td style="padding: 4px 12px 4px 0;"><strong>Supplier</strong></td><td style="padding: 4px 0;">${supplier}</td></tr>` : ''}
            ${location ? `<tr><td style="padding: 4px 12px 4px 0;"><strong>Location</strong></td><td style="padding: 4px 0;">${location}</td></tr>` : ''}
          </table>
        </div>
      `,
    };
  }

  private buildLowInventoryInAppNotification(args: {
    itemName: string;
    sku: string;
    quantity: number;
    minStock: number;
    unit: string;
  }) {
    return {
      title: 'Low inventory alert',
      message:
        `${args.itemName} (${args.sku}) is low on stock at ` +
        `${args.quantity} ${args.unit}. Minimum is ${args.minStock} ${args.unit}.`,
      metadata: {
        itemName: args.itemName,
        sku: args.sku,
        quantity: args.quantity,
        minStock: args.minStock,
        unit: args.unit,
      },
    };
  }

  private async maybeDispatchLowInventoryNotification(args: {
    hotelId: string;
    actorUserId?: string;
    beforeQuantity: number;
    beforeMinStock: number;
    item: {
      name: string;
      sku: string;
      quantity: number | string;
      minStock: number | string;
      unit: string;
      category: string;
      supplier?: string | null;
      location?: string | null;
    };
  }) {
    const wasLow = this.isLowStock(args.beforeQuantity, args.beforeMinStock);
    const quantity = Number(args.item.quantity);
    const minStock = Number(args.item.minStock);
    const isLow = this.isLowStock(quantity, minStock);

    if (wasLow || !isLow) return;

    const hotel = await this.prisma.hotel.findUnique({
      where: { id: args.hotelId },
      select: { name: true },
    });

    try {
      await this.notifications.dispatch({
        hotelId: args.hotelId,
        event: 'lowInventory',
        excludeEmailUserIds: args.actorUserId ? [args.actorUserId] : undefined,
        email: this.buildLowInventoryNotificationEmail({
          hotelName: hotel?.name ?? 'HotelOS',
          itemName: args.item.name,
          sku: args.item.sku,
          quantity,
          minStock,
          unit: args.item.unit,
          category: args.item.category,
          supplier: args.item.supplier,
          location: args.item.location,
        }),
        inApp: this.buildLowInventoryInAppNotification({
          itemName: args.item.name,
          sku: args.item.sku,
          quantity,
          minStock,
          unit: args.item.unit,
        }),
      });
    } catch (error) {
      this.logger.warn(
        `Failed to dispatch lowInventory notification for ${args.item.sku}: ${String(error)}`,
      );
    }
  }

  // ── List items ─────────────────────────────────────────────────────────────
  async list(hotelId: string, query: {
    page?: string | number; limit?: string | number; search?: string; category?: string;
  }) {
    const page     = Math.max(1, Number(query.page)  || 1);
    const limit    = Math.max(1, Math.min(100, Number(query.limit) || 10));
    const search   = query.search?.trim();
    const category = query.category?.trim();

    const where: any = { hotelId };
    if (category && category !== 'All') where.category = category;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku:  { contains: search, mode: 'insensitive' } },
      ];
    }

    // Today window for sales stats
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd   = new Date(); todayEnd.setHours(23, 59, 59, 999);

    const [total, items, allItems, todayMovements] = await Promise.all([
      this.prisma.inventoryItem.count({ where }),
      this.prisma.inventoryItem.findMany({
        where,
        orderBy: { name: 'asc' },
        skip:    (page - 1) * limit,
        take:    limit,
      }),
      this.prisma.inventoryItem.findMany({
        where:  { hotelId },
        select: { id: true, name: true, quantity: true, minStock: true, costPerUnit: true, supplier: true },
      }),
      this.prisma.stockMovement.findMany({
        where:   { hotelId, type: 'OUT', sourceType: 'POS_SALE', createdAt: { gte: todayStart, lte: todayEnd } },
        include: { item: { select: { sellPrice: true } } },
      }),
    ]);

    const lowStockItems     = allItems.filter(i => Number(i.quantity) <= Number(i.minStock));
    const totalValue        = allItems.reduce((s, i) => s + Number(i.quantity) * Number(i.costPerUnit), 0);
    const todaySales        = todayMovements.reduce((s, m) =>
      s + Number(m.quantity) * Number(m.item?.sellPrice ?? 0), 0);

    return {
      items: items.map(this.shape),
      meta: {
        total,
        current_page: page,
        per_page:     limit,
        last_page:    Math.max(1, Math.ceil(total / limit)),
        from:         total === 0 ? 0 : (page - 1) * limit + 1,
        to:           Math.min(total, page * limit),
      },
      stats: {
        totalItems:        allItems.length,
        lowStockCount:     lowStockItems.length,
        totalValue,
        todaySales,
        todayTransactions: todayMovements.length,
        lowStockItems:     lowStockItems.slice(0, 6).map(i => ({
          id: i.id, name: i.name,
          quantity: Number(i.quantity), minStock: Number(i.minStock), supplier: i.supplier,
        })),
      },
    };
  }

  // ── Get single item ────────────────────────────────────────────────────────
  async findOne(hotelId: string, id: string) {
    const item = await this.prisma.inventoryItem.findFirst({
      where:   { id, hotelId },
      include: {
        movements: {
          orderBy: { createdAt: 'desc' },
          take:    20,
        },
      },
    });
    if (!item) throw new NotFoundException('Inventory item not found.');
    return { ...this.shape(item), movements: item.movements };
  }

  // ── Create ─────────────────────────────────────────────────────────────────
  async create(hotelId: string, dto: any, actorUserId?: string) {
    const { name, sku, category, unit } = dto;
    if (!name?.trim() || !sku?.trim() || !category?.trim() || !unit?.trim()) {
      throw new BadRequestException('Name, unique ID, category and unit are required.');
    }

    const [skuExists, catExists] = await Promise.all([
      this.prisma.inventoryItem.findFirst({ where: { hotelId, sku: sku.trim() }, select: { id: true } }),
      this.prisma.inventoryCategory.findFirst({ where: { hotelId, name: category.trim() }, select: { id: true } }),
    ]);
    if (skuExists)  throw new BadRequestException('Item unique ID already exists.');
    if (!catExists) throw new BadRequestException('Category not found.');

    const item = await this.prisma.inventoryItem.create({
      data: {
        hotelId,
        name:        name.trim(),
        sku:         sku.trim(),
        category:    category.trim(),
        description: dto.description?.trim() || null,
        unit:        unit.trim(),
        quantity:    dto.quantity  ?? 0,
        minStock:    dto.minStock  ?? 0,
        costPerUnit: dto.costPrice ?? 0,
        sellPrice:   dto.sellPrice ?? null,
        supplier:    dto.supplier?.trim() || null,
        location:    dto.location?.trim() || null,
      },
    });

    // Record opening stock movement if quantity > 0
    if (Number(dto.quantity) > 0) {
      await this.prisma.stockMovement.create({
        data: {
          hotelId,
          itemId:     item.id,
          type:       'IN',
          quantity:   dto.quantity,
          sourceType: 'MANUAL',
          note:       'Opening stock',
        },
      });
    }

    await this.maybeDispatchLowInventoryNotification({
      hotelId,
      actorUserId,
      beforeQuantity: Number.POSITIVE_INFINITY,
      beforeMinStock: Number.NEGATIVE_INFINITY,
      item: {
        name: item.name,
        sku: item.sku,
        quantity: Number(item.quantity),
        minStock: Number(item.minStock),
        unit: item.unit,
        category: item.category,
        supplier: item.supplier,
        location: item.location,
      },
    });

    return this.shape(item);
  }

  // ── Update ─────────────────────────────────────────────────────────────────
  async update(hotelId: string, id: string, dto: any, actorUserId?: string) {
    const item = await this.prisma.inventoryItem.findFirst({ where: { id, hotelId } });
    if (!item) throw new NotFoundException('Inventory item not found.');

    if (dto.sku && dto.sku.trim() !== item.sku) {
      const exists = await this.prisma.inventoryItem.findFirst({
        where: { hotelId, sku: dto.sku.trim() }, select: { id: true },
      });
      if (exists) throw new BadRequestException('Item unique ID already exists.');
    }

    if (dto.category) {
      const catExists = await this.prisma.inventoryCategory.findFirst({
        where: { hotelId, name: dto.category.trim() }, select: { id: true },
      });
      if (!catExists) throw new BadRequestException('Category not found.');
    }

    const updated = await this.prisma.inventoryItem.update({
      where: { id },
      data: {
        name:        dto.name?.trim()     ?? item.name,
        sku:         dto.sku?.trim()      ?? item.sku,
        category:    dto.category?.trim() ?? item.category,
        description: dto.description === undefined ? item.description : (dto.description?.trim() || null),
        unit:        dto.unit?.trim()     ?? item.unit,
        quantity:    dto.quantity         ?? item.quantity,
        minStock:    dto.minStock         ?? item.minStock,
        costPerUnit: dto.costPrice        ?? item.costPerUnit,
        sellPrice:   dto.sellPrice        ?? item.sellPrice,
        supplier:    dto.supplier === undefined ? item.supplier : (dto.supplier?.trim() || null),
        location:    dto.location?.trim() ?? item.location,
      },
    });

    await this.maybeDispatchLowInventoryNotification({
      hotelId,
      actorUserId,
      beforeQuantity: Number(item.quantity),
      beforeMinStock: Number(item.minStock),
      item: {
        name: updated.name,
        sku: updated.sku,
        quantity: Number(updated.quantity),
        minStock: Number(updated.minStock),
        unit: updated.unit,
        category: updated.category,
        supplier: updated.supplier,
        location: updated.location,
      },
    });

    return this.shape(updated);
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  async remove(hotelId: string, id: string) {
    const item = await this.prisma.inventoryItem.findFirst({
      where:   { id, hotelId },
      include: { _count: { select: { movements: true } } },
    });
    if (!item) throw new NotFoundException('Inventory item not found.');

    // Soft-block if linked to POS products
    const linkedProduct = await this.prisma.productIngredient.findFirst({
      where: { inventoryItemId: id, hotelId },
    });
    if (linkedProduct) {
      throw new BadRequestException(
        'This item is linked to POS products. Remove the ingredient mapping first.'
      );
    }

    await this.prisma.inventoryItem.delete({ where: { id } });
    return { success: true };
  }

  // ── Record stock movement ──────────────────────────────────────────────────
  async recordMovement(hotelId: string, itemId: string, dto: {
    type:       MovementType;
    quantity:   number;
    note?:      string;
    staffId?:   string;
    actorUserId?: string;
    sourceType?: string;
    sourceId?:  string;
  }) {
    const item = await this.prisma.inventoryItem.findFirst({
      where: { id: itemId, hotelId },
    });
    if (!item) throw new NotFoundException('Inventory item not found.');

    if (dto.quantity <= 0) {
      throw new BadRequestException('Quantity must be greater than 0.');
    }

    if (dto.staffId) {
      const staff = await this.prisma.staff.findFirst({
        where: { id: dto.staffId, hotelId },
        select: { id: true },
      });
      if (!staff) throw new BadRequestException('Staff not found.');
    }

    // For OUT/WASTAGE — check we have enough stock
    if (['OUT', 'WASTAGE'].includes(dto.type)) {
      if (Number(item.quantity) < dto.quantity) {
        throw new BadRequestException(
          `Insufficient stock. Available: ${item.quantity} ${item.unit}s.`
        );
      }
    }

    const result = await this.prisma.$transaction(async tx => {
      // Update quantity
      const delta    = ['IN', 'ADJUSTMENT'].includes(dto.type) ? dto.quantity : -dto.quantity;
      const updated  = await tx.inventoryItem.update({
        where: { id: itemId },
        data:  { quantity: { increment: delta } },
      });

      // Record movement
      const movement = await tx.stockMovement.create({
        data: {
          hotelId,
          itemId,
          type:       dto.type,
          quantity:   dto.quantity,
          note:       dto.note,
          sourceType: dto.sourceType ?? 'MANUAL',
          sourceId:   dto.sourceId,
          staffId:    dto.staffId,
        },
      });

      return {
        item:      this.shape(updated),
        movement,
        newQuantity: Number(updated.quantity),
      };
    });

    await this.maybeDispatchLowInventoryNotification({
      hotelId,
      actorUserId: dto.actorUserId,
      beforeQuantity: Number(item.quantity),
      beforeMinStock: Number(item.minStock),
      item: {
        name: result.item.name,
        sku: result.item.sku,
        quantity: result.item.quantity,
        minStock: result.item.minStock,
        unit: result.item.unit,
        category: result.item.category,
        supplier: result.item.supplier,
        location: result.item.location,
      },
    });

    return result;
  }

  // ── Movement history ───────────────────────────────────────────────────────
  async getMovements(hotelId: string, query: {
    itemId?:    string;
    type?:      string;
    dateFrom?:  string;
    dateTo?:    string;
    page?:      string | number;
    limit?:     string | number;
  }) {
    const page  = Math.max(1, Number(query.page)  || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));

    const where: any = { hotelId };
    if (query.itemId) {
      const item = await this.prisma.inventoryItem.findFirst({
        where: { id: query.itemId, hotelId },
        select: { id: true },
      });
      if (!item) throw new NotFoundException('Inventory item not found.');
      where.itemId = query.itemId;
    }
    if (query.type)   where.type   = query.type;
    if (query.dateFrom || query.dateTo) {
      where.createdAt = {
        ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
        ...(query.dateTo   ? { lte: new Date(query.dateTo)   } : {}),
      };
    }

    const [total, movements] = await Promise.all([
      this.prisma.stockMovement.count({ where }),
      this.prisma.stockMovement.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip:    (page - 1) * limit,
        take:    limit,
        include: {
          item: { select: { id: true, name: true, unit: true, category: true } },
        },
      }),
    ]);

    return {
      movements,
      meta: {
        total,
        current_page: page,
        per_page:     limit,
        last_page:    Math.max(1, Math.ceil(total / limit)),
        from:         total === 0 ? 0 : (page - 1) * limit + 1,
        to:           Math.min(total, page * limit),
      },
    };
  }

  // ── Valuation report ───────────────────────────────────────────────────────
  async getValuation(hotelId: string) {
    const items = await this.prisma.inventoryItem.findMany({
      where:   { hotelId },
      orderBy: { category: 'asc' },
    });

    const byCategory: Record<string, {
      items: number; totalCost: number; totalValue: number; margin: number;
    }> = {};

    let grandCost  = 0;
    let grandValue = 0;

    items.forEach(item => {
      const cat   = item.category;
      const cost  = Number(item.quantity) * Number(item.costPerUnit);
      const value = Number(item.quantity) * Number(item.sellPrice ?? item.costPerUnit);

      if (!byCategory[cat]) byCategory[cat] = { items: 0, totalCost: 0, totalValue: 0, margin: 0 };
      byCategory[cat].items++;
      byCategory[cat].totalCost  += cost;
      byCategory[cat].totalValue += value;
      grandCost  += cost;
      grandValue += value;
    });

    // Calculate margins
    Object.values(byCategory).forEach(cat => {
      cat.margin = cat.totalValue > 0
        ? Math.round(((cat.totalValue - cat.totalCost) / cat.totalValue) * 100)
        : 0;
    });

    return {
      summary: {
        totalItems:   items.length,
        totalCost:    grandCost,
        totalValue:   grandValue,
        grossMargin:  grandValue > 0
          ? Math.round(((grandValue - grandCost) / grandValue) * 100)
          : 0,
      },
      byCategory,
      items: items.map(this.shape),
    };
  }

  // ── Generate SKU ───────────────────────────────────────────────────────────
  async generateSku(hotelId: string): Promise<string> {
    let sku: string;
    let exists = true;
    while (exists) {
      const random = Math.random().toString(36).substring(2, 8).toUpperCase();
      sku    = `SKU-${random}`;
      exists = !!(await this.prisma.inventoryItem.findFirst({ where: { sku, hotelId } }));
    }
    return sku!;
  }

  // ── Shape helper ───────────────────────────────────────────────────────────
  private shape(item: any) {
    return {
      id:          item.id,
      uniqueId:    item.sku,
      name:        item.name,
      sku:         item.sku,
      category:    item.category,
      description: item.description,
      unit:        item.unit,
      quantity:    Number(item.quantity),
      minStock:    Number(item.minStock),
      costPrice:   Number(item.costPerUnit),
      sellPrice:   item.sellPrice === null ? null : Number(item.sellPrice),
      supplier:    item.supplier,
      location:    item.location,
      createdAt:   item.createdAt,
      updatedAt:   item.updatedAt,
    };
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
