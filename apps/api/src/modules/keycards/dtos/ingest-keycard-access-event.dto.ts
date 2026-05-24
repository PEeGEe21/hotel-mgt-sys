import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';
import {
  KEYCARD_ACCESS_METHODS,
  KEYCARD_ACCESS_RESULTS,
} from '../constants/keycard.constants';

export class IngestKeycardAccessEventDto {
  @ApiProperty()
  @IsString()
  accessToken!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiPropertyOptional({ enum: KEYCARD_ACCESS_RESULTS })
  @IsOptional()
  @IsIn(KEYCARD_ACCESS_RESULTS)
  result?: (typeof KEYCARD_ACCESS_RESULTS)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ enum: KEYCARD_ACCESS_METHODS, default: 'VENDOR_SYNC' })
  @IsOptional()
  @IsIn(KEYCARD_ACCESS_METHODS)
  method?: (typeof KEYCARD_ACCESS_METHODS)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  occurredAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vendorEventId?: string;
}
