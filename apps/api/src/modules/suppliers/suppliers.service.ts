import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSupplierDto } from './dtos/create-supplier.dto';
import { UpdateSupplierDto } from './dtos/update-supplier.dto';

@Injectable()
export class SuppliersService {
  constructor(private prisma: PrismaService) {}

  async list(hotelId: string) {
    return this.prisma.supplier.findMany({
      where: { hotelId },
      orderBy: { name: 'asc' },
    });
  }

  async create(hotelId: string, dto: CreateSupplierDto) {
    const name = dto.name.trim();
    if (!name) throw new BadRequestException('Supplier name is required.');

    const existing = await this.prisma.supplier.findFirst({
      where: { hotelId, name: { equals: name, mode: 'insensitive' } },
      select: { id: true },
    });
    if (existing) throw new BadRequestException('A supplier with this name already exists.');

    return this.prisma.supplier.create({
      data: {
        hotelId,
        name,
        contact: dto.contact?.trim() || null,
        phone: dto.phone?.trim() || null,
        email: dto.email?.trim() || null,
        address: dto.address?.trim() || null,
        notes: dto.notes?.trim() || null,
        categories: dto.categories ?? [],
      },
    });
  }

  async update(hotelId: string, id: string, dto: UpdateSupplierDto) {
    const supplier = await this.prisma.supplier.findFirst({ where: { id, hotelId } });
    if (!supplier) throw new NotFoundException('Supplier not found.');

    const nextName = dto.name ? dto.name.trim() : supplier.name;
    if (dto.name && !nextName) throw new BadRequestException('Supplier name is required.');

    if (nextName !== supplier.name) {
      const exists = await this.prisma.supplier.findFirst({
        where: { hotelId, name: { equals: nextName, mode: 'insensitive' } },
        select: { id: true },
      });
      if (exists && exists.id !== supplier.id) {
        throw new BadRequestException('A supplier with this name already exists.');
      }
    }

    return this.prisma.supplier.update({
      where: { id: supplier.id },
      data: {
        name: nextName,
        contact: dto.contact?.trim() || null,
        phone: dto.phone?.trim() || null,
        email: dto.email?.trim() || null,
        address: dto.address?.trim() || null,
        notes: dto.notes?.trim() || null,
        categories: dto.categories ?? supplier.categories,
      },
    });
  }

  async remove(hotelId: string, id: string) {
    const supplier = await this.prisma.supplier.findFirst({ where: { id, hotelId } });
    if (!supplier) throw new NotFoundException('Supplier not found.');

    await this.prisma.supplier.delete({ where: { id: supplier.id } });
    return { success: true };
  }
}
