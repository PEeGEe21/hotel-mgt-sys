import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export const RUNNABLE_HOTEL_CRON_JOBS = [
  'attendanceAbsenceScan',
  'upcomingArrivalScan',
  'checkoutDueScan',
  'overduePaymentScan',
  'housekeepingFollowUpScan',
  'noShowFollowUpScan',
  'maintenanceEscalationScan',
  'dailyDigestScan',
] as const;

export type RunnableHotelCronJob = (typeof RUNNABLE_HOTEL_CRON_JOBS)[number];

export class RunHotelCronJobDto {
  @ApiProperty({ enum: RUNNABLE_HOTEL_CRON_JOBS })
  @IsIn(RUNNABLE_HOTEL_CRON_JOBS)
  job!: RunnableHotelCronJob;
}
