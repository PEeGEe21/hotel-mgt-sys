import { IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ProductFilterDto {
  @ApiPropertyOptional() @IsOptional() search?: string;
  @ApiPropertyOptional() @IsOptional() category?: string;
  @ApiPropertyOptional() @IsOptional() type?: string;
  @ApiPropertyOptional() @IsOptional() isAvailable?: string;
  @ApiPropertyOptional() @IsOptional() @Transform(({ value }) => parseInt(value)) page?: number;
  @ApiPropertyOptional() @IsOptional() @Transform(({ value }) => parseInt(value)) limit?: number;
}
