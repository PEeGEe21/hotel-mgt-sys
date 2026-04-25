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

  constructor(@InjectQueue(ATTENDANCE_QUEUE) private readonly attendanceQueue: Queue) {}

  async onModuleInit() {
    await this.attendanceQueue.add(
      ATTENDANCE_ABSENCE_SCAN_JOB,
      {},
      {
        jobId: ATTENDANCE_ABSENCE_SCAN_REPEAT_JOB_ID,
        repeat: {
          cron: '*/5 * * * *',
        },
        removeOnComplete: true,
        removeOnFail: 25,
      },
    );

    this.logger.log('Scheduled attendance absence heartbeat every 5 minutes');
  }
}
