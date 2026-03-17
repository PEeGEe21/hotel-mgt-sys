import { Body, Controller, Delete, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions, PermissionsGuard } from '../auth/guards';
import { RoomTypesService } from './room-types.service';
import { CreateRoomTypeDto } from './dtos/create-room-type.dto';
import { UpdateRoomTypeDto } from './dtos/update-room-type.dto';

@ApiTags('Room Types')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('room-types')
export class RoomTypesController {
  constructor(private roomTypesService: RoomTypesService) {}

  @Get()
  @Permissions('view:settings')
  list(@Request() req: any) {
    return this.roomTypesService.list(req.user.hotelId);
  }

  @Post()
  @Permissions('manage:settings')
  create(@Request() req: any, @Body() dto: CreateRoomTypeDto) {
    return this.roomTypesService.create(req.user.hotelId, dto);
  }

  @Patch(':id')
  @Permissions('manage:settings')
  update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateRoomTypeDto) {
    return this.roomTypesService.update(req.user.hotelId, id, dto);
  }

  @Delete(':id')
  @Permissions('manage:settings')
  remove(@Request() req: any, @Param('id') id: string) {
    return this.roomTypesService.remove(req.user.hotelId, id);
  }
}
