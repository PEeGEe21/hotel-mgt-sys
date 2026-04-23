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
import { CreateFacilityInspectionDto } from '../dtos/inspection/create-facility-inspection.dto';
import { UpdateFacilityInspectionDto } from '../dtos/inspection/update-facility-inspection.dto';

@ApiTags('FacilitiesInspection')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('facilities/inspections')
export class FacilitiesInspectionController {
  constructor(private facilitiesService: FacilitiesService) {}

  @Get('/list')
  @Permissions('view:facilities')
  @ApiOperation({ summary: 'List facility inspections' })
  listInspections(@Request() req: any, @Query() filters: any) {
    return this.facilitiesService.listInspections(req.user.hotelId, filters);
  }

  @Post('')
  @Permissions('manage:facilities')
  @ApiOperation({ summary: 'Create facility inspection' })
  createInspection(@Request() req: any, @Body() dto: CreateFacilityInspectionDto) {
    return this.facilitiesService.createInspection(req.user.hotelId, req.user.staffId, dto);
  }

  @Patch(':id')
  @Permissions('manage:facilities')
  @ApiOperation({ summary: 'Update facility inspection' })
  updateInspection(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateFacilityInspectionDto,
  ) {
    return this.facilitiesService.updateInspection(req.user.hotelId, id, dto);
  }
}
