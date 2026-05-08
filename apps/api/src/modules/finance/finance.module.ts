import { Module } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { FinanceController } from './finance.controller';
import { LedgerModule } from '../ledger/ledger.module';

@Module({
  imports: [LedgerModule],
  providers: [FinanceService],
  controllers: [FinanceController],
  exports: [FinanceService],
})
export class FinanceModule {}
