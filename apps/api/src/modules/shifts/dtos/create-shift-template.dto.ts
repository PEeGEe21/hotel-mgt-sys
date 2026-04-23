import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateShiftTemplateDto {
  @ApiProperty() @IsString() @MinLength(2) name!: string;
  @ApiProperty() @IsString() startTime!: string;
  @ApiProperty() @IsString() endTime!: string;
  @ApiPropertyOptional({ type: [String] }) @IsArray() @IsString({ each: true }) @IsOptional() days?: string[];
  @ApiPropertyOptional() @IsString() @IsOptional() color?: string;
}
