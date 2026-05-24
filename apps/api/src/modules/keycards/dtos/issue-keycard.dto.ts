import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';
import { KEYCARD_TYPES } from '../constants/keycard.constants';

export class IssueKeycardDto {
  @ApiProperty()
  @IsString()
  reservationId!: string;

  @ApiProperty()
  @IsString()
  roomId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  guestId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cardUid?: string;

  @ApiPropertyOptional({ enum: KEYCARD_TYPES, default: 'PHYSICAL' })
  @IsOptional()
  @IsIn(KEYCARD_TYPES)
  type?: (typeof KEYCARD_TYPES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  validUntil?: string;
}
