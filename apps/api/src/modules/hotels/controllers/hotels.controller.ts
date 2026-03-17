import { Body, Controller, Get, Patch, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Permissions, PermissionsGuard } from '../../auth/guards';
import { HotelsService } from '../services/hotels.service';
import { UpdateHotelDto } from '../dtos/update-hotel.dto';

@ApiTags('Hotels')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('hotels')
export class HotelsController {
  constructor(private hotelsService: HotelsService) {}

  @Get('me')
  @Permissions('view:settings')
  getProfile(@Request() req: any) {
    return this.hotelsService.getProfile(req.user.hotelId);
  }

  @Patch('me')
  @Permissions('manage:settings')
  updateProfile(@Request() req: any, @Body() dto: UpdateHotelDto) {
    return this.hotelsService.updateProfile(req.user.hotelId, dto);
  }
}
