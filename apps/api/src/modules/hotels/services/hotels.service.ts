import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { UpdateHotelDto } from '../dtos/update-hotel.dto';

@Injectable()
export class HotelsService {
  constructor(private prisma: PrismaService) {}

  async getProfile(hotelId: string) {
    const hotel = await this.prisma.hotel.findUnique({ where: { id: hotelId } });
    if (!hotel) throw new NotFoundException('Hotel not found.');
    return hotel;
  }

  async updateProfile(hotelId: string, dto: UpdateHotelDto) {
    await this.getProfile(hotelId);
    return this.prisma.hotel.update({
      where: { id: hotelId },
      data: dto,
    });
  }
}
