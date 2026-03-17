import { Module } from '@nestjs/common';
import { StaffService } from './services/staff.service';
import { StaffController } from './controllers/staff.controller';
@Module({ providers: [StaffService], controllers: [StaffController], exports: [StaffService] })
export class StaffModule {}
