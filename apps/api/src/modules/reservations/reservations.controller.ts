import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ReservationsService } from './reservations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
@ApiTags('Reservations') @ApiBearerAuth() @UseGuards(JwtAuthGuard) @Controller('reservations')
export class ReservationsController { constructor(private reservationsService: ReservationsService) {} }
