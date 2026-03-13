import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { GuestsService } from './guests.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
@ApiTags('Guests') @ApiBearerAuth() @UseGuards(JwtAuthGuard) @Controller('guests')
export class GuestsController { constructor(private guestsService: GuestsService) {} }
