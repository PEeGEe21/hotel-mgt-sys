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
import { JwtAuthGuard, Permissions, PermissionsGuard, Roles, RolesGuard } from '../auth/guards';
import { PlatformService } from './platform.service';
import { CreatePlatformHotelOnboardingDto } from './dtos/create-platform-hotel-onboarding.dto';
import { CreatePlatformSuperAdminDto } from './dtos/create-platform-super-admin.dto';
import { UpdatePlatformHotelLifecycleDto } from './dtos/update-platform-hotel-lifecycle.dto';
import { UpdatePlatformHotelDto } from './dtos/update-platform-hotel.dto';
import { QueryPlatformAuditLogsDto } from './dtos/query-platform-audit-logs.dto';

@ApiTags('Platform')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('SUPER_ADMIN')
@Controller('platform')
export class PlatformController {
  constructor(private readonly platformService: PlatformService) {}

  @Get('super-admins')
  @Permissions('platform:manage-admins')
  @ApiOperation({ summary: 'List super admin accounts' })
  listSuperAdmins(@Query('search') search?: string) {
    return this.platformService.listSuperAdmins(search);
  }

  @Get('stats')
  @Permissions('platform:view-dashboard')
  @ApiOperation({ summary: 'Get global platform stats for the super admin console' })
  getStats() {
    return this.platformService.getStats();
  }

  @Get('hotels')
  @Permissions('platform:view-hotels')
  @ApiOperation({ summary: 'List hotels across the platform' })
  listHotels(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('all') all?: string,
  ) {
    return this.platformService.listHotels({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search,
      all: all === 'true',
    });
  }

  @Get('hotels/:id')
  @Permissions('platform:view-hotels')
  @ApiOperation({ summary: 'Get platform-level hotel details' })
  getHotelDetail(@Param('id') id: string) {
    return this.platformService.getHotelDetail(id);
  }

  @Get('users')
  @Permissions('platform:view-users')
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

  @Get('search')
  @Permissions('platform:view-dashboard')
  @ApiOperation({ summary: 'Search across hotels, users, and recent platform actions' })
  search(@Query('q') query?: string) {
    return this.platformService.search(query);
  }

  @Post('super-admins')
  @Permissions('platform:manage-admins')
  @ApiOperation({ summary: 'Create a new super admin account and email temporary credentials' })
  createSuperAdmin(@Request() req: any, @Body() dto: CreatePlatformSuperAdminDto) {
    return this.platformService.createSuperAdmin(req.user.sub, dto);
  }

  @Get('users/:id')
  @Permissions('platform:view-users')
  @ApiOperation({ summary: 'Get platform-level user details' })
  getUserDetail(@Param('id') id: string) {
    return this.platformService.getUserDetail(id);
  }

  @Get('activity-feed')
  @Permissions('platform:view-dashboard')
  @ApiOperation({ summary: 'Get recent platform activity for the super admin dashboard' })
  getActivityFeed(@Request() req: any, @Query('limit') limit?: string) {
    return this.platformService.getActivityFeed(req.user.sub, limit ? Number(limit) : undefined);
  }

  @Get('audit-logs')
  @Permissions('platform:view-audit')
  @ApiOperation({ summary: 'Get platform audit logs for the super admin console' })
  getAuditLogs(@Query() filters?: QueryPlatformAuditLogsDto) {
    return this.platformService.getAuditLogs({
      page: filters?.page,
      limit: filters?.limit,
      action: filters?.action,
      actor: filters?.actor,
      hotel: filters?.hotel,
      targetUser: filters?.targetUser,
      search: filters?.search,
    });
  }

  @Post('onboarding/hotel')
  @Permissions('platform:manage-hotels')
  @ApiOperation({ summary: 'Create a hotel tenant and provision the initial admin account' })
  createHotelOnboarding(@Request() req: any, @Body() dto: CreatePlatformHotelOnboardingDto) {
    return this.platformService.createHotelOnboarding(req.user.sub, dto);
  }

  @Patch('hotels/:id')
  @Permissions('platform:manage-hotels')
  @ApiOperation({ summary: 'Update platform-level hotel profile fields' })
  updateHotel(@Request() req: any, @Param('id') id: string, @Body() dto: UpdatePlatformHotelDto) {
    return this.platformService.updateHotel(req.user.sub, id, dto);
  }

  @Post('hotels/:id/suspend')
  @Permissions('platform:manage-hotels')
  @ApiOperation({ summary: 'Suspend a hotel tenant' })
  suspendHotel(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdatePlatformHotelLifecycleDto,
  ) {
    return this.platformService.suspendHotel(req.user.sub, id, dto);
  }

  @Post('hotels/:id/reactivate')
  @Permissions('platform:manage-hotels')
  @ApiOperation({ summary: 'Reactivate a suspended hotel tenant' })
  reactivateHotel(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdatePlatformHotelLifecycleDto,
  ) {
    return this.platformService.reactivateHotel(req.user.sub, id, dto);
  }

  @Post('hotels/:id/soft-delete')
  @Permissions('platform:manage-hotels')
  @ApiOperation({ summary: 'Soft-delete a hotel tenant with a grace-period purge window' })
  softDeleteHotel(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdatePlatformHotelLifecycleDto,
  ) {
    return this.platformService.softDeleteHotel(req.user.sub, id, dto);
  }

  @Post('hotels/:id/restore')
  @Permissions('platform:manage-hotels')
  @ApiOperation({ summary: 'Restore a soft-deleted hotel tenant before purge' })
  restoreHotel(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdatePlatformHotelLifecycleDto,
  ) {
    return this.platformService.restoreHotel(req.user.sub, id, dto);
  }
}
