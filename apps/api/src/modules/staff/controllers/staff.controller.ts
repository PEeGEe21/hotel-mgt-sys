import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { StaffService } from '../services/staff.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Permissions, PermissionsGuard } from '../../auth/guards';
import { SetStaffPinDto } from '../dtos/set-pin.dto';
import { CreateStaffDto } from '../dtos/create-staff.dto';
import { StaffFilterDto } from '../dtos/staff-filter.dto';
import { UpdateStaffDto } from '../dtos/update-staff.dto';

@ApiTags('Staff')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('staff')
export class StaffController {
  constructor(private staffService: StaffService) {}

  @Post(':id/pin')
  @Permissions('edit:staff')
  setPin(@Request() req: any, @Param('id') id: string, @Body() dto: SetStaffPinDto) {
    return this.staffService.setPin(req.user.hotelId, id, dto);
  }

  @Get('roles')
  @ApiOperation({ summary: 'List available roles (from enum)' })
  getRoles() {
    return this.staffService.getRoles();
  }

  @Get('all')
  @ApiOperation({ summary: 'List housekeeping staff with active task count' })
  getStaff(@Request() req: any) {
    return this.staffService.getStaff(req.user.hotelId);
  }

  @Get()
  @ApiOperation({ summary: 'List staff with filters, stats, and today attendance status' })
  findAll(@Request() req: any, @Query() filters: StaffFilterDto) {
    return this.staffService.findAll(req.user.hotelId, filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get staff member with attendance, leaves, active tasks' })
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.staffService.findOne(req.user.hotelId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create staff + user account (default password: password)' })
  create(@Request() req: any, @Body() dto: CreateStaffDto) {
    return this.staffService.create(req.user.hotelId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update staff details' })
  update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateStaffDto) {
    return this.staffService.update(req.user.hotelId, id, dto);
  }

  @Patch(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate staff account' })
  deactivate(@Request() req: any, @Param('id') id: string) {
    return this.staffService.setActive(req.user.hotelId, id, false);
  }

  @Patch(':id/reactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reactivate staff account' })
  reactivate(@Request() req: any, @Param('id') id: string) {
    return this.staffService.setActive(req.user.hotelId, id, true);
  }

  @Patch(':id/reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password back to default "password"' })
  resetPassword(@Request() req: any, @Param('id') id: string) {
    return this.staffService.resetPassword(req.user.hotelId, id);
  }
}
