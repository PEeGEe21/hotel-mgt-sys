import { IsBoolean, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SetStaffPinDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @Matches(/^\d{4,6}$/)
  @MaxLength(6)
  pin?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  generate?: boolean;
}
