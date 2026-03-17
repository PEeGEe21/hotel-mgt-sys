import { Body, Controller, Delete, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions, PermissionsGuard } from '../auth/guards';
import { ShiftsService } from './shifts.service';
import { CreateShiftTemplateDto } from './dtos/create-shift-template.dto';
import { UpdateShiftTemplateDto } from './dtos/update-shift-template.dto';

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
}
