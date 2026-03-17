import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateShiftTemplateDto {
  @ApiPropertyOptional() @IsString() @MinLength(2) @IsOptional() name?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() startTime?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() endTime?: string;
  @ApiPropertyOptional({ type: [String] }) @IsArray() @IsOptional() days?: string[];
  @ApiPropertyOptional() @IsString() @IsOptional() color?: string;
}
