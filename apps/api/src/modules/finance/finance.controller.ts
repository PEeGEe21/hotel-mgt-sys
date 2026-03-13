import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { FinanceService } from './finance.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
@ApiTags('Finance') @ApiBearerAuth() @UseGuards(JwtAuthGuard) @Controller('finance')
export class FinanceController { constructor(private financeService: FinanceService) {} }
