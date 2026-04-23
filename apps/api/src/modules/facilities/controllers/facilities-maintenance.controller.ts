import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, Permissions, PermissionsGuard } from '../../auth/guards';
import { FacilitiesService } from '../services/facilities.service';
import { CreateMaintenanceRequestDto } from '../dtos/maintenance/create-maintenance-request.dto';
import { UpdateMaintenanceRequestDto } from '../dtos/maintenance/update-maintenance-request.dto';

@ApiTags('FacilitiesMaintenance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('facilities/maintenances')
export class FacilitiesMaintenanceController {
  constructor(private facilitiesService: FacilitiesService) {}

  @Get('list')
  @Permissions('view:facilities')
  @ApiOperation({ summary: 'List maintenance requests' })
  listMaintenance(@Request() req: any, @Query() filters: any) {
    return this.facilitiesService.listMaintenance(req.user.hotelId, filters);
  }

  @Post('')
  @Permissions('create:facilities')
  @ApiOperation({ summary: 'Create maintenance request' })
  createMaintenance(@Request() req: any, @Body() dto: CreateMaintenanceRequestDto) {
    return this.facilitiesService.createMaintenance(req.user.hotelId, req.user.staffId, dto);
  }

  @Patch(':id')
  @Permissions('manage:facilities')
  @ApiOperation({ summary: 'Update maintenance request' })
  updateMaintenance(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateMaintenanceRequestDto,
  ) {
    return this.facilitiesService.updateMaintenance(req.user.hotelId, id, dto);
  }
}
