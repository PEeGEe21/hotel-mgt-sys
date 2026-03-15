import { IsString, IsNumber, IsOptional, IsInt, Min, IsDateString, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentStatus } from '@prisma/client';

export class UpdateReservationDto {
  @ApiPropertyOptional() @IsDateString() @IsOptional() checkIn?: string;
  @ApiPropertyOptional() @IsDateString() @IsOptional() checkOut?: string;
  @ApiPropertyOptional() @IsInt() @Min(1) @IsOptional() adults?: number;
  @ApiPropertyOptional() @IsInt() @Min(0) @IsOptional() children?: number;
  @ApiPropertyOptional() @IsString() @IsOptional() source?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() specialRequests?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() notes?: string;
  @ApiPropertyOptional() @IsNumber() @IsOptional() totalAmount?: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() paidAmount?: number;
  @ApiPropertyOptional({ enum: PaymentStatus })
  @IsEnum(PaymentStatus)
  @IsOptional()
  paymentStatus?: PaymentStatus;
}
