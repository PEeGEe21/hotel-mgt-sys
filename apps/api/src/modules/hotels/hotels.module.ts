import { Module } from '@nestjs/common';
import { HotelsController } from './controllers/hotels.controller';
import { HotelsService } from './services/hotels.service';
import { ReservationsModule } from '../reservations/reservations.module';
import { AttendanceModule } from '../attendance/attendance.module';
import { FacilitiesModule } from '../facilities/facilities.module';

@Module({
  imports: [ReservationsModule, AttendanceModule, FacilitiesModule],
  controllers: [HotelsController],
  providers: [HotelsService],
})
export class HotelsModule {}
