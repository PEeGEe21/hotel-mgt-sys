import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateTableDto } from '../dtos/tables/create-table.dto';
import { UpdateTableDto } from '../dtos/tables/update-table.dto';
import { ReorderTablesDto } from '../dtos/tables/reorder-table.dto';

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class PosTablesService {
  constructor(private prisma: PrismaService) {}

  // ── List — grouped by section ──────────────────────────────────────────────
  async findAll(hotelId: string, includeInactive = false) {
    const tables = await this.prisma.posTable.findMany({
      where: { hotelId, ...(includeInactive ? {} : { isActive: true }) },
      orderBy: [{ section: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        _count: {
          select: {
            orders: {
              where: {
                status: { in: ['PENDING', 'PREPARING', 'READY', 'DELIVERED'] },
                isPaid: false,
              },
            },
          },
        },
      },
    });

    // Group by section
    const sections: Record<string, typeof tables> = {};
    tables.forEach((t) => {
      const key = t.section ?? 'General';
      if (!sections[key]) sections[key] = [];
      sections[key].push(t);
    });

    return {
      tables,
      sections: Object.entries(sections).map(([name, items]) => ({ name, tables: items })),
      total: tables.length,
    };
  }

  // ── Single ─────────────────────────────────────────────────────────────────
  async findOne(hotelId: string, id: string) {
    const table = await this.prisma.posTable.findFirst({
      where: { id, hotelId },
      include: {
        orders: {
          where: { status: { in: ['PENDING', 'PREPARING', 'READY', 'DELIVERED'] }, isPaid: false },
          orderBy: { createdAt: 'desc' },
          include: { items: { include: { product: { select: { name: true, price: true } } } } },
        },
      },
    });
    if (!table) throw new NotFoundException('Table not found.');
    return table;
  }

  // ── Create ─────────────────────────────────────────────────────────────────
  async create(hotelId: string, dto: CreateTableDto) {
    const name = dto.name.trim();
    if (!name) throw new BadRequestException('Table name is required.');

    const existing = await this.prisma.posTable.findUnique({
      where: { hotelId_name: { hotelId, name } },
    });
    if (existing) throw new ConflictException(`A table named "${name}" already exists.`);

    // Auto-assign sortOrder if not provided
    const sortOrder = dto.sortOrder ?? (await this.nextSortOrder(hotelId, dto.section));

    return this.prisma.posTable.create({
      data: {
        hotelId,
        name,
        section: dto.section,
        capacity: dto.capacity,
        sortOrder,
        isActive: true,
      },
    });
  }

  // ── Update ─────────────────────────────────────────────────────────────────
  async update(hotelId: string, id: string, dto: UpdateTableDto) {
    const table = await this.prisma.posTable.findFirst({ where: { id, hotelId } });
    if (!table) throw new NotFoundException('Table not found.');

    if (dto.name && dto.name.trim() !== table.name) {
      const conflict = await this.prisma.posTable.findUnique({
        where: { hotelId_name: { hotelId, name: dto.name.trim() } },
      });
      if (conflict) throw new ConflictException(`A table named "${dto.name}" already exists.`);
    }

    return this.prisma.posTable.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        section: dto.section,
        capacity: dto.capacity,
        sortOrder: dto.sortOrder,
        isActive: dto.isActive,
      },
    });
  }

  // ── Toggle active ──────────────────────────────────────────────────────────
  async toggle(hotelId: string, id: string) {
    const table = await this.prisma.posTable.findFirst({ where: { id, hotelId } });
    if (!table) throw new NotFoundException('Table not found.');

    return this.prisma.posTable.update({
      where: { id },
      data: { isActive: !table.isActive },
    });
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  async remove(hotelId: string, id: string) {
    const table = await this.prisma.posTable.findFirst({
      where: { id, hotelId },
      include: { _count: { select: { orders: true } } },
    });
    if (!table) throw new NotFoundException('Table not found.');

    if (table._count.orders > 0) {
      // Has order history — deactivate instead of delete
      await this.prisma.posTable.update({ where: { id }, data: { isActive: false } });
      return {
        archived: true,
        message: 'Table has order history — deactivated instead of deleted.',
      };
    }

    await this.prisma.posTable.delete({ where: { id } });
    return { deleted: true };
  }

  // ── Reorder within section ─────────────────────────────────────────────────
  async reorder(hotelId: string, dto: ReorderTablesDto) {
    await Promise.all(
      dto.items.map(({ id, sortOrder }) =>
        this.prisma.posTable.updateMany({
          where: { id, hotelId },
          data: { sortOrder },
        }),
      ),
    );
    return this.findAll(hotelId);
  }

  // ── Bulk seed (for new hotel setup) ───────────────────────────────────────
  async seed(hotelId: string) {
    const existing = await this.prisma.posTable.count({ where: { hotelId } });
    if (existing > 0) throw new BadRequestException('Tables already exist for this hotel.');

    const defaults = [
      // Bar section
      { name: 'Bar Counter', section: 'Bar', capacity: 10, sortOrder: 1 },
      { name: 'Bar Stool 1', section: 'Bar', capacity: 1, sortOrder: 2 },
      { name: 'Bar Stool 2', section: 'Bar', capacity: 1, sortOrder: 3 },
      // Restaurant section
      { name: 'Table 1', section: 'Restaurant', capacity: 4, sortOrder: 1 },
      { name: 'Table 2', section: 'Restaurant', capacity: 4, sortOrder: 2 },
      { name: 'Table 3', section: 'Restaurant', capacity: 4, sortOrder: 3 },
      { name: 'Table 4', section: 'Restaurant', capacity: 4, sortOrder: 4 },
      { name: 'Table 5', section: 'Restaurant', capacity: 4, sortOrder: 5 },
      { name: 'Table 6', section: 'Restaurant', capacity: 4, sortOrder: 6 },
      // Special
      { name: 'VIP Lounge', section: 'VIP', capacity: 8, sortOrder: 1 },
      { name: 'Poolside', section: 'Outdoor', capacity: 20, sortOrder: 1 },
      { name: 'Walkup', section: 'Takeaway', capacity: 1, sortOrder: 1 },
    ];

    await this.prisma.posTable.createMany({
      data: defaults.map((d) => ({ hotelId, ...d, isActive: true })),
    });

    return this.findAll(hotelId);
  }

  // ── Open orders for a table ────────────────────────────────────────────────
  async getOpenOrders(hotelId: string, id: string) {
    const table = await this.prisma.posTable.findFirst({ where: { id, hotelId } });
    if (!table) throw new NotFoundException('Table not found.');

    const orders = await this.prisma.posOrder.findMany({
      where: {
        hotelId,
        tableId: id,
        status: { in: ['PENDING', 'PREPARING', 'READY', 'DELIVERED'] },
        isPaid: false,
      },
      orderBy: { createdAt: 'asc' },
      include: {
        items: {
          include: { product: { select: { name: true, price: true, unit: true } } },
        },
      },
    });

    const total = orders.reduce((s, o) => s + Number(o.total), 0);
    return { table, orders, total, orderCount: orders.length };
  }

  // ── Sections list ──────────────────────────────────────────────────────────
  async getSections(hotelId: string) {
    const rows = await this.prisma.posTable.findMany({
      where: { hotelId },
      select: { section: true },
      distinct: ['section'],
      orderBy: { section: 'asc' },
    });
    return rows.map((r) => r.section ?? 'General').filter(Boolean);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  private async nextSortOrder(hotelId: string, section?: string): Promise<number> {
    const last = await this.prisma.posTable.findFirst({
      where: { hotelId, section: section ?? null },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });
    return (last?.sortOrder ?? 0) + 1;
  }
}
