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
import { PrepStation } from '@prisma/client';
import { IngredientDto } from '../ingredient.dto';
import { IsSafeImageReference } from '../../../../common/utils/image-input.utils';
import { IsEnum } from 'class-validator';

export class CreateProductDto {
  @ApiProperty() @IsString() name!: string;
  @ApiProperty() @Type(() => Number) @IsNumber() @Min(0) price!: number;
  @ApiProperty() @IsString() categoryId!: string;
  @ApiPropertyOptional() @IsString() @IsOptional() sku?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() description?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() unit?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() @IsSafeImageReference() image?: string;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() isAvailable?: boolean;
  @ApiPropertyOptional() @Type(() => Number) @IsNumber() @Min(0) @IsOptional() stock?: number;
  @ApiProperty({ default: 'PHYSICAL' }) @IsString() type!: string; // PHYSICAL | SERVICE | BUNDLE
  @ApiPropertyOptional({ enum: PrepStation, default: PrepStation.NONE })
  @IsEnum(PrepStation)
  @IsOptional()
  prepStation?: PrepStation;
  @ApiPropertyOptional({ type: [IngredientDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IngredientDto)
  @IsOptional()
  ingredients?: IngredientDto[];
}
