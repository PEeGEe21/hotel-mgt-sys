import { IsString, IsOptional, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class IngredientDto {
  @ApiProperty() @IsString() inventoryItemId!: string;
  @ApiProperty() @IsNumber() @Min(0) quantity!: number;
  @ApiPropertyOptional() @IsString() @IsOptional() unit?: string;
}
