import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ReservationStatus } from '@prisma/client';

export const CHECKOUT_TIMING_FILTERS = ['dueTomorrow', 'dueToday', 'overdue'] as const;
export type CheckoutTimingFilter = (typeof CHECKOUT_TIMING_FILTERS)[number];

export class ReservationFilterDto {
  @ApiPropertyOptional({ enum: ReservationStatus })
  @IsEnum(ReservationStatus)
  @IsOptional()
  status?: ReservationStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dateFrom?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dateTo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() roomId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() guestId?: string;
  @ApiPropertyOptional({ enum: CHECKOUT_TIMING_FILTERS })
  @IsOptional()
  @IsString()
  checkoutTiming?: CheckoutTimingFilter;
  @ApiPropertyOptional() @IsOptional() @Transform(({ value }) => parseInt(value, 10)) @IsInt() @Min(1) page?: number;
  @ApiPropertyOptional() @IsOptional() @Transform(({ value }) => parseInt(value, 10)) @IsInt() @Min(1) @Max(100) limit?: number;
}
