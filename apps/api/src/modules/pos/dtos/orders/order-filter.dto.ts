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
export class OrderFilterDto {
  @ApiPropertyOptional() @IsOptional() status?: string;
  @ApiPropertyOptional() @IsOptional() type?: string;
  @ApiPropertyOptional() @IsOptional() posTerminalId?: string;
  @ApiPropertyOptional() @IsOptional() staffId?: string;
  @ApiPropertyOptional() @IsOptional() tableNo?: string;
  @ApiPropertyOptional() @IsOptional() dateFrom?: string;
  @ApiPropertyOptional() @IsOptional() dateTo?: string;
  @ApiPropertyOptional() @IsOptional() search?: string;
  @ApiPropertyOptional() @IsOptional() @Transform(({ value }) => parseInt(value)) page?: number;
  @ApiPropertyOptional() @IsOptional() @Transform(({ value }) => parseInt(value)) limit?: number;
}