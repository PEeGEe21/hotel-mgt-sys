import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { FloorsService } from '../services/floors.service';
import { JwtAuthGuard } from 'src/modules/auth/guards';
import { CreateFloorDto } from '../dtos/create-floor.dto';
import { UpdateFloorDto } from '../dtos/update-floor.dto';

@ApiTags('Floors')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('floors')
export class FloorsController {
  constructor(private floorsService: FloorsService) {}

  @Get()
  @ApiOperation({ summary: 'List all floors with room counts' })
  findAll(@Request() req: any) {
    return this.floorsService.findAll(req.user.hotelId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a floor with its rooms' })
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.floorsService.findOne(req.user.hotelId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new floor' })
  create(@Request() req: any, @Body() dto: CreateFloorDto) {
    return this.floorsService.create(req.user.hotelId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a floor' })
  update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateFloorDto) {
    return this.floorsService.update(req.user.hotelId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a floor (only if no rooms)' })
  remove(@Request() req: any, @Param('id') id: string) {
    return this.floorsService.remove(req.user.hotelId, id);
  }
}
