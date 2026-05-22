import { Injectable } from '@nestjs/common';
import { HotelOnboardingStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

type PrismaClientLike = Prisma.TransactionClient | PrismaService;

@Injectable()
export class HotelLifecycleService {
  constructor(private readonly prisma: PrismaService) {}

  deriveOnboardingStatus(roomCount: number, staffCount: number): HotelOnboardingStatus {
    if (roomCount > 0 && staffCount > 0) return HotelOnboardingStatus.ACTIVE;
    if (staffCount > 0) return HotelOnboardingStatus.STAFF_INVITED;
    if (roomCount > 0) return HotelOnboardingStatus.ROOMS_ADDED;
    return HotelOnboardingStatus.PENDING_SETUP;
  }

  async syncOnboardingStatus(hotelId: string, client: PrismaClientLike = this.prisma) {
    const [roomCount, staffCount] = await Promise.all([
      client.room.count({ where: { hotelId } }),
      client.staff.count({ where: { hotelId } }),
    ]);

    const onboardingStatus = this.deriveOnboardingStatus(roomCount, staffCount);

    return client.hotel.update({
      where: { id: hotelId },
      data: { onboardingStatus },
      select: {
        id: true,
        onboardingStatus: true,
        suspendedAt: true,
      },
    });
  }
}
