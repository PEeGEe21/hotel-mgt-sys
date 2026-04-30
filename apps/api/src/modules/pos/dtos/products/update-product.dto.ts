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
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IngredientDto } from '../ingredient.dto';
import { IsSafeImageReference } from '../../../../common/utils/image-input.utils';

export class UpdateProductDto {
  @ApiPropertyOptional() @IsString() @IsOptional() name?: string;
  @ApiPropertyOptional() @IsNumber() @IsOptional() price?: number;
  @ApiPropertyOptional() @IsString() @IsOptional() categoryId?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() description?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() unit?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() @IsSafeImageReference() image?: string;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() isAvailable?: boolean;
  @ApiPropertyOptional() @IsNumber() @Min(0) @IsOptional() stock?: number;
  @ApiPropertyOptional() @IsString() @IsOptional() type?: string;
  @ApiPropertyOptional({ type: [IngredientDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IngredientDto)
  @IsOptional()
  ingredients?: IngredientDto[];
}
