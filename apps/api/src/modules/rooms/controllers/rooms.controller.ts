import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RoomStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';
import { JwtAuthGuard } from 'src/modules/auth/guards';
import { RoomsService } from '../services/rooms.service';
import { RoomFilterDto } from '../dtos/room-filter.dto';
import { CreateRoomDto } from '../dtos/create-room.dto';
import { UpdateRoomDto } from '../dtos/update-room.dto';
import { UpdateStatusDto } from '../dtos/update-status.dto';
import { RoomReservationsDto } from '../dtos/room-reservations.dto';


@ApiTags('Rooms')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('rooms')
export class RoomsController {
  constructor(private roomsService: RoomsService) {}

  @Get()
  @ApiOperation({ summary: 'List all rooms with filters and stats' })
  findAll(@Request() req: any, @Query() filters: RoomFilterDto) {
    return this.roomsService.findAll(req.user.hotelId, filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single room with reservations and tasks' })
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.roomsService.findOne(req.user.hotelId, id);
  }

  @Get(':id/reservations')
  @ApiOperation({ summary: 'List reservations for a room (paginated)' })
  listReservations(
    @Request() req: any,
    @Param('id') id: string,
    @Query() filters: RoomReservationsDto,
  ) {
    return this.roomsService.listReservations(req.user.hotelId, id, filters);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new room' })
  create(@Request() req: any, @Body() dto: CreateRoomDto) {
    return this.roomsService.create(req.user.hotelId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update room details' })
  update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateRoomDto) {
    return this.roomsService.update(req.user.hotelId, id, dto);
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update room status only' })
  updateStatus(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateStatusDto) {
    return this.roomsService.updateStatus(req.user.hotelId, id, dto.status);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a room' })
  remove(@Request() req: any, @Param('id') id: string) {
    return this.roomsService.remove(req.user.hotelId, id);
  }
}
