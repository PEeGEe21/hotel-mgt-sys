import { Module } from '@nestjs/common';
import { StaffService } from './services/staff.service';
import { StaffController } from './controllers/staff.controller';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [RealtimeModule],
  providers: [StaffService],
  controllers: [StaffController],
  exports: [StaffService],
})
export class StaffModule {}
