import { Body, Controller, Get, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, Roles, RolesGuard } from '../auth/guards';
import { PlatformService } from './platform.service';
import { CreatePlatformHotelOnboardingDto } from './dtos/create-platform-hotel-onboarding.dto';

@ApiTags('Platform')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
@Controller('platform')
export class PlatformController {
  constructor(private readonly platformService: PlatformService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get global platform stats for the super admin console' })
  getStats() {
    return this.platformService.getStats();
  }

  @Get('hotels')
  @ApiOperation({ summary: 'List hotels across the platform' })
  listHotels(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.platformService.listHotels({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search,
    });
  }

  @Get('hotels/:id')
  @ApiOperation({ summary: 'Get platform-level hotel details' })
  getHotelDetail(@Param('id') id: string) {
    return this.platformService.getHotelDetail(id);
  }

  @Get('users')
  @ApiOperation({ summary: 'List users across all hotels' })
  listUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('hotelId') hotelId?: string,
  ) {
    return this.platformService.listUsers({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search,
      role,
      hotelId,
    });
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get platform-level user details' })
  getUserDetail(@Param('id') id: string) {
    return this.platformService.getUserDetail(id);
  }

  @Get('activity-feed')
  @ApiOperation({ summary: 'Get recent platform activity for the super admin dashboard' })
  getActivityFeed(@Request() req: any, @Query('limit') limit?: string) {
    return this.platformService.getActivityFeed(req.user.sub, limit ? Number(limit) : undefined);
  }

  @Post('onboarding/hotel')
  @ApiOperation({ summary: 'Create a hotel tenant and provision the initial admin account' })
  createHotelOnboarding(@Request() req: any, @Body() dto: CreatePlatformHotelOnboardingDto) {
    return this.platformService.createHotelOnboarding(req.user.sub, dto);
  }
}
