import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateRoomTypeDto {
  @ApiProperty() @IsString() @MinLength(2) name!: string;
  @ApiPropertyOptional() @IsString() @IsOptional() description?: string;
  @ApiPropertyOptional() @IsNumber() @Min(0) @IsOptional() baseRate?: number;
  @ApiPropertyOptional() @IsNumber() @Min(1) @IsOptional() capacity?: number;
  @ApiPropertyOptional() @IsString() @IsOptional() beds?: string;
  @ApiPropertyOptional({ type: [String] }) @IsArray() @IsString({ each: true }) @IsOptional() amenities?: string[];
  @ApiPropertyOptional() @IsString() @IsOptional() color?: string;
}
