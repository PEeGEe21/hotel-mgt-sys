import { Body, Controller, Get, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Permissions, PermissionsGuard } from '../../auth/guards';
import { HotelsService } from '../services/hotels.service';
import { UpdateHotelDto } from '../dtos/update-hotel.dto';
import { RunHotelCronJobDto } from '../dtos/run-hotel-cron-job.dto';

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

  @Post('me/cron/run')
  @Permissions('manage:settings')
  @ApiOperation({ summary: 'Run a hotel automation job immediately for verification' })
  runCronJob(@Request() req: any, @Body() dto: RunHotelCronJobDto) {
    return this.hotelsService.runCronJob(req.user.hotelId, dto);
  }
}
