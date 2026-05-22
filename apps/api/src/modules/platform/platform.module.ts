import { Module } from '@nestjs/common';
import { PlatformController } from './platform.controller';
import { PlatformService } from './platform.service';
import { HotelLifecycleModule } from '../hotel-lifecycle/hotel-lifecycle.module';

@Module({
  imports: [HotelLifecycleModule],
  controllers: [PlatformController],
  providers: [PlatformService],
})
export class PlatformModule {}
