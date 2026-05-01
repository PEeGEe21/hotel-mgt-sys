import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { NOTIFICATION_EVENTS, type NotificationEvent } from '../notifications.constants';

export class SendTestNotificationDto {
  @ApiProperty({ enum: NOTIFICATION_EVENTS })
  @IsIn(NOTIFICATION_EVENTS)
  event!: NotificationEvent;
}
