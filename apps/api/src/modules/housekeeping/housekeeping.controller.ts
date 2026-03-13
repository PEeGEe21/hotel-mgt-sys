import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { HousekeepingService } from './housekeeping.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
@ApiTags('Housekeeping') @ApiBearerAuth() @UseGuards(JwtAuthGuard) @Controller('housekeeping')
export class HousekeepingController { constructor(private housekeepingService: HousekeepingService) {} }
