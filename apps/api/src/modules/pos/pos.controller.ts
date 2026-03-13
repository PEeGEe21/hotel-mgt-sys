import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PosService } from './pos.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
@ApiTags('Pos') @ApiBearerAuth() @UseGuards(JwtAuthGuard) @Controller('pos')
export class PosController { constructor(private posService: PosService) {} }
