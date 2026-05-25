import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions, PermissionsGuard } from '../auth/guards';
import { ShiftsService } from './shifts.service';
import { CreateShiftTemplateDto } from './dtos/create-shift-template.dto';
import { UpdateShiftTemplateDto } from './dtos/update-shift-template.dto';
import { CreateShiftOverrideDto } from './dtos/create-shift-override.dto';
import { UpdateShiftOverrideDto } from './dtos/update-shift-override.dto';
import { ShiftOverrideFilterDto } from './dtos/shift-override-filter.dto';

@ApiTags('Shifts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('shifts')
export class ShiftsController {
  constructor(private shiftsService: ShiftsService) {}

  @Get()
  @Permissions('view:settings')
  list(@Request() req: any) {
    return this.shiftsService.list(req.user.hotelId);
  }

  @Post()
  @Permissions('manage:settings')
  create(@Request() req: any, @Body() dto: CreateShiftTemplateDto) {
    return this.shiftsService.create(req.user.hotelId, dto);
  }

  @Patch(':id')
  @Permissions('manage:settings')
  update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateShiftTemplateDto) {
    return this.shiftsService.update(req.user.hotelId, id, dto);
  }

  @Delete(':id')
  @Permissions('manage:settings')
  remove(@Request() req: any, @Param('id') id: string) {
    return this.shiftsService.remove(req.user.hotelId, id);
  }

  @Get('overrides/list')
  @Permissions('view:attendance')
  listOverrides(@Request() req: any, @Query() filters: ShiftOverrideFilterDto) {
    return this.shiftsService.listOverrides(req.user.hotelId, filters);
  }

  @Post('overrides')
  @Permissions('manage:attendance')
  createOverride(@Request() req: any, @Body() dto: CreateShiftOverrideDto) {
    return this.shiftsService.createOverride(req.user.hotelId, dto);
  }

  @Patch('overrides/:id')
  @Permissions('manage:attendance')
  updateOverride(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateShiftOverrideDto) {
    return this.shiftsService.updateOverride(req.user.hotelId, id, dto);
  }

  @Delete('overrides/:id')
  @Permissions('manage:attendance')
  removeOverride(@Request() req: any, @Param('id') id: string) {
    return this.shiftsService.removeOverride(req.user.hotelId, id);
  }
}
