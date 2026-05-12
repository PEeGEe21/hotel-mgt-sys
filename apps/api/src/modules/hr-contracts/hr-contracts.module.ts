import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { HrContractsController } from './hr-contracts.controller';
import { HrContractsService } from './hr-contracts.service';

@Module({
  imports: [NotificationsModule],
  controllers: [HrContractsController],
  providers: [HrContractsService],
  exports: [HrContractsService],
})
export class HrContractsModule {}
