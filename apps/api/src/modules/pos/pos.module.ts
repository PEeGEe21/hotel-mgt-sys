import { Module } from '@nestjs/common';
import { PosService } from './pos.service';
import { PosController } from './pos.controller';
import { PosTerminalsService } from './pos-terminals.service';
import { PosTerminalsController } from './pos-terminals.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [PosService, PosTerminalsService],
  controllers: [PosController, PosTerminalsController],
  exports: [PosService, PosTerminalsService],
})
export class PosModule {}
