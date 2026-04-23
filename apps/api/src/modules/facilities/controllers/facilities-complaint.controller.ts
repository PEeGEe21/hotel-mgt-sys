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
import { CreateFacilityComplaintDto } from '../dtos/complaint/create-facility-complaint.dto';
import { UpdateFacilityComplaintDto } from '../dtos/complaint/update-facility-complaint.dto';

@ApiTags('FacilitiesComplaint')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('facilities/complaints')
export class FacilitiesComplaintController {
  constructor(private facilitiesService: FacilitiesService) {}

  @Get('/list')
  @Permissions('view:facilities')
  @ApiOperation({ summary: 'List facility complaints' })
  listComplaints(@Request() req: any, @Query() filters: any) {
    return this.facilitiesService.listComplaints(req.user.hotelId, filters);
  }

  @Post('')
  @Permissions('manage:facilities')
  @ApiOperation({ summary: 'Create facility complaint' })
  createComplaint(@Request() req: any, @Body() dto: CreateFacilityComplaintDto) {
    return this.facilitiesService.createComplaint(req.user.hotelId, req.user.staffId, dto);
  }

  @Patch(':id')
  @Permissions('manage:facilities')
  @ApiOperation({ summary: 'Update facility complaint' })
  updateComplaint(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateFacilityComplaintDto,
  ) {
    return this.facilitiesService.updateComplaint(req.user.hotelId, id, dto);
  }
}
