import { Module } from '@nestjs/common';
import { HousekeepingService } from './services/housekeeping.service';
import { HousekeepingController } from './controllers/housekeeping.controller';
@Module({
  providers: [HousekeepingService],
  controllers: [HousekeepingController],
  exports: [HousekeepingService],
})
export class HousekeepingModule {}
