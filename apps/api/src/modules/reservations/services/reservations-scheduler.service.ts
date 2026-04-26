import { InjectQueue } from '@nestjs/bull';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bull';
import {
  CHECKOUT_DUE_SCAN_JOB,
  CHECKOUT_DUE_SCAN_REPEAT_JOB_ID,
  RESERVATIONS_QUEUE,
} from '../reservations.constants';

@Injectable()
export class ReservationsSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(ReservationsSchedulerService.name);
  private readonly heartbeatCron = '*/5 * * * *';

  constructor(@InjectQueue(RESERVATIONS_QUEUE) private readonly reservationsQueue: Queue) {}

  private isCurrentHeartbeatJob(job: {
    id?: string;
    name?: string;
    cron?: string | null;
    tz?: string | null;
  }) {
    return (
      job.id === CHECKOUT_DUE_SCAN_REPEAT_JOB_ID &&
      job.name === CHECKOUT_DUE_SCAN_JOB &&
      job.cron === this.heartbeatCron &&
      !job.tz
    );
  }

  async onModuleInit() {
    const repeatableJobs = await this.reservationsQueue.getRepeatableJobs();

    for (const job of repeatableJobs) {
      const isCheckoutDueJob =
        job.id === CHECKOUT_DUE_SCAN_REPEAT_JOB_ID && job.name === CHECKOUT_DUE_SCAN_JOB;

      if (!isCheckoutDueJob || this.isCurrentHeartbeatJob(job)) continue;

      await this.reservationsQueue.removeRepeatableByKey(job.key);
      this.logger.warn(`Removed stale checkout scheduler job: ${job.key}`);
    }

    const hasCurrentHeartbeat = repeatableJobs.some((job) => this.isCurrentHeartbeatJob(job));

    if (!hasCurrentHeartbeat) {
      await this.reservationsQueue.add(
        CHECKOUT_DUE_SCAN_JOB,
        {},
        {
          jobId: CHECKOUT_DUE_SCAN_REPEAT_JOB_ID,
          repeat: {
            cron: this.heartbeatCron,
          },
          removeOnComplete: true,
          removeOnFail: 25,
        },
      );
    }

    this.logger.log('Scheduled checkout-due heartbeat every 5 minutes');
  }
}
