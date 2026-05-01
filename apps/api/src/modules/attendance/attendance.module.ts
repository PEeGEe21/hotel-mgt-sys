import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { AttendanceService } from './services/attendance.service';
import { AttendanceController } from './controllers/attendance.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { AttendanceProcessor } from './workers/attendance.processor';
import { AttendanceSchedulerService } from './services/attendance-scheduler.service';

@Module({
  imports: [
    NotificationsModule,
    BullModule.registerQueue({
      name: 'attendance',
    }),
  ],
  providers: [AttendanceService, AttendanceProcessor, AttendanceSchedulerService],
  controllers: [AttendanceController],
  exports: [AttendanceService],
})
export class AttendanceModule {}
