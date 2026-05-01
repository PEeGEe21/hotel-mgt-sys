import { Injectable, NotFoundException } from '@nestjs/common';
import { HotelCronJobType } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { UpdateHotelDto } from '../dtos/update-hotel.dto';
import { RunnableHotelCronJob, RunHotelCronJobDto } from '../dtos/run-hotel-cron-job.dto';
import { ReservationsService } from '../../reservations/services/reservations.service';
import { AttendanceService } from '../../attendance/services/attendance.service';
import { FacilitiesService } from '../../facilities/services/facilities.service';

const HOUSEKEEPING_FOLLOW_UP_SCAN_JOB_TYPE =
  'HOUSEKEEPING_FOLLOW_UP_SCAN' as HotelCronJobType;
const UPCOMING_ARRIVAL_SCAN_JOB_TYPE =
  'UPCOMING_ARRIVAL_SCAN' as HotelCronJobType;
const NO_SHOW_FOLLOW_UP_SCAN_JOB_TYPE = 'NO_SHOW_FOLLOW_UP_SCAN' as HotelCronJobType;
const MAINTENANCE_ESCALATION_SCAN_JOB_TYPE =
  'MAINTENANCE_ESCALATION_SCAN' as HotelCronJobType;
const DAILY_DIGEST_SCAN_JOB_TYPE = 'DAILY_DIGEST_SCAN' as HotelCronJobType;

@Injectable()
export class HotelsService {
  constructor(
    private prisma: PrismaService,
    private reservationsService: ReservationsService,
    private attendanceService: AttendanceService,
    private facilitiesService: FacilitiesService,
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
      upcomingArrivalScanEnabled: true,
      upcomingArrivalScanHour: 18,
      upcomingArrivalScanMinute: 0,
      upcomingArrivalScanLastTriggeredAt: null,
      upcomingArrivalScanLastSucceededAt: null,
      upcomingArrivalScanLastFailedAt: null,
      upcomingArrivalScanLastError: null,
      overduePaymentScanEnabled: true,
      overduePaymentScanHour: 13,
      overduePaymentScanMinute: 0,
      overduePaymentScanLastTriggeredAt: null,
      overduePaymentScanLastSucceededAt: null,
      overduePaymentScanLastFailedAt: null,
      overduePaymentScanLastError: null,
      housekeepingFollowUpScanEnabled: false,
      housekeepingFollowUpScanHour: 15,
      housekeepingFollowUpScanMinute: 0,
      housekeepingFollowUpScanLastTriggeredAt: null,
      housekeepingFollowUpScanLastSucceededAt: null,
      housekeepingFollowUpScanLastFailedAt: null,
      housekeepingFollowUpScanLastError: null,
      noShowFollowUpScanEnabled: true,
      noShowFollowUpScanHour: 20,
      noShowFollowUpScanMinute: 0,
      noShowFollowUpScanLastTriggeredAt: null,
      noShowFollowUpScanLastSucceededAt: null,
      noShowFollowUpScanLastFailedAt: null,
      noShowFollowUpScanLastError: null,
      maintenanceEscalationScanEnabled: true,
      maintenanceEscalationScanHour: 16,
      maintenanceEscalationScanMinute: 0,
      maintenanceEscalationScanLastTriggeredAt: null,
      maintenanceEscalationScanLastSucceededAt: null,
      maintenanceEscalationScanLastFailedAt: null,
      maintenanceEscalationScanLastError: null,
      dailyDigestScanEnabled: true,
      dailyDigestScanHour: 19,
      dailyDigestScanMinute: 0,
      dailyDigestScanLastTriggeredAt: null,
      dailyDigestScanLastSucceededAt: null,
      dailyDigestScanLastFailedAt: null,
      dailyDigestScanLastError: null,
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
    const upcomingArrivalCronSetting = hotel.cronSettings.find(
      (setting) => setting.jobType === UPCOMING_ARRIVAL_SCAN_JOB_TYPE,
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
    const overduePaymentCronSetting = hotel.cronSettings.find(
      (setting) => setting.jobType === HotelCronJobType.OVERDUE_PAYMENT_SCAN,
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
    const noShowFollowUpCronSetting = hotel.cronSettings.find(
      (setting) => setting.jobType === NO_SHOW_FOLLOW_UP_SCAN_JOB_TYPE,
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
    const maintenanceEscalationCronSetting = hotel.cronSettings.find(
      (setting) => setting.jobType === MAINTENANCE_ESCALATION_SCAN_JOB_TYPE,
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
    const dailyDigestCronSetting = hotel.cronSettings.find(
      (setting) => setting.jobType === DAILY_DIGEST_SCAN_JOB_TYPE,
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
        upcomingArrivalScanEnabled:
          upcomingArrivalCronSetting?.enabled ??
          this.buildDefaultCronSettings().upcomingArrivalScanEnabled,
        upcomingArrivalScanHour:
          upcomingArrivalCronSetting?.runAtHour ??
          this.buildDefaultCronSettings().upcomingArrivalScanHour,
        upcomingArrivalScanMinute:
          upcomingArrivalCronSetting?.runAtMinute ??
          this.buildDefaultCronSettings().upcomingArrivalScanMinute,
        upcomingArrivalScanLastTriggeredAt:
          upcomingArrivalCronSetting?.lastTriggeredAt ?? null,
        upcomingArrivalScanLastSucceededAt:
          upcomingArrivalCronSetting?.lastSucceededAt ?? null,
        upcomingArrivalScanLastFailedAt:
          upcomingArrivalCronSetting?.lastFailedAt ?? null,
        upcomingArrivalScanLastError: upcomingArrivalCronSetting?.lastError ?? null,
        overduePaymentScanEnabled:
          overduePaymentCronSetting?.enabled ??
          this.buildDefaultCronSettings().overduePaymentScanEnabled,
        overduePaymentScanHour:
          overduePaymentCronSetting?.runAtHour ??
          this.buildDefaultCronSettings().overduePaymentScanHour,
        overduePaymentScanMinute:
          overduePaymentCronSetting?.runAtMinute ??
          this.buildDefaultCronSettings().overduePaymentScanMinute,
        overduePaymentScanLastTriggeredAt: overduePaymentCronSetting?.lastTriggeredAt ?? null,
        overduePaymentScanLastSucceededAt: overduePaymentCronSetting?.lastSucceededAt ?? null,
        overduePaymentScanLastFailedAt: overduePaymentCronSetting?.lastFailedAt ?? null,
        overduePaymentScanLastError: overduePaymentCronSetting?.lastError ?? null,
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
        noShowFollowUpScanEnabled:
          noShowFollowUpCronSetting?.enabled ??
          this.buildDefaultCronSettings().noShowFollowUpScanEnabled,
        noShowFollowUpScanHour:
          noShowFollowUpCronSetting?.runAtHour ??
          this.buildDefaultCronSettings().noShowFollowUpScanHour,
        noShowFollowUpScanMinute:
          noShowFollowUpCronSetting?.runAtMinute ??
          this.buildDefaultCronSettings().noShowFollowUpScanMinute,
        noShowFollowUpScanLastTriggeredAt:
          noShowFollowUpCronSetting?.lastTriggeredAt ?? null,
        noShowFollowUpScanLastSucceededAt:
          noShowFollowUpCronSetting?.lastSucceededAt ?? null,
        noShowFollowUpScanLastFailedAt: noShowFollowUpCronSetting?.lastFailedAt ?? null,
        noShowFollowUpScanLastError: noShowFollowUpCronSetting?.lastError ?? null,
        maintenanceEscalationScanEnabled:
          maintenanceEscalationCronSetting?.enabled ??
          this.buildDefaultCronSettings().maintenanceEscalationScanEnabled,
        maintenanceEscalationScanHour:
          maintenanceEscalationCronSetting?.runAtHour ??
          this.buildDefaultCronSettings().maintenanceEscalationScanHour,
        maintenanceEscalationScanMinute:
          maintenanceEscalationCronSetting?.runAtMinute ??
          this.buildDefaultCronSettings().maintenanceEscalationScanMinute,
        maintenanceEscalationScanLastTriggeredAt:
          maintenanceEscalationCronSetting?.lastTriggeredAt ?? null,
        maintenanceEscalationScanLastSucceededAt:
          maintenanceEscalationCronSetting?.lastSucceededAt ?? null,
        maintenanceEscalationScanLastFailedAt:
          maintenanceEscalationCronSetting?.lastFailedAt ?? null,
        maintenanceEscalationScanLastError:
          maintenanceEscalationCronSetting?.lastError ?? null,
        dailyDigestScanEnabled:
          dailyDigestCronSetting?.enabled ??
          this.buildDefaultCronSettings().dailyDigestScanEnabled,
        dailyDigestScanHour:
          dailyDigestCronSetting?.runAtHour ??
          this.buildDefaultCronSettings().dailyDigestScanHour,
        dailyDigestScanMinute:
          dailyDigestCronSetting?.runAtMinute ??
          this.buildDefaultCronSettings().dailyDigestScanMinute,
        dailyDigestScanLastTriggeredAt: dailyDigestCronSetting?.lastTriggeredAt ?? null,
        dailyDigestScanLastSucceededAt: dailyDigestCronSetting?.lastSucceededAt ?? null,
        dailyDigestScanLastFailedAt: dailyDigestCronSetting?.lastFailedAt ?? null,
        dailyDigestScanLastError: dailyDigestCronSetting?.lastError ?? null,
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
              jobType: UPCOMING_ARRIVAL_SCAN_JOB_TYPE,
            },
          },
          update: {
            enabled: cronSettings.upcomingArrivalScanEnabled,
            runAtHour: cronSettings.upcomingArrivalScanHour,
            runAtMinute: cronSettings.upcomingArrivalScanMinute,
          },
          create: {
            hotelId,
            jobType: UPCOMING_ARRIVAL_SCAN_JOB_TYPE,
            enabled: cronSettings.upcomingArrivalScanEnabled ?? true,
            runAtHour: cronSettings.upcomingArrivalScanHour ?? 18,
            runAtMinute: cronSettings.upcomingArrivalScanMinute ?? 0,
          },
        });

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
              jobType: HotelCronJobType.OVERDUE_PAYMENT_SCAN,
            },
          },
          update: {
            enabled: cronSettings.overduePaymentScanEnabled,
            runAtHour: cronSettings.overduePaymentScanHour,
            runAtMinute: cronSettings.overduePaymentScanMinute,
          },
          create: {
            hotelId,
            jobType: HotelCronJobType.OVERDUE_PAYMENT_SCAN,
            enabled: cronSettings.overduePaymentScanEnabled ?? true,
            runAtHour: cronSettings.overduePaymentScanHour ?? 13,
            runAtMinute: cronSettings.overduePaymentScanMinute ?? 0,
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

        await tx.hotelCronSetting.upsert({
          where: {
            hotelId_jobType: {
              hotelId,
              jobType: NO_SHOW_FOLLOW_UP_SCAN_JOB_TYPE,
            },
          },
          update: {
            enabled: cronSettings.noShowFollowUpScanEnabled,
            runAtHour: cronSettings.noShowFollowUpScanHour,
            runAtMinute: cronSettings.noShowFollowUpScanMinute,
          },
          create: {
            hotelId,
            jobType: NO_SHOW_FOLLOW_UP_SCAN_JOB_TYPE,
            enabled: cronSettings.noShowFollowUpScanEnabled ?? true,
            runAtHour: cronSettings.noShowFollowUpScanHour ?? 20,
            runAtMinute: cronSettings.noShowFollowUpScanMinute ?? 0,
          },
        });

        await tx.hotelCronSetting.upsert({
          where: {
            hotelId_jobType: {
              hotelId,
              jobType: MAINTENANCE_ESCALATION_SCAN_JOB_TYPE,
            },
          },
          update: {
            enabled: cronSettings.maintenanceEscalationScanEnabled,
            runAtHour: cronSettings.maintenanceEscalationScanHour,
            runAtMinute: cronSettings.maintenanceEscalationScanMinute,
          },
          create: {
            hotelId,
            jobType: MAINTENANCE_ESCALATION_SCAN_JOB_TYPE,
            enabled: cronSettings.maintenanceEscalationScanEnabled ?? true,
            runAtHour: cronSettings.maintenanceEscalationScanHour ?? 16,
            runAtMinute: cronSettings.maintenanceEscalationScanMinute ?? 0,
          },
        });

        await tx.hotelCronSetting.upsert({
          where: {
            hotelId_jobType: {
              hotelId,
              jobType: DAILY_DIGEST_SCAN_JOB_TYPE,
            },
          },
          update: {
            enabled: cronSettings.dailyDigestScanEnabled,
            runAtHour: cronSettings.dailyDigestScanHour,
            runAtMinute: cronSettings.dailyDigestScanMinute,
          },
          create: {
            hotelId,
            jobType: DAILY_DIGEST_SCAN_JOB_TYPE,
            enabled: cronSettings.dailyDigestScanEnabled ?? true,
            runAtHour: cronSettings.dailyDigestScanHour ?? 19,
            runAtMinute: cronSettings.dailyDigestScanMinute ?? 0,
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

    if (job === 'upcomingArrivalScan') {
      return this.reservationsService.runUpcomingArrivalScanForDate(new Date(), hotelId, true);
    }

    if (job === 'overduePaymentScan') {
      return this.reservationsService.runOverduePaymentScanForDate(new Date(), hotelId, true);
    }

    if (job === 'housekeepingFollowUpScan') {
      return this.reservationsService.runHousekeepingFollowUpScanForDate(new Date(), hotelId, true);
    }

    if (job === 'noShowFollowUpScan') {
      return this.reservationsService.runNoShowFollowUpScanForDate(new Date(), hotelId, true);
    }

    if (job === 'maintenanceEscalationScan') {
      return this.facilitiesService.runMaintenanceEscalationScanForDate(new Date(), hotelId, true);
    }

    return this.reservationsService.runDailyDigestScanForDate(new Date(), hotelId, true);
  }
}
