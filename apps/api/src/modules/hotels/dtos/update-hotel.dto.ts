import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateHotelCronSettingsDto {
  @ApiPropertyOptional() @IsBoolean() @IsOptional() attendanceAbsenceScanEnabled?: boolean;
  @ApiPropertyOptional() @IsInt() @Min(0) @Max(23) @IsOptional() attendanceAbsenceScanHour?: number;
  @ApiPropertyOptional() @IsInt() @Min(0) @Max(59) @IsOptional() attendanceAbsenceScanMinute?: number;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() checkoutDueScanEnabled?: boolean;
  @ApiPropertyOptional() @IsInt() @Min(0) @Max(23) @IsOptional() checkoutDueScanHour?: number;
  @ApiPropertyOptional() @IsInt() @Min(0) @Max(59) @IsOptional() checkoutDueScanMinute?: number;
}

export class UpdateHotelDto {
  @ApiPropertyOptional() @IsString() @IsOptional() name?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() address?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() city?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() state?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() country?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() phone?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() email?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() website?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() logo?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() description?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() currency?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() timezone?: string;
  @ApiPropertyOptional() @IsNumber() @IsOptional() taxRate?: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() latitude?: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() longitude?: number;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() geofenceEnabled?: boolean;
  @ApiPropertyOptional() @IsNumber() @Min(10) @IsOptional() geofenceRadiusMeters?: number;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() attendancePinRequired?: boolean;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() attendanceKioskEnabled?: boolean;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() attendancePersonalEnabled?: boolean;
  @ApiPropertyOptional() @IsInt() @Min(0) @Max(23) @IsOptional() defaultCheckoutHour?: number;
  @ApiPropertyOptional() @IsInt() @Min(0) @Max(59) @IsOptional() defaultCheckoutMinute?: number;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() guestCheckoutReminderEnabled?: boolean;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() autoCreateCheckoutHousekeepingTasks?: boolean;
  @ApiPropertyOptional({ type: UpdateHotelCronSettingsDto }) @ValidateNested() @Type(() => UpdateHotelCronSettingsDto) @IsOptional() cronSettings?: UpdateHotelCronSettingsDto;
}
