import { Module } from '@nestjs/common';
import { RoomsService } from './services/rooms.service';
import { RoomsController } from './controllers/rooms.controller';
import { HotelLifecycleModule } from '../hotel-lifecycle/hotel-lifecycle.module';

@Module({
  imports: [HotelLifecycleModule],
  providers: [RoomsService],
  controllers: [RoomsController],
  exports: [RoomsService],
})
export class RoomsModule {}
