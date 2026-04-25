import { Injectable, NotFoundException } from '@nestjs/common';
import { HotelCronJobType } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { UpdateHotelDto } from '../dtos/update-hotel.dto';

@Injectable()
export class HotelsService {
  constructor(private prisma: PrismaService) {}

  private buildDefaultCronSettings() {
    return {
      attendanceAbsenceScanEnabled: true,
      attendanceAbsenceScanHour: 9,
      attendanceAbsenceScanMinute: 15,
    };
  }

  async getProfile(hotelId: string) {
    const hotel = await this.prisma.hotel.findUnique({
      where: { id: hotelId },
      include: {
        cronSettings: {
          where: { jobType: HotelCronJobType.ATTENDANCE_ABSENCE_SCAN },
          take: 1,
        },
      },
    });
    if (!hotel) throw new NotFoundException('Hotel not found.');

    const cronSetting = hotel.cronSettings[0];

    return {
      ...hotel,
      cronSettings: cronSetting
        ? {
            attendanceAbsenceScanEnabled: cronSetting.enabled,
            attendanceAbsenceScanHour: cronSetting.runAtHour,
            attendanceAbsenceScanMinute: cronSetting.runAtMinute,
          }
        : this.buildDefaultCronSettings(),
    };
  }

  async updateProfile(hotelId: string, dto: UpdateHotelDto) {
    await this.getProfile(hotelId);
    const { cronSettings, ...hotelData } = dto;

    await this.prisma.$transaction(async (tx) => {
      await tx.hotel.update({
        where: { id: hotelId },
        data: hotelData,
      });

      if (cronSettings) {
        await tx.hotelCronSetting.upsert({
          where: {
            hotelId_jobType: {
              hotelId,
              jobType: HotelCronJobType.ATTENDANCE_ABSENCE_SCAN,
            },
          },
          update: {
            enabled: cronSettings.attendanceAbsenceScanEnabled,
            runAtHour: cronSettings.attendanceAbsenceScanHour,
            runAtMinute: cronSettings.attendanceAbsenceScanMinute,
          },
          create: {
            hotelId,
            jobType: HotelCronJobType.ATTENDANCE_ABSENCE_SCAN,
            enabled: cronSettings.attendanceAbsenceScanEnabled ?? true,
            runAtHour: cronSettings.attendanceAbsenceScanHour ?? 9,
            runAtMinute: cronSettings.attendanceAbsenceScanMinute ?? 15,
          },
        });
      }
    });

    return this.getProfile(hotelId);
  }
}
