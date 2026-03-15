import { IsString, IsInt, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFloorDto {
  @ApiProperty({ example: 'Ground Floor' }) @IsString() name!: string;
  @ApiProperty({ example: 1 }) @IsInt() level!: number;
  @ApiPropertyOptional() @IsString() @IsOptional() description?: string;
}
