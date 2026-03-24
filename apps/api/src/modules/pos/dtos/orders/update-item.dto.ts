import {
  IsString,
  IsOptional,
  IsInt,
  IsNumber,
  IsArray,
  IsBoolean,
  Min,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ─── DTOs ────────────
export class UpdateItemDto {
  @ApiPropertyOptional() @IsInt() @Min(0) @IsOptional() quantity?: number;
  @ApiPropertyOptional() @IsString() @IsOptional() note?: string;
}
