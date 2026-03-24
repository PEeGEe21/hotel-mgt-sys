import { IsString, IsInt, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePosTerminalGroupDto {
  @ApiProperty({ example: 'Bar' }) @IsString() name!: string;
  @ApiProperty({ example: 1 }) @IsInt() level!: number;
  @ApiPropertyOptional() @IsString() @IsOptional() description?: string;
}
