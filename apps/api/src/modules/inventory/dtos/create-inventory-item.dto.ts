import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

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
  @Min(0)
  quantity!: number;

  @IsNumber()
  @Min(0)
  minStock!: number;

  @IsNumber()
  @Min(0)
  costPrice!: number;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
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
