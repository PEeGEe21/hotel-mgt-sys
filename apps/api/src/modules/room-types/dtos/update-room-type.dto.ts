import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class UpdateRoomTypeDto {
  @ApiPropertyOptional() @IsString() @MinLength(2) @IsOptional() name?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() description?: string;
  @ApiPropertyOptional() @IsNumber() @Min(0) @IsOptional() baseRate?: number;
  @ApiPropertyOptional() @IsNumber() @Min(1) @IsOptional() capacity?: number;
  @ApiPropertyOptional() @IsString() @IsOptional() beds?: string;
  @ApiPropertyOptional({ type: [String] }) @IsArray() @IsOptional() amenities?: string[];
  @ApiPropertyOptional() @IsString() @IsOptional() color?: string;
}
