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
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { GuestsService } from '../services/guests.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Permissions, PermissionsGuard } from '../../auth/guards';
import { GuestFilterDto } from '../dtos/guest-filter.dto';
import { CreateGuestDto } from '../dtos/create-guest.dto';
import { UpdateGuestDto } from '../dtos/update-guest.dto';

@ApiTags('Guests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('guests')
export class GuestsController {
  constructor(private guestsService: GuestsService) {}

  @Get()
  @Permissions('view:guests')
  @ApiOperation({ summary: 'List guests with search, filter, pagination' })
  findAll(@Request() req: any, @Query() filters: GuestFilterDto) {
    return this.guestsService.findAll(req.user.hotelId, filters);
  }

  @Get(':id')
  @Permissions('view:guests')
  @ApiOperation({ summary: 'Get guest with full reservation history' })
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.guestsService.findOne(req.user.hotelId, id);
  }

  @Get(':id/folio-items')
  @Permissions('view:finance')
  @ApiOperation({ summary: 'Get guest folio items (cursor pagination)' })
  getFolioItems(
    @Request() req: any,
    @Param('id') id: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string
  ) {
    return this.guestsService.getFolioItems(req.user.hotelId, id, {
      cursor,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post()
  @Permissions('create:guests')
  @ApiOperation({ summary: 'Create a new guest' })
  create(@Request() req: any, @Body() dto: CreateGuestDto) {
    return this.guestsService.create(req.user.hotelId, dto);
  }

  @Put(':id')
  @Permissions('edit:guests')
  @ApiOperation({ summary: 'Update guest details' })
  update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateGuestDto) {
    return this.guestsService.update(req.user.hotelId, id, dto);
  }

  @Patch(':id/vip')
  @Permissions('edit:guests')
  @ApiOperation({ summary: 'Toggle VIP status' })
  toggleVip(@Request() req: any, @Param('id') id: string) {
    return this.guestsService.toggleVip(req.user.hotelId, id);
  }

  @Delete(':id')
  @Permissions('delete:guests')
  @ApiOperation({ summary: 'Delete a guest (no active reservations)' })
  remove(@Request() req: any, @Param('id') id: string) {
    return this.guestsService.remove(req.user.hotelId, id);
  }
}
