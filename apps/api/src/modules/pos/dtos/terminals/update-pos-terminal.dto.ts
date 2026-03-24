import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdatePosTerminalDto {
  @ApiPropertyOptional() @IsString() @MinLength(2) @IsOptional() name?: string;
  @ApiPropertyOptional() @IsString() @MinLength(2) @IsOptional() location?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() terminalGroupId?: string;
  @ApiPropertyOptional() @IsString() @MinLength(2) @IsOptional() device?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() status?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() staffId?: string | null;
}
