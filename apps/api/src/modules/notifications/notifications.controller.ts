import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, Permissions, PermissionsGuard } from '../auth/guards';
import { NotificationsService } from './notifications.service';
import { UpdateNotificationPreferencesDto } from './dtos/update-notification-preferences.dto';
import { UpsertPushSubscriptionDto } from './dtos/upsert-push-subscription.dto';
import { RemovePushSubscriptionDto } from './dtos/remove-push-subscription.dto';
import { SendTestNotificationDto } from './dtos/send-test-notification.dto';
import { BulkNotificationActionDto } from './dtos/bulk-notification-action.dto';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOperation({ summary: 'List in-app notifications for current user' })
  listInbox(
    @Request() req: any,
    @Query('limit') limit?: string,
    @Query('page') page?: string,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('event') event?: string,
    @Query('includeArchived') includeArchived?: string,
    @Query('pinnedOnly') pinnedOnly?: string,
  ) {
    return this.notificationsService.listInbox(req.user.sub, req.user.hotelId ?? null, {
      limit: limit ? Number(limit) : undefined,
      page: page ? Number(page) : undefined,
      unreadOnly: unreadOnly === 'true',
      event: event as any,
      includeArchived: includeArchived === 'true',
      pinnedOnly: pinnedOnly === 'true',
    });
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('preferences')
  @ApiOperation({ summary: 'Get notification preferences for current user' })
  listPreferences(@Request() req: any) {
    return this.notificationsService.listPreferences(req.user.sub, req.user.hotelId ?? null);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('preferences')
  @ApiOperation({ summary: 'Update notification preferences for current user' })
  updatePreferences(@Request() req: any, @Body() dto: UpdateNotificationPreferencesDto) {
    return this.notificationsService.updatePreferences(
      req.user.sub,
      req.user.hotelId ?? null,
      dto.preferences ?? [],
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all in-app notifications as read for current user' })
  markAllAsRead(@Request() req: any) {
    return this.notificationsService.markAllAsRead(req.user.sub, req.user.hotelId ?? null);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('bulk')
  @ApiOperation({ summary: 'Apply bulk inbox actions for current user' })
  bulkAction(@Request() req: any, @Body() dto: BulkNotificationActionDto) {
    return this.notificationsService.bulkAction(
      req.user.sub,
      req.user.hotelId ?? null,
      dto.action,
      dto.ids ?? [],
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read for current user' })
  markAsRead(@Request() req: any, @Param('id') id: string) {
    return this.notificationsService.markAsRead(req.user.sub, req.user.hotelId ?? null, id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch(':id/archive')
  @ApiOperation({ summary: 'Archive a notification for current user' })
  archive(@Request() req: any, @Param('id') id: string) {
    return this.notificationsService.archive(req.user.sub, req.user.hotelId ?? null, id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch(':id/unarchive')
  @ApiOperation({ summary: 'Restore an archived notification for current user' })
  unarchive(@Request() req: any, @Param('id') id: string) {
    return this.notificationsService.unarchive(req.user.sub, req.user.hotelId ?? null, id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch(':id/pin')
  @ApiOperation({ summary: 'Pin a notification for current user' })
  pin(@Request() req: any, @Param('id') id: string) {
    return this.notificationsService.pin(req.user.sub, req.user.hotelId ?? null, id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch(':id/unpin')
  @ApiOperation({ summary: 'Unpin a notification for current user' })
  unpin(@Request() req: any, @Param('id') id: string) {
    return this.notificationsService.unpin(req.user.sub, req.user.hotelId ?? null, id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post('test')
  @Permissions('manage:settings')
  @ApiOperation({ summary: 'Send a test notification to the current user' })
  sendTestNotification(@Request() req: any, @Body() dto: SendTestNotificationDto) {
    return this.notificationsService.sendTestNotification(
      req.user.sub,
      req.user.hotelId ?? null,
      dto.event,
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('push/settings')
  @ApiOperation({ summary: 'Get browser push settings for the current environment' })
  getPushSettings() {
    return this.notificationsService.getPushSettings();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('push/status')
  @ApiOperation({ summary: 'Get current user push subscription health and recent delivery results' })
  getPushStatus(@Request() req: any) {
    return this.notificationsService.getPushStatus(req.user.sub, req.user.hotelId ?? null);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('push/subscriptions')
  @ApiOperation({ summary: 'Register or update a browser push subscription for current user' })
  upsertPushSubscription(
    @Request() req: any,
    @Body() dto: UpsertPushSubscriptionDto,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.notificationsService.upsertPushSubscription(
      req.user.sub,
      req.user.hotelId ?? null,
      dto,
      userAgent,
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete('push/subscriptions')
  @ApiOperation({ summary: 'Remove a browser push subscription for current user' })
  removePushSubscription(@Request() req: any, @Body() dto: RemovePushSubscriptionDto) {
    return this.notificationsService.removePushSubscription(req.user.sub, dto.endpoint);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete('push/subscriptions/:id')
  @ApiOperation({ summary: 'Remove a specific push subscription for current user' })
  removePushSubscriptionById(@Request() req: any, @Param('id') id: string) {
    return this.notificationsService.removePushSubscriptionById(req.user.sub, id);
  }
}
