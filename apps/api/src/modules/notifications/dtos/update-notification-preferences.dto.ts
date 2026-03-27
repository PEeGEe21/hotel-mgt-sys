import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsIn, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { NOTIFICATION_EVENTS, type NotificationEvent } from '../notifications.constants';

export class NotificationPreferenceItemDto {
  @ApiProperty({ enum: NOTIFICATION_EVENTS })
  @IsIn(NOTIFICATION_EVENTS)
  event!: NotificationEvent;

  @ApiProperty() @IsBoolean() channelEmail!: boolean;
  @ApiProperty() @IsBoolean() channelInApp!: boolean;
  @ApiProperty() @IsBoolean() channelPush!: boolean;
}

export class UpdateNotificationPreferencesDto {
  @ApiProperty({ type: [NotificationPreferenceItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NotificationPreferenceItemDto)
  preferences!: NotificationPreferenceItemDto[];
}
