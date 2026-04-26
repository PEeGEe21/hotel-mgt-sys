import { InjectQueue } from '@nestjs/bull';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bull';
import {
  ATTENDANCE_ABSENCE_SCAN_JOB,
  ATTENDANCE_ABSENCE_SCAN_REPEAT_JOB_ID,
  ATTENDANCE_QUEUE,
} from '../attendance.constants';

@Injectable()
export class AttendanceSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(AttendanceSchedulerService.name);
  private readonly heartbeatCron = '*/5 * * * *';

  constructor(@InjectQueue(ATTENDANCE_QUEUE) private readonly attendanceQueue: Queue) {}

  private isCurrentHeartbeatJob(job: {
    id?: string;
    name?: string;
    cron?: string | null;
    tz?: string | null;
  }) {
    return (
      job.id === ATTENDANCE_ABSENCE_SCAN_REPEAT_JOB_ID &&
      job.name === ATTENDANCE_ABSENCE_SCAN_JOB &&
      job.cron === this.heartbeatCron &&
      !job.tz
    );
  }

  async onModuleInit() {
    const repeatableJobs = await this.attendanceQueue.getRepeatableJobs();

    for (const job of repeatableJobs) {
      const isAttendanceAbsenceJob =
        job.id === ATTENDANCE_ABSENCE_SCAN_REPEAT_JOB_ID &&
        job.name === ATTENDANCE_ABSENCE_SCAN_JOB;

      if (!isAttendanceAbsenceJob || this.isCurrentHeartbeatJob(job)) continue;

      await this.attendanceQueue.removeRepeatableByKey(job.key);
      this.logger.warn(`Removed stale attendance scheduler job: ${job.key}`);
    }

    const hasCurrentHeartbeat = repeatableJobs.some((job) => this.isCurrentHeartbeatJob(job));

    if (!hasCurrentHeartbeat) {
      await this.attendanceQueue.add(
        ATTENDANCE_ABSENCE_SCAN_JOB,
        {},
        {
          jobId: ATTENDANCE_ABSENCE_SCAN_REPEAT_JOB_ID,
          repeat: {
            cron: this.heartbeatCron,
          },
          removeOnComplete: true,
          removeOnFail: 25,
        },
      );
    }

    this.logger.log('Scheduled attendance absence heartbeat every 5 minutes');
  }
}
