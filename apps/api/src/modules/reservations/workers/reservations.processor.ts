import { Process, Processor } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bull';
import { FacilitiesService } from '../../facilities/services/facilities.service';
import { ReservationsService } from '../services/reservations.service';
import {
  CHECKOUT_DUE_SCAN_JOB,
  DAILY_DIGEST_SCAN_JOB,
  HOUSEKEEPING_FOLLOW_UP_SCAN_JOB,
  MAINTENANCE_ESCALATION_SCAN_JOB,
  NO_SHOW_FOLLOW_UP_SCAN_JOB,
  RESERVATIONS_QUEUE,
} from '../reservations.constants';

@Injectable()
@Processor(RESERVATIONS_QUEUE)
export class ReservationsProcessor {
  private readonly logger = new Logger(ReservationsProcessor.name);

  constructor(
    private readonly reservationsService: ReservationsService,
    private readonly facilitiesService: FacilitiesService,
  ) {}

  @Process(CHECKOUT_DUE_SCAN_JOB)
  async handleCheckoutDueScan(job: Job) {
    const result = await this.reservationsService.runCheckoutDueScanForDate(new Date());
    this.logger.log(
      `Completed ${job.name} for ${result.date}: ${result.reservationsFlagged} reservations flagged across ${result.hotelsProcessed} hotels, ${result.hotelsFailed} failed`,
    );
    return result;
  }

  @Process(HOUSEKEEPING_FOLLOW_UP_SCAN_JOB)
  async handleHousekeepingFollowUpScan(job: Job) {
    const result = await this.reservationsService.runHousekeepingFollowUpScanForDate(new Date());
    this.logger.log(
      `Completed ${job.name} for ${result.date}: ${result.tasksFlagged} tasks flagged across ${result.hotelsProcessed} hotels, ${result.hotelsFailed} failed`,
    );
    return result;
  }

  @Process(NO_SHOW_FOLLOW_UP_SCAN_JOB)
  async handleNoShowFollowUpScan(job: Job) {
    const result = await this.reservationsService.runNoShowFollowUpScanForDate(new Date());
    this.logger.log(
      `Completed ${job.name} for ${result.date}: ${result.reservationsFlagged} reservations flagged across ${result.hotelsProcessed} hotels, ${result.hotelsFailed} failed`,
    );
    return result;
  }

  @Process(MAINTENANCE_ESCALATION_SCAN_JOB)
  async handleMaintenanceEscalationScan(job: Job) {
    const result = await this.facilitiesService.runMaintenanceEscalationScanForDate(new Date());
    this.logger.log(
      `Completed ${job.name} for ${result.date}: ${result.requestsFlagged} requests flagged across ${result.hotelsProcessed} hotels, ${result.hotelsFailed} failed`,
    );
    return result;
  }

  @Process(DAILY_DIGEST_SCAN_JOB)
  async handleDailyDigestScan(job: Job) {
    const result = await this.reservationsService.runDailyDigestScanForDate(new Date());
    this.logger.log(
      `Completed ${job.name} for ${result.date}: ${result.hotelsProcessed} hotels processed, ${result.hotelsFailed} failed`,
    );
    return result;
  }
}
