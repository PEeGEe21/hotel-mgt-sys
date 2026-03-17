import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateInventoryItemDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  @MinLength(1)
  sku!: string;

  @IsString()
  @MinLength(1)
  category!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @MinLength(1)
  unit!: string;

  @IsNumber()
  quantity!: number;

  @IsNumber()
  minStock!: number;

  @IsNumber()
  costPrice!: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  sellPrice?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  supplier?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  location?: string;
}
