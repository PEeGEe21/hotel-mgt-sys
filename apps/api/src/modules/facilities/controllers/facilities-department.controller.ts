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
import { CreateFacilityDepartmentDto } from '../dtos/department/create-facility-department.dto';
import { UpdateFacilityDepartmentDto } from '../dtos/department/update-facility-department.dto';
import { FilterDto } from '../dtos/filter.dto';

@ApiTags('FacilitiesDepartment')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('facilities/departments')
export class FacilitiesDepartmentController {
  constructor(private facilitiesService: FacilitiesService) {}

  @Get('/list')
  @Permissions('view:facilities')
  @ApiOperation({ summary: 'List facility departments' })
  listDepartments(@Request() req: any, @Query() filters: FilterDto) {
    return this.facilitiesService.listDepartments(req.user.hotelId, filters);
  }

  @Post('')
  @Permissions('manage:facilities')
  @ApiOperation({ summary: 'Create facility department' })
  createDepartment(@Request() req: any, @Body() dto: CreateFacilityDepartmentDto) {
    return this.facilitiesService.createDepartment(req.user.hotelId, dto);
  }

  @Patch(':id')
  @Permissions('manage:facilities')
  @ApiOperation({ summary: 'Update facility department' })
  updateDepartment(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateFacilityDepartmentDto,
  ) {
    return this.facilitiesService.updateDepartment(req.user.hotelId, id, dto);
  }

  @Delete(':id')
  @Permissions('manage:facilities')
  @ApiOperation({ summary: 'Delete facility department' })
  deleteDepartment(@Request() req: any, @Param('id') id: string) {
    return this.facilitiesService.deleteDepartment(req.user.hotelId, id);
  }
}
