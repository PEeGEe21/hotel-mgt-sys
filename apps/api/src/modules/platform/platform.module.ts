import { Module } from '@nestjs/common';
import { PlatformController } from './platform.controller';
import { PlatformService } from './platform.service';
import { HotelLifecycleModule } from '../hotel-lifecycle/hotel-lifecycle.module';
import { EmailModule } from '../../common/email/email.module';
import { EntitlementsModule } from '../entitlements/entitlements.module';

@Module({
  imports: [HotelLifecycleModule, EmailModule, EntitlementsModule],
  controllers: [PlatformController],
  providers: [PlatformService],
})
export class PlatformModule {}
