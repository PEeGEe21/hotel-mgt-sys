import { Body, Controller, Param, Post, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { StaffService } from '../services/staff.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Permissions, PermissionsGuard } from '../../auth/guards';
import { SetStaffPinDto } from '../dtos/set-pin.dto';

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
}
