import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { StaffService } from './staff.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
@ApiTags('Staff') @ApiBearerAuth() @UseGuards(JwtAuthGuard) @Controller('staff')
export class StaffController { constructor(private staffService: StaffService) {} }
