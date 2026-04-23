import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ProductFilterDto } from '../dtos/products/product-filter.dto';
import { CreateProductDto } from '../dtos/products/create-product.dto';
import { UpdateProductDto } from '../dtos/products/update-product.dto';
import { IngredientDto } from '../dtos/ingredient.dto';
import { UpdatePosProductCategoryDto } from '../dtos/products/update-pos-product-category.dto';
import { CreatePosProductCategoryDto } from '../dtos/products/create-pos-product-category.dto';

// ─── Service ──────────────────────────────────────────────────────────────────
const PRODUCT_INCLUDE = {
  ingredients: {
    include: {
      inventoryItem: {
        select: { id: true, name: true, unit: true, quantity: true, sku: true },
      },
    },
  },
} as const;

@Injectable()
export class PosProductsService {
  constructor(private prisma: PrismaService) {}

  // ── List ───────────────────────────────────────────────────────────────────
  async findAll(hotelId: string, filters: ProductFilterDto) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 50;
    const skip = (page - 1) * limit;

    const where: any = { hotelId };
    if (filters.category) where.categoryId = { contains: filters.category, mode: 'insensitive' };
    if (filters.type) where.type = filters.type;
    if (filters.isAvailable !== undefined) where.isAvailable = filters.isAvailable === 'true';
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { sku: { contains: filters.search, mode: 'insensitive' } },
        // { category: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [products, total] = await Promise.all([
      this.prisma.posProduct.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ name: 'asc' }],
        include: {
          ...PRODUCT_INCLUDE,
          _count: { select: { orderItems: true } },
        },
      }),
      this.prisma.posProduct.count({ where }),
    ]);

    // Category list for filter pills
    // const categories = await this.prisma.posProduct.findMany({
    //   where: { hotelId },
    //   select: { category: true },
    //   distinct: ['category'],
    //   orderBy: { category: 'asc' },
    // });

    return {
      products,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      meta: {
        total,
        current_page: page,
        last_page: Math.ceil(total / limit),
        per_page: limit,
        from: skip + 1,
        to: Math.min(skip + limit, total),
      },
      // categories: categories.map((c) => c.category),
    };
  }

  // ── Single ─────────────────────────────────────────────────────────────────
  async findOne(hotelId: string, id: string) {
    const product = await this.prisma.posProduct.findFirst({
      where: { id, hotelId },
      include: {
        ...PRODUCT_INCLUDE,
        _count: { select: { orderItems: true } },
      },
    });
    if (!product) throw new NotFoundException('Product not found.');
    return product;
  }

  // ── Create ─────────────────────────────────────────────────────────────────
  async create(hotelId: string, dto: CreateProductDto) {
    await this.assertCategoryBelongsToHotel(hotelId, dto.categoryId);

    // Validate ingredients requirement for non-service products
    if (dto.type !== 'SERVICE' && (!dto.ingredients || dto.ingredients.length === 0)) {
      throw new BadRequestException(
        'Physical and bundle products must have at least one ingredient linked to inventory.',
      );
    }

    // Check SKU uniqueness
    if (dto.sku) {
      const existing = await this.prisma.posProduct.findUnique({
        where: { hotelId_sku: { hotelId, sku: dto.sku.trim() } },
      });
      if (existing) throw new ConflictException(`SKU "${dto.sku}" already exists.`);
    }

    // Validate all inventory items exist
    if (dto.ingredients?.length) {
      await this.validateIngredients(hotelId, dto?.ingredients);
    }

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.posProduct.create({
        data: {
          hotelId,
          name: dto.name,
          price: dto.price,
          categoryId: dto.categoryId,
          sku: dto.sku?.trim(),
          description: dto.description,
          unit: dto.unit ?? 'item',
          image: dto.image,
          isAvailable: dto.isAvailable ?? true,
          stock: dto.stock,
          type: dto.type,
        },
      });

      if (dto.ingredients?.length) {
        await tx.productIngredient.createMany({
          data: dto.ingredients.map((ing) => ({
            hotelId,
            productId: product.id,
            inventoryItemId: ing.inventoryItemId,
            quantity: ing.quantity,
            unit: ing.unit,
          })),
        });
      }

      return tx.posProduct.findFirst({
        where: { id: product.id },
        include: PRODUCT_INCLUDE,
      });
    });
  }

  // ── Update ─────────────────────────────────────────────────────────────────
  async update(hotelId: string, id: string, dto: UpdateProductDto) {
    const product = await this.prisma.posProduct.findFirst({ where: { id, hotelId } });
    if (!product) throw new NotFoundException('Product not found.');

    const newType = dto.type ?? product.type;
    if (dto.categoryId) {
      await this.assertCategoryBelongsToHotel(hotelId, dto.categoryId);
    }

    // Validate ingredients if updating a physical/bundle product
    if (dto.ingredients !== undefined) {
      if (newType !== 'SERVICE' && dto.ingredients.length === 0) {
        throw new BadRequestException(
          'Physical and bundle products must have at least one ingredient.',
        );
      }
      if (dto.ingredients.length > 0) {
        await this.validateIngredients(hotelId, dto.ingredients);
      }
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.posProduct.update({
        where: { id },
        data: {
          name: dto.name,
          price: dto.price,
          categoryId: dto.categoryId,
          description: dto.description,
          unit: dto.unit,
          isAvailable: dto.isAvailable,
          stock: dto.stock,
          type: dto.type,
        },
      });

      // Replace ingredients if provided
      if (dto.ingredients !== undefined) {
        await tx.productIngredient.deleteMany({ where: { productId: id, hotelId } });
        if (dto.ingredients.length > 0) {
          await tx.productIngredient.createMany({
            data: dto.ingredients.map((ing) => ({
              hotelId,
              productId: id,
              inventoryItemId: ing.inventoryItemId,
              quantity: ing.quantity,
              unit: ing.unit,
            })),
          });
        }
      }

      return tx.posProduct.findFirst({
        where: { id },
        include: PRODUCT_INCLUDE,
      });
    });
  }

  // ── Toggle availability ────────────────────────────────────────────────────
  async toggleAvailability(hotelId: string, id: string) {
    const product = await this.prisma.posProduct.findFirst({ where: { id, hotelId } });
    if (!product) throw new NotFoundException('Product not found.');

    return this.prisma.posProduct.update({
      where: { id },
      data: { isAvailable: !product.isAvailable },
      include: PRODUCT_INCLUDE,
    });
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  async remove(hotelId: string, id: string) {
    const product = await this.prisma.posProduct.findFirst({
      where: { id, hotelId },
      include: { _count: { select: { orderItems: true } } },
    });
    if (!product) throw new NotFoundException('Product not found.');

    if (product._count.orderItems > 0) {
      // Soft delete — just mark unavailable instead of deleting
      await this.prisma.posProduct.update({
        where: { id },
        data: { isAvailable: false },
      });
      return {
        archived: true,
        message: 'Product has order history — marked as unavailable instead of deleted.',
      };
    }

    await this.prisma.posProduct.delete({ where: { id } });
    return { deleted: true };
  }

  // ── Inventory items (for ingredient picker) ────────────────────────────────
  async getInventoryItems(hotelId: string, search?: string) {
    const where: any = { hotelId };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.inventoryItem.findMany({
      where,
      select: { id: true, name: true, unit: true, quantity: true, sku: true, category: true },
      orderBy: { name: 'asc' },
      take: 50,
    });
  }

  // CATEGORIES ========================

  async getCategories(hotelId: string) {
    const categories = await this.prisma.posProductCategory.findMany({
      where: { hotelId },
      orderBy: { name: 'asc' },
    });

    // const counts = await this.prisma.posProduct.groupBy({
    //   by: ['category'],
    //   where: { hotelId },
    //   _count: { _all: true },
    // });
    // const countMap = new Map(counts.map((c) => [c.category, c._count._all]));

    return categories.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description ?? '',
      color: c.color,
      // itemCount: countMap.get(c.name) ?? 0,
    }));
  }

  async updateCategory(hotelId: string, id: string, dto: UpdatePosProductCategoryDto) {
    const category = await this.prisma.posProductCategory.findFirst({ where: { id, hotelId } });
    if (!category) throw new NotFoundException('Category not found.');

    const nextName = dto.name ? dto.name.trim() : category.name;
    if (dto.name && !nextName) {
      throw new BadRequestException('Category name is required.');
    }

    if (nextName !== category.name) {
      const exists = await this.prisma.posProductCategory.findFirst({
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
      return this.prisma.posProductCategory.update({ where: { id: category.id }, data });
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.posProductCategory.update({ where: { id: category.id }, data });
      // await tx.posProduct.updateMany({
      //   where: { hotelId, categoryId: category.id },
      //   data: { category: nextName },
      // });
      return updated;
    });
  }

  async removeCategory(hotelId: string, id: string) {
    const category = await this.prisma.posProductCategory.findFirst({ where: { id, hotelId } });
    if (!category) throw new NotFoundException('Category not found.');

    const itemCount = await this.prisma.posProduct.count({
      where: { hotelId, categoryId: category.id },
    });
    if (itemCount > 0) {
      throw new BadRequestException('This category has items assigned and cannot be deleted.');
    }

    await this.prisma.posProductCategory.delete({ where: { id: category.id } });
    return { success: true };
  }

  async createCategory(hotelId: string, dto: CreatePosProductCategoryDto) {
    const name = dto.name.trim();
    if (!name) throw new BadRequestException('Category name is required.');

    const existing = await this.prisma.posProductCategory.findFirst({
      where: { hotelId, name: { equals: name, mode: 'insensitive' } },
      select: { id: true },
    });
    if (existing) throw new BadRequestException('A category with this name already exists.');

    return this.prisma.posProductCategory.create({
      data: {
        hotelId,
        name,
        description: dto.description?.trim() || null,
        color: dto.color || undefined,
      },
    });
  }

  // ── Private helpers ────────────────────────────────────────────────────────
  private async validateIngredients(hotelId: string, ingredients: IngredientDto[]) {
    const ids = ingredients.map((i) => i.inventoryItemId);
    const items = await this.prisma.inventoryItem.findMany({
      where: { id: { in: ids }, hotelId },
      select: { id: true },
    });
    const found = new Set(items.map((i) => i.id));
    const missing = ids.filter((id) => !found.has(id));
    if (missing.length > 0) {
      throw new NotFoundException(`Inventory items not found: ${missing.join(', ')}`);
    }
  }

  private async assertCategoryBelongsToHotel(hotelId: string, categoryId: string) {
    const category = await this.prisma.posProductCategory.findFirst({
      where: { id: categoryId, hotelId },
      select: { id: true },
    });
    if (!category) throw new NotFoundException('Product category not found.');
  }
}
