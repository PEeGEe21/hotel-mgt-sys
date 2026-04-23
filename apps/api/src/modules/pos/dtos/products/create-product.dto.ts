import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IngredientDto } from '../ingredient.dto';

export class CreateProductDto {
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @IsNumber() @Min(0) price!: number;
  @ApiProperty() @IsString() categoryId!: string;
  @ApiPropertyOptional() @IsString() @IsOptional() sku?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() description?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() unit?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() image?: string;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() isAvailable?: boolean;
  @ApiPropertyOptional() @IsNumber() @Min(0) @IsOptional() stock?: number;
  @ApiProperty({ default: 'PHYSICAL' }) @IsString() type!: string; // PHYSICAL | SERVICE | BUNDLE
  @ApiPropertyOptional({ type: [IngredientDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IngredientDto)
  @IsOptional()
  ingredients?: IngredientDto[];
}
