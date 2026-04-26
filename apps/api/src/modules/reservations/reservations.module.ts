import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ReservationsService } from './services/reservations.service';
import { ReservationsController } from './controllers/reservations.controller';
import { LedgerModule } from '../ledger/ledger.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmailModule } from '../../common/email/email.module';
import { RESERVATIONS_QUEUE } from './reservations.constants';
import { ReservationsSchedulerService } from './services/reservations-scheduler.service';
import { ReservationsProcessor } from './workers/reservations.processor';
@Module({
  imports: [
    LedgerModule,
    NotificationsModule,
    EmailModule,
    BullModule.registerQueue({
      name: RESERVATIONS_QUEUE,
    }),
  ],
  providers: [ReservationsService, ReservationsSchedulerService, ReservationsProcessor],
  controllers: [ReservationsController],
  exports: [ReservationsService],
})
export class ReservationsModule {}
