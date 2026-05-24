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
import {
  FeatureFlagsGuard,
  JwtAuthGuard,
  Permissions,
  PermissionsGuard,
  RequireFeatureFlags,
  Roles,
  RolesGuard,
} from '../auth/guards';
import { PlatformService } from './platform.service';
import { CreatePlatformHotelOnboardingDto } from './dtos/create-platform-hotel-onboarding.dto';
import { CreatePlatformSuperAdminDto } from './dtos/create-platform-super-admin.dto';
import { UpdatePlatformHotelLifecycleDto } from './dtos/update-platform-hotel-lifecycle.dto';
import { UpdatePlatformHotelDto } from './dtos/update-platform-hotel.dto';
import { QueryPlatformAuditLogsDto } from './dtos/query-platform-audit-logs.dto';
import { QueryPlatformSupportCasesDto } from './dtos/query-platform-support-cases.dto';
import { CreateSubscriptionPlanDto } from './dtos/create-subscription-plan.dto';
import { UpdateSubscriptionPlanDto } from './dtos/update-subscription-plan.dto';
import { UpdateHotelSubscriptionDto } from './dtos/update-hotel-subscription.dto';
import { UpdatePlanEntitlementsDto } from './dtos/update-plan-entitlements.dto';
import { UpdateHotelFeatureFlagDto } from './dtos/update-hotel-feature-flag.dto';
import { CreateSupportCaseDto } from './dtos/create-support-case.dto';
import { UpdateSupportCaseDto } from './dtos/update-support-case.dto';
import { CreateSupportCommentDto } from './dtos/create-support-comment.dto';

@ApiTags('Platform')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, FeatureFlagsGuard)
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

  @Get('hotels/:id/entitlements')
  @Permissions('platform:view-hotels')
  @ApiOperation({ summary: 'Get resolved hotel entitlements for platform review' })
  getHotelEntitlements(@Param('id') id: string) {
    return this.platformService.getHotelEntitlements(id);
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

  @Get('subscriptions')
  @Permissions('platform:view-hotels')
  @ApiOperation({ summary: 'Get subscription plans and hotel assignment summaries' })
  getSubscriptions() {
    return this.platformService.getSubscriptionsOverview();
  }

  @Post('subscriptions/plans')
  @Permissions('platform:manage-hotels')
  @ApiOperation({ summary: 'Create a subscription plan' })
  createSubscriptionPlan(@Request() req: any, @Body() dto: CreateSubscriptionPlanDto) {
    return this.platformService.createSubscriptionPlan(req.user.sub, dto);
  }

  @Patch('subscriptions/plans/:id')
  @Permissions('platform:manage-hotels')
  @ApiOperation({ summary: 'Update a subscription plan' })
  updateSubscriptionPlan(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateSubscriptionPlanDto) {
    return this.platformService.updateSubscriptionPlan(req.user.sub, id, dto);
  }

  @Patch('subscriptions/plans/:id/entitlements')
  @Permissions('platform:manage-hotels')
  @ApiOperation({ summary: 'Replace the feature entitlement mapping for a subscription plan' })
  updatePlanEntitlements(@Request() req: any, @Param('id') id: string, @Body() dto: UpdatePlanEntitlementsDto) {
    return this.platformService.updatePlanEntitlements(req.user.sub, id, dto);
  }

  @Get('feature-flags')
  @Permissions('platform:view-hotels')
  @ApiOperation({ summary: 'Get platform feature catalog with plan and hotel override summaries' })
  getFeatureFlags() {
    return this.platformService.getFeatureCatalogOverview();
  }

  @Get('support')
  @Permissions('platform:view-hotels')
  @ApiOperation({ summary: 'Get platform support inbox' })
  getSupportCases(@Query() filters?: QueryPlatformSupportCasesDto) {
    return this.platformService.getSupportCases({
      page: filters?.page,
      limit: filters?.limit,
      status: filters?.status,
      priority: filters?.priority,
      category: filters?.category,
      hotelId: filters?.hotelId,
      search: filters?.search,
    });
  }

  @Get('support/:id')
  @Permissions('platform:view-hotels')
  @ApiOperation({ summary: 'Get a platform support case with hotel context' })
  getSupportCaseDetail(@Param('id') id: string) {
    return this.platformService.getSupportCaseDetail(id);
  }

  @Post('support')
  @Permissions('platform:view-hotels')
  @RequireFeatureFlags('platform_support_ops')
  @ApiOperation({ summary: 'Create a platform support case' })
  createSupportCase(@Request() req: any, @Body() dto: CreateSupportCaseDto) {
    return this.platformService.createSupportCase(req.user.sub, dto);
  }

  @Patch('support/:id')
  @Permissions('platform:view-hotels')
  @RequireFeatureFlags('platform_support_ops')
  @ApiOperation({ summary: 'Update support case assignment, status, and core fields' })
  updateSupportCase(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateSupportCaseDto) {
    return this.platformService.updateSupportCase(req.user.sub, id, dto);
  }

  @Post('support/:id/comments')
  @Permissions('platform:view-hotels')
  @RequireFeatureFlags('platform_support_ops')
  @ApiOperation({ summary: 'Add a support case comment or internal note' })
  addSupportCaseComment(@Request() req: any, @Param('id') id: string, @Body() dto: CreateSupportCommentDto) {
    return this.platformService.addSupportCaseComment(req.user.sub, id, dto);
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

  @Patch('hotels/:id/subscription')
  @Permissions('platform:manage-hotels')
  @ApiOperation({ summary: 'Assign or update a hotel subscription' })
  updateHotelSubscription(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateHotelSubscriptionDto,
  ) {
    return this.platformService.updateHotelSubscription(req.user.sub, id, dto);
  }

  @Patch('hotels/:id/feature-flags/:flagKey')
  @Permissions('platform:manage-hotels')
  @ApiOperation({ summary: 'Set or clear a hotel-level feature override' })
  updateHotelFeatureFlag(
    @Request() req: any,
    @Param('id') id: string,
    @Param('flagKey') flagKey: string,
    @Body() dto: UpdateHotelFeatureFlagDto,
  ) {
    return this.platformService.updateHotelFeatureFlag(req.user.sub, id, flagKey, dto);
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
