import { Body, Controller, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
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

  @Get('me/features')
  @Permissions('view:settings')
  getFeatureAccess(@Request() req: any) {
    return this.hotelsService.getFeatureAccess(req.user.hotelId);
  }

  @Get('me/entitlements')
  @Permissions('view:settings')
  getEntitlements(@Request() req: any) {
    return this.hotelsService.getEntitlements(req.user.hotelId);
  }

  @Patch('me/banner-dismissals/:key')
  @Permissions('manage:settings')
  dismissBanner(
    @Request() req: any,
    @Param('key') key: string,
    @Body() body: { dismissedUntilHours?: number },
  ) {
    return this.hotelsService.dismissBanner(
      req.user.hotelId,
      req.user.sub,
      key,
      body?.dismissedUntilHours,
    );
  }

  @Patch('me')
  @Permissions('manage:settings')
  updateProfile(@Request() req: any, @Body() dto: UpdateHotelDto) {
    return this.hotelsService.updateProfile(req.user.hotelId, dto, req.user.sub);
  }

  @Post('me/cron/run')
  @Permissions('manage:settings')
  @ApiOperation({ summary: 'Run a hotel automation job immediately for verification' })
  runCronJob(@Request() req: any, @Body() dto: RunHotelCronJobDto) {
    return this.hotelsService.runCronJob(req.user.hotelId, dto);
  }
}
