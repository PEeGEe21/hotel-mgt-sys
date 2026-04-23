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
import { CreateFacilityTypeDto } from '../dtos/type/create-facility-type.dto';
import { UpdateFacilityTypeDto } from '../dtos/type/update-facility-type.dto';
import { FilterDto } from '../dtos/filter.dto';

@ApiTags('FacilitiesType')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('facilities/types')
export class FacilitiesTypeController {
  constructor(private facilitiesService: FacilitiesService) {}

  @Get('list')
  @Permissions('view:facilities')
  @ApiOperation({ summary: 'List facility types' })
  listTypes(@Request() req: any, @Query() filters: FilterDto) {
    return this.facilitiesService.listTypes(req.user.hotelId, filters);
  }

  @Post('')
  @Permissions('manage:facilities')
  @ApiOperation({ summary: 'Create facility type' })
  createType(@Request() req: any, @Body() dto: CreateFacilityTypeDto) {
    return this.facilitiesService.createType(req.user.hotelId, dto);
  }

  @Patch(':id')
  @Permissions('manage:facilities')
  @ApiOperation({ summary: 'Update facility type' })
  updateType(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateFacilityTypeDto) {
    return this.facilitiesService.updateType(req.user.hotelId, id, dto);
  }

  @Delete(':id')
  @Permissions('manage:facilities')
  @ApiOperation({ summary: 'Delete facility type' })
  deleteType(@Request() req: any, @Param('id') id: string) {
    return this.facilitiesService.deleteType(req.user.hotelId, id);
  }
}
