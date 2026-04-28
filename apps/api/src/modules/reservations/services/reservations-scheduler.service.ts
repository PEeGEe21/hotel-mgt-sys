import { InjectQueue } from '@nestjs/bull';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bull';
import {
  CHECKOUT_DUE_SCAN_JOB,
  CHECKOUT_DUE_SCAN_REPEAT_JOB_ID,
  HOUSEKEEPING_FOLLOW_UP_SCAN_JOB,
  HOUSEKEEPING_FOLLOW_UP_SCAN_REPEAT_JOB_ID,
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
  }, expected: { id: string; name: string }) {
    return (
      job.id === expected.id &&
      job.name === expected.name &&
      job.cron === this.heartbeatCron &&
      !job.tz
    );
  }

  private async ensureHeartbeatJob(
    repeatableJobs: Array<{
      id?: string;
      name?: string;
      key: string;
      cron?: string | null;
      tz?: string | null;
    }>,
    expected: { id: string; name: string },
  ) {
    for (const job of repeatableJobs) {
      const isTargetJob = job.id === expected.id && job.name === expected.name;

      if (!isTargetJob || this.isCurrentHeartbeatJob(job, expected)) continue;

      await this.reservationsQueue.removeRepeatableByKey(job.key);
      this.logger.warn(`Removed stale scheduler job: ${job.key}`);
    }

    const hasCurrentHeartbeat = repeatableJobs.some((job) =>
      this.isCurrentHeartbeatJob(job, expected),
    );

    if (hasCurrentHeartbeat) return;

    await this.reservationsQueue.add(
      expected.name,
      {},
      {
        jobId: expected.id,
        repeat: {
          cron: this.heartbeatCron,
        },
        removeOnComplete: true,
        removeOnFail: 25,
      },
    );
  }

  async onModuleInit() {
    const repeatableJobs = await this.reservationsQueue.getRepeatableJobs();
    await this.ensureHeartbeatJob(repeatableJobs, {
      id: CHECKOUT_DUE_SCAN_REPEAT_JOB_ID,
      name: CHECKOUT_DUE_SCAN_JOB,
    });
    await this.ensureHeartbeatJob(repeatableJobs, {
      id: HOUSEKEEPING_FOLLOW_UP_SCAN_REPEAT_JOB_ID,
      name: HOUSEKEEPING_FOLLOW_UP_SCAN_JOB,
    });

    this.logger.log('Scheduled reservation scheduler heartbeats every 5 minutes');
  }
}
