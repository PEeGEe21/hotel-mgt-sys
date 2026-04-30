import { Type } from 'class-transformer';
import {
  IsArray,
  ArrayMinSize,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsSafeImageReference } from '../../../common/utils/image-input.utils';

export class UpdateHotelCronSettingsDto {
  @ApiPropertyOptional() @IsBoolean() @IsOptional() attendanceAbsenceScanEnabled?: boolean;
  @ApiPropertyOptional() @IsInt() @Min(0) @Max(23) @IsOptional() attendanceAbsenceScanHour?: number;
  @ApiPropertyOptional() @IsInt() @Min(0) @Max(59) @IsOptional() attendanceAbsenceScanMinute?: number;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() checkoutDueScanEnabled?: boolean;
  @ApiPropertyOptional() @IsInt() @Min(0) @Max(23) @IsOptional() checkoutDueScanHour?: number;
  @ApiPropertyOptional() @IsInt() @Min(0) @Max(59) @IsOptional() checkoutDueScanMinute?: number;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() housekeepingFollowUpScanEnabled?: boolean;
  @ApiPropertyOptional() @IsInt() @Min(0) @Max(23) @IsOptional() housekeepingFollowUpScanHour?: number;
  @ApiPropertyOptional() @IsInt() @Min(0) @Max(59) @IsOptional() housekeepingFollowUpScanMinute?: number;
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
  @ApiPropertyOptional() @IsString() @IsOptional() @IsSafeImageReference({ maxBytes: 2 * 1024 * 1024 }) logo?: string;
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
  @ApiPropertyOptional({ type: [Number] }) @IsArray() @ArrayMinSize(1) @IsInt({ each: true }) @Min(0, { each: true }) @Max(30, { each: true }) @IsOptional() guestCheckoutReminderLeadDays?: number[];
  @ApiPropertyOptional() @IsBoolean() @IsOptional() autoCreateCheckoutHousekeepingTasks?: boolean;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() housekeepingFollowUpEnabled?: boolean;
  @ApiPropertyOptional() @IsInt() @Min(1) @Max(168) @IsOptional() housekeepingFollowUpGraceHours?: number;
  @ApiPropertyOptional({ type: UpdateHotelCronSettingsDto }) @ValidateNested() @Type(() => UpdateHotelCronSettingsDto) @IsOptional() cronSettings?: UpdateHotelCronSettingsDto;
}
