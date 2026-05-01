import { Module } from '@nestjs/common';
import { HotelsController } from './controllers/hotels.controller';
import { HotelsService } from './services/hotels.service';
import { ReservationsModule } from '../reservations/reservations.module';
import { AttendanceModule } from '../attendance/attendance.module';

@Module({
  imports: [ReservationsModule, AttendanceModule],
  controllers: [HotelsController],
  providers: [HotelsService],
})
export class HotelsModule {}
