import { Module } from '@nestjs/common';
import { LedgerService } from './ledger.service';
import { LedgerController } from './ledger.controller';

@Module({
  providers: [LedgerService],
  controllers: [LedgerController],
  exports: [LedgerService], // exported so POS, Reservations etc can inject it
})
export class LedgerModule {}
