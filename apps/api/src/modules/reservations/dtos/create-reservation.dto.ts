import { IsString, IsNumber, IsOptional, IsInt, Min, IsDateString, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BookingType } from '@prisma/client';

export class CreateReservationDto {
  @ApiProperty() @IsString() guestId!: string;
  @ApiProperty() @IsString() roomId!: string;
  @ApiProperty() @IsDateString() checkIn!: string;
  @ApiProperty() @IsDateString() checkOut!: string;
  @ApiPropertyOptional() @IsInt() @Min(1) @IsOptional() adults?: number;
  @ApiPropertyOptional() @IsInt() @Min(0) @IsOptional() children?: number;
  @ApiPropertyOptional() @IsString() @IsOptional() source?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() specialRequests?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() notes?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() companyId?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() groupBookingId?: string;
  @ApiPropertyOptional({ enum: BookingType })
  @IsEnum(BookingType)
  @IsOptional()
  bookingType?: BookingType;
  @ApiPropertyOptional() @IsNumber() @Min(0) @IsOptional() totalAmount?: number;
}
