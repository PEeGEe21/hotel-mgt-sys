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
import { CreateFacilityRequisitionDto } from '../dtos/requisition/create-facility-requisition.dto';
import { UpdateFacilityRequisitionDto } from '../dtos/requisition/update-facility-requisition.dto';

@ApiTags('FacilitiesRequisition')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('facilities/requisitions')
export class FacilitiesRequisitionController {
  constructor(private facilitiesService: FacilitiesService) {}

  @Get('list')
  @Permissions('view:facilities')
  @ApiOperation({ summary: 'List facility requisitions' })
  listRequisitions(@Request() req: any, @Query() filters: any) {
    return this.facilitiesService.listRequisitions(req.user.hotelId, filters);
  }

  @Post('')
  @Permissions('create:facilities')
  @ApiOperation({ summary: 'Create facility requisition' })
  createRequisition(@Request() req: any, @Body() dto: CreateFacilityRequisitionDto) {
    return this.facilitiesService.createRequisition(req.user.hotelId, req.user.staffId, dto);
  }

  @Patch(':id')
  @Permissions('manage:facilities')
  @ApiOperation({ summary: 'Update facility requisition' })
  updateRequisition(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateFacilityRequisitionDto,
  ) {
    return this.facilitiesService.updateRequisition(req.user.hotelId, id, dto);
  }
}
