import { Module } from '@nestjs/common';
import { GuestsService } from './services/guests.service';
import { GuestsController } from './controllers/guests.controller';

@Module({
  providers: [GuestsService],
  controllers: [GuestsController],
  exports: [GuestsService],
})
export class GuestsModule {}
