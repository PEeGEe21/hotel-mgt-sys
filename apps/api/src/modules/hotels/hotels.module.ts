import { Module } from '@nestjs/common';
import { HotelsController } from './controllers/hotels.controller';
import { HotelsService } from './services/hotels.service';
import { ReservationsModule } from '../reservations/reservations.module';

@Module({
  imports: [ReservationsModule],
  controllers: [HotelsController],
  providers: [HotelsService],
})
export class HotelsModule {}
