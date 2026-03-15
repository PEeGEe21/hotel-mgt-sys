import { Module } from '@nestjs/common';
import { FloorsService } from './services/floors.service';
import { FloorsController } from './controllers/floors.controller';

@Module({
  controllers: [FloorsController],
  providers: [FloorsService],
})
export class FloorsModule {}
