import { IsString, IsNumber, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddFolioItemDto {
  @ApiProperty() @IsString() description!: string;
  @ApiProperty() @IsNumber() amount!: number;
  @ApiProperty() @IsString() category!: string;
  @ApiPropertyOptional() @IsInt() @Min(1) @IsOptional() quantity?: number;
}