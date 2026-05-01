import { Injectable, NotFoundException } from '@nestjs/common';
import { HotelCronJobType } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { UpdateHotelDto } from '../dtos/update-hotel.dto';
import { RunnableHotelCronJob, RunHotelCronJobDto } from '../dtos/run-hotel-cron-job.dto';
import { ReservationsService } from '../../reservations/services/reservations.service';
import { AttendanceService } from '../../attendance/services/attendance.service';

const HOUSEKEEPING_FOLLOW_UP_SCAN_JOB_TYPE =
  'HOUSEKEEPING_FOLLOW_UP_SCAN' as HotelCronJobType;

@Injectable()
export class HotelsService {
  constructor(
    private prisma: PrismaService,
    private reservationsService: ReservationsService,
    private attendanceService: AttendanceService,
  ) {}

  private buildDefaultCronSettings() {
    return {
      attendanceAbsenceScanEnabled: true,
      attendanceAbsenceScanHour: 9,
      attendanceAbsenceScanMinute: 15,
      attendanceAbsenceScanLastTriggeredAt: null,
      attendanceAbsenceScanLastSucceededAt: null,
      attendanceAbsenceScanLastFailedAt: null,
      attendanceAbsenceScanLastError: null,
      checkoutDueScanEnabled: true,
      checkoutDueScanHour: 11,
      checkoutDueScanMinute: 0,
      checkoutDueScanLastTriggeredAt: null,
      checkoutDueScanLastSucceededAt: null,
      checkoutDueScanLastFailedAt: null,
      checkoutDueScanLastError: null,
      housekeepingFollowUpScanEnabled: false,
      housekeepingFollowUpScanHour: 15,
      housekeepingFollowUpScanMinute: 0,
      housekeepingFollowUpScanLastTriggeredAt: null,
      housekeepingFollowUpScanLastSucceededAt: null,
      housekeepingFollowUpScanLastFailedAt: null,
      housekeepingFollowUpScanLastError: null,
    };
  }

  async getProfile(hotelId: string) {
    const hotel = await this.prisma.hotel.findUnique({
      where: { id: hotelId },
      include: {
        cronSettings: true,
      },
    });
    if (!hotel) throw new NotFoundException('Hotel not found.');

    const attendanceCronSetting = hotel.cronSettings.find(
      (setting) => setting.jobType === HotelCronJobType.ATTENDANCE_ABSENCE_SCAN,
    ) as
      | ({
          enabled: boolean;
          runAtHour: number;
          runAtMinute: number;
          lastTriggeredAt?: Date | null;
          lastSucceededAt?: Date | null;
          lastFailedAt?: Date | null;
          lastError?: string | null;
        } & Record<string, unknown>)
      | undefined;
    const checkoutCronSetting = hotel.cronSettings.find(
      (setting) => setting.jobType === HotelCronJobType.CHECKOUT_DUE_SCAN,
    ) as
      | ({
          enabled: boolean;
          runAtHour: number;
          runAtMinute: number;
          lastTriggeredAt?: Date | null;
          lastSucceededAt?: Date | null;
          lastFailedAt?: Date | null;
          lastError?: string | null;
        } & Record<string, unknown>)
      | undefined;
    const housekeepingFollowUpCronSetting = hotel.cronSettings.find(
      (setting) => setting.jobType === HOUSEKEEPING_FOLLOW_UP_SCAN_JOB_TYPE,
    ) as
      | ({
          enabled: boolean;
          runAtHour: number;
          runAtMinute: number;
          lastTriggeredAt?: Date | null;
          lastSucceededAt?: Date | null;
          lastFailedAt?: Date | null;
          lastError?: string | null;
        } & Record<string, unknown>)
      | undefined;

    return {
      ...hotel,
      cronSettings: {
        attendanceAbsenceScanEnabled:
          attendanceCronSetting?.enabled ?? this.buildDefaultCronSettings().attendanceAbsenceScanEnabled,
        attendanceAbsenceScanHour:
          attendanceCronSetting?.runAtHour ?? this.buildDefaultCronSettings().attendanceAbsenceScanHour,
        attendanceAbsenceScanMinute:
          attendanceCronSetting?.runAtMinute ??
          this.buildDefaultCronSettings().attendanceAbsenceScanMinute,
        attendanceAbsenceScanLastTriggeredAt: attendanceCronSetting?.lastTriggeredAt ?? null,
        attendanceAbsenceScanLastSucceededAt: attendanceCronSetting?.lastSucceededAt ?? null,
        attendanceAbsenceScanLastFailedAt: attendanceCronSetting?.lastFailedAt ?? null,
        attendanceAbsenceScanLastError: attendanceCronSetting?.lastError ?? null,
        checkoutDueScanEnabled:
          checkoutCronSetting?.enabled ?? this.buildDefaultCronSettings().checkoutDueScanEnabled,
        checkoutDueScanHour:
          checkoutCronSetting?.runAtHour ?? this.buildDefaultCronSettings().checkoutDueScanHour,
        checkoutDueScanMinute:
          checkoutCronSetting?.runAtMinute ?? this.buildDefaultCronSettings().checkoutDueScanMinute,
        checkoutDueScanLastTriggeredAt: checkoutCronSetting?.lastTriggeredAt ?? null,
        checkoutDueScanLastSucceededAt: checkoutCronSetting?.lastSucceededAt ?? null,
        checkoutDueScanLastFailedAt: checkoutCronSetting?.lastFailedAt ?? null,
        checkoutDueScanLastError: checkoutCronSetting?.lastError ?? null,
        housekeepingFollowUpScanEnabled:
          housekeepingFollowUpCronSetting?.enabled ??
          this.buildDefaultCronSettings().housekeepingFollowUpScanEnabled,
        housekeepingFollowUpScanHour:
          housekeepingFollowUpCronSetting?.runAtHour ??
          this.buildDefaultCronSettings().housekeepingFollowUpScanHour,
        housekeepingFollowUpScanMinute:
          housekeepingFollowUpCronSetting?.runAtMinute ??
          this.buildDefaultCronSettings().housekeepingFollowUpScanMinute,
        housekeepingFollowUpScanLastTriggeredAt:
          housekeepingFollowUpCronSetting?.lastTriggeredAt ?? null,
        housekeepingFollowUpScanLastSucceededAt:
          housekeepingFollowUpCronSetting?.lastSucceededAt ?? null,
        housekeepingFollowUpScanLastFailedAt:
          housekeepingFollowUpCronSetting?.lastFailedAt ?? null,
        housekeepingFollowUpScanLastError: housekeepingFollowUpCronSetting?.lastError ?? null,
      },
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

        await tx.hotelCronSetting.upsert({
          where: {
            hotelId_jobType: {
              hotelId,
              jobType: HotelCronJobType.CHECKOUT_DUE_SCAN,
            },
          },
          update: {
            enabled: cronSettings.checkoutDueScanEnabled,
            runAtHour: cronSettings.checkoutDueScanHour,
            runAtMinute: cronSettings.checkoutDueScanMinute,
          },
          create: {
            hotelId,
            jobType: HotelCronJobType.CHECKOUT_DUE_SCAN,
            enabled: cronSettings.checkoutDueScanEnabled ?? true,
            runAtHour: cronSettings.checkoutDueScanHour ?? 11,
            runAtMinute: cronSettings.checkoutDueScanMinute ?? 0,
          },
        });

        await tx.hotelCronSetting.upsert({
          where: {
            hotelId_jobType: {
              hotelId,
              jobType: HOUSEKEEPING_FOLLOW_UP_SCAN_JOB_TYPE,
            },
          },
          update: {
            enabled: cronSettings.housekeepingFollowUpScanEnabled,
            runAtHour: cronSettings.housekeepingFollowUpScanHour,
            runAtMinute: cronSettings.housekeepingFollowUpScanMinute,
          },
          create: {
            hotelId,
            jobType: HOUSEKEEPING_FOLLOW_UP_SCAN_JOB_TYPE,
            enabled: cronSettings.housekeepingFollowUpScanEnabled ?? false,
            runAtHour: cronSettings.housekeepingFollowUpScanHour ?? 15,
            runAtMinute: cronSettings.housekeepingFollowUpScanMinute ?? 0,
          },
        });
      }
    });

    return this.getProfile(hotelId);
  }

  async runCronJob(hotelId: string, dto: RunHotelCronJobDto) {
    await this.getProfile(hotelId);

    const result = await this.runRequestedCronJob(hotelId, dto.job);

    return {
      job: dto.job,
      result,
      profile: await this.getProfile(hotelId),
    };
  }

  private runRequestedCronJob(hotelId: string, job: RunnableHotelCronJob) {
    if (job === 'attendanceAbsenceScan') {
      return this.attendanceService.runAbsenceDetectionForDate(new Date(), hotelId, true);
    }

    if (job === 'checkoutDueScan') {
      return this.reservationsService.runCheckoutDueScanForDate(new Date(), hotelId, true);
    }

    return this.reservationsService.runHousekeepingFollowUpScanForDate(new Date(), hotelId, true);
  }
}
