import { ApiProperty } from '@nestjs/swagger';
import { PrepStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdatePrepStatusDto {
  @ApiProperty({ enum: PrepStatus })
  @IsEnum(PrepStatus)
  status!: PrepStatus;
}
