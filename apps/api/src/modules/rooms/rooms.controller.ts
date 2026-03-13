import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { RoomsService } from './rooms.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
@ApiTags('Rooms') @ApiBearerAuth() @UseGuards(JwtAuthGuard) @Controller('rooms')
export class RoomsController { constructor(private roomsService: RoomsService) {} }
