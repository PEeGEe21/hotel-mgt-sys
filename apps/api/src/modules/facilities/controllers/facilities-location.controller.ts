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
import { CreateFacilityLocationDto } from '../dtos/location/create-facility-location.dto';
import { UpdateFacilityLocationDto } from '../dtos/location/update-facility-location.dto';
import { FilterDto } from '../dtos/filter.dto';

@ApiTags('FacilitiesLocation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('facilities/locations')
export class FacilitiesLocationController {
  constructor(private facilitiesService: FacilitiesService) {}

  @Get('/list')
  @Permissions('view:facilities')
  @ApiOperation({ summary: 'List facility locations' })
  listLocations(@Request() req: any, @Query() filters: FilterDto) {
    return this.facilitiesService.listLocations(req.user.hotelId, filters);
  }

  @Post('')
  @Permissions('manage:facilities')
  @ApiOperation({ summary: 'Create facility location' })
  createLocation(@Request() req: any, @Body() dto: CreateFacilityLocationDto) {
    return this.facilitiesService.createLocation(req.user.hotelId, dto);
  }

  @Patch(':id')
  @Permissions('manage:facilities')
  @ApiOperation({ summary: 'Update facility location' })
  updateLocation(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateFacilityLocationDto,
  ) {
    return this.facilitiesService.updateLocation(req.user.hotelId, id, dto);
  }

  @Delete(':id')
  @Permissions('manage:facilities')
  @ApiOperation({ summary: 'Delete facility location' })
  deleteLocation(@Request() req: any, @Param('id') id: string) {
    return this.facilitiesService.deleteLocation(req.user.hotelId, id);
  }
}
