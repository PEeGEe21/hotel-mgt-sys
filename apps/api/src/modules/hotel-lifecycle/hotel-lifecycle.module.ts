import { Module } from '@nestjs/common';
import { HotelLifecycleService } from './hotel-lifecycle.service';

@Module({
  providers: [HotelLifecycleService],
  exports: [HotelLifecycleService],
})
export class HotelLifecycleModule {}
