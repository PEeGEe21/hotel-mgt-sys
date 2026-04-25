import { Process, Processor } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bull';
import {
  ATTENDANCE_ABSENCE_SCAN_JOB,
  ATTENDANCE_QUEUE,
} from '../attendance.constants';
import { AttendanceService } from '../services/attendance.service';

@Injectable()
@Processor(ATTENDANCE_QUEUE)
export class AttendanceProcessor {
  private readonly logger = new Logger(AttendanceProcessor.name);

  constructor(private readonly attendanceService: AttendanceService) {}

  @Process(ATTENDANCE_ABSENCE_SCAN_JOB)
  async handleAbsenceScan(job: Job) {
    const result = await this.attendanceService.runAbsenceDetectionForDate(new Date());
    this.logger.log(
      `Completed ${job.name} for ${result.date}: ${result.absentStaffCount} absent staff across ${result.hotelsProcessed} hotels`,
    );
    return result;
  }
}
