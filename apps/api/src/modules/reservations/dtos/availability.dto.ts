import { IsOptional, IsInt, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class AvailabilityDto {
  @ApiProperty() @IsDateString() checkIn!: string;
  @ApiProperty() @IsDateString() checkOut!: string;
  @ApiPropertyOptional() @IsOptional() type?: string;
  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  minGuests?: number;
}
