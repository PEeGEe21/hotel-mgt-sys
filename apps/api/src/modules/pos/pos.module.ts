import { Module } from '@nestjs/common';
import { PosService } from './services/pos.service';
import { PosController } from './controllers/pos.controller';
import { PosTerminalsService } from './services/pos-terminals.service';
import { PosTerminalsController } from './controllers/pos-terminals.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { PosProductsService } from './services/pos-products.service';
import { PosProductsController } from './controllers/pos-products.controller';
import { PosOrdersService } from './services/pos-orders.service';
import { PosOrdersController } from './controllers/pos-orders.controller';
import { PosTablesController } from './controllers/pos-tables.controller';
import { PosTablesService } from './services/pos-tables.service';
import { PosTerminalAuthService } from './services/pos-terminal-auth.service';
import { PosTerminalAuthController } from './controllers/pos-terminal-auth.controller';
import { LedgerModule } from '../ledger/ledger.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [PrismaModule, LedgerModule, RealtimeModule],
  providers: [
    PosService,
    PosTerminalsService,
    PosProductsService,
    PosOrdersService,
    PosTablesService,
    PosTerminalAuthService,
  ],
  controllers: [
    PosController,
    PosTerminalsController,
    PosProductsController,
    PosOrdersController,
    PosTablesController,
    PosTerminalAuthController,
  ],
  exports: [
    PosService,
    PosTerminalsService,
    PosProductsService,
    PosOrdersService,
    PosTablesService,
    PosTerminalAuthService,
  ],
})
export class PosModule {}
