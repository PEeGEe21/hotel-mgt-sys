import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreatePlatformHotelOnboardingDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  hotelName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  domain?: string;

  @ApiProperty()
  @IsString()
  @MinLength(5)
  @MaxLength(240)
  address!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  city!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  state?: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  country!: string;

  @ApiProperty()
  @IsString()
  @MinLength(5)
  @MaxLength(40)
  hotelPhone!: string;

  @ApiProperty()
  @IsEmail()
  @MaxLength(160)
  hotelEmail!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  website?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  timezone?: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  adminFirstName!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  adminLastName!: string;

  @ApiProperty()
  @IsEmail()
  @MaxLength(160)
  adminEmail!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  adminPhone?: string;
}
