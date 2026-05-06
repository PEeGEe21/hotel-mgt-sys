import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsObject, IsOptional, Max, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class RealtimeStaleThresholdsDto {
  @ApiPropertyOptional() @IsInt() @Min(30) @Max(3600) @IsOptional() notifications?: number;
  @ApiPropertyOptional() @IsInt() @Min(30) @Max(3600) @IsOptional() posOrders?: number;
  @ApiPropertyOptional() @IsInt() @Min(30) @Max(3600) @IsOptional() prep?: number;
  @ApiPropertyOptional() @IsInt() @Min(30) @Max(3600) @IsOptional() housekeeping?: number;
  @ApiPropertyOptional() @IsInt() @Min(30) @Max(3600) @IsOptional() facilities?: number;
  @ApiPropertyOptional() @IsInt() @Min(30) @Max(3600) @IsOptional() presence?: number;
}

export class UpdateRealtimeSettingsDto {
  @ApiPropertyOptional() @IsBoolean() @IsOptional() alertsEnabled?: boolean;
  @ApiPropertyOptional() @IsInt() @Min(5) @Max(1440) @IsOptional() alertCooldownMinutes?: number;
  @ApiPropertyOptional() @IsInt() @Min(1) @Max(365) @IsOptional() retentionDays?: number;
  @ApiPropertyOptional({ type: RealtimeStaleThresholdsDto })
  @IsObject()
  @ValidateNested()
  @Type(() => RealtimeStaleThresholdsDto)
  @IsOptional()
  staleThresholds?: RealtimeStaleThresholdsDto;
}
