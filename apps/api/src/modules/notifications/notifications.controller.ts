import { Body, Controller, Get, Param, Patch, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards';
import { NotificationsService } from './notifications.service';
import { UpdateNotificationPreferencesDto } from './dtos/update-notification-preferences.dto';

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
  ) {
    return this.notificationsService.listInbox(req.user.sub, req.user.hotelId ?? null, {
      limit: limit ? Number(limit) : undefined,
      page: page ? Number(page) : undefined,
      unreadOnly: unreadOnly === 'true',
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
  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read for current user' })
  markAsRead(@Request() req: any, @Param('id') id: string) {
    return this.notificationsService.markAsRead(req.user.sub, req.user.hotelId ?? null, id);
  }
}
