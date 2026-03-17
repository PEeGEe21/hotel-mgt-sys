import { Module } from '@nestjs/common';
import { AttendanceService } from './services/attendance.service';
import { AttendanceController } from './controllers/attendance.controller';

@Module({
  providers: [AttendanceService],
  controllers: [AttendanceController],
})
export class AttendanceModule {}
