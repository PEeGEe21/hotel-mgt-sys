import { Body, Controller, Get, Patch, Request, UseGuards } from '@nestjs/common';
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
}
