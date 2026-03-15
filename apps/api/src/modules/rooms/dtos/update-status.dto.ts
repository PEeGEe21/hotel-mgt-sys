import { IsEnum } from 'class-validator';
import { RoomStatus } from '@prisma/client';

export class UpdateStatusDto {
  @IsEnum(RoomStatus) status!: RoomStatus;
}
