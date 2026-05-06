import { Module } from '@nestjs/common';
import { HousekeepingService } from './services/housekeeping.service';
import { HousekeepingController } from './controllers/housekeeping.controller';
import { RealtimeModule } from '../realtime/realtime.module';
@Module({
  imports: [RealtimeModule],
  providers: [HousekeepingService],
  controllers: [HousekeepingController],
  exports: [HousekeepingService],
})
export class HousekeepingModule {}
