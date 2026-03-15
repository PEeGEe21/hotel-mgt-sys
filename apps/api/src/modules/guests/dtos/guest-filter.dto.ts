import { IsString, IsOptional, IsBoolean, IsEmail, IsEnum, IsInt } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';


export class GuestFilterDto {
  @ApiPropertyOptional() @IsOptional() search?: string;
  @ApiPropertyOptional() @IsOptional() nationality?: string;
  @ApiPropertyOptional() @IsOptional() @Transform(({ value }) => value === 'true') isVip?: boolean;
  @ApiPropertyOptional() @IsOptional() status?: 'in_house' | 'reserved' | 'checked_out';
  @ApiPropertyOptional() @IsOptional() stayType?: 'full_time' | 'short_time';
  @ApiPropertyOptional() @IsOptional() @Transform(({ value }) => parseInt(value)) page?: number;
  @ApiPropertyOptional() @IsOptional() @Transform(({ value }) => parseInt(value)) limit?: number;
}
