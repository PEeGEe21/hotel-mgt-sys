import {
  Body,
  Controller,
  Delete,
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
import { CreateFacilityDto } from '../dtos/facility/create-facility.dto';
import { UpdateFacilityDto } from '../dtos/facility/update-facility.dto';
import { FacilityListFilterDto } from '../dtos/filter.dto';

@ApiTags('Facilities')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('facilities')
export class FacilitiesController {
  constructor(private facilitiesService: FacilitiesService) {}

  @Get()
  @Permissions('view:facilities')
  @ApiOperation({ summary: 'List facilities' })
  listFacilities(@Request() req: any, @Query() filters: FacilityListFilterDto) {
    return this.facilitiesService.listFacilities(req.user.hotelId, filters);
  }

  @Post()
  @Permissions('manage:facilities')
  @ApiOperation({ summary: 'Create facility' })
  createFacility(@Request() req: any, @Body() dto: CreateFacilityDto) {
    return this.facilitiesService.createFacility(req.user.hotelId, dto);
  }

  @Patch(':id')
  @Permissions('manage:facilities')
  @ApiOperation({ summary: 'Update facility' })
  updateFacility(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateFacilityDto) {
    return this.facilitiesService.updateFacility(req.user.hotelId, id, dto);
  }

  @Delete(':id')
  @Permissions('manage:facilities')
  @ApiOperation({ summary: 'Delete facility' })
  deleteFacility(@Request() req: any, @Param('id') id: string) {
    return this.facilitiesService.deleteFacility(req.user.hotelId, id);
  }

  @Get(':id')
  @Permissions('view:facilities')
  @ApiOperation({ summary: 'Get facility details' })
  getFacility(@Request() req: any, @Param('id') id: string) {
    return this.facilitiesService.getFacility(req.user.hotelId, id);
  }
}
