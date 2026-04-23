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
export class PayOrderDto {
  @ApiProperty() @IsString() method!: string; // CASH | CARD | TRANSFER | ROOM_CHARGE
  @ApiPropertyOptional() @IsNumber() @Min(0) @IsOptional() amountTendered?: number; // for cash change calculation
  @ApiPropertyOptional() @IsString() @IsOptional() reference?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() note?: string;
}
