import { Module } from '@nestjs/common';
import { HotelsController } from './controllers/hotels.controller';
import { HotelsService } from './services/hotels.service';

@Module({
  controllers: [HotelsController],
  providers: [HotelsService],
})
export class HotelsModule {}
