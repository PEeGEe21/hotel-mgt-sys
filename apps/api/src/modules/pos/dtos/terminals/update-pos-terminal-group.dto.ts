import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdatePosTerminalGroupDto {
  // @IsString()
  // @MinLength(1)
  // from!: string;

  // @IsString()
  // @MinLength(1)
  // to!: string;

  @ApiPropertyOptional() @IsString() @IsOptional() name?: string;
  @ApiPropertyOptional() @IsInt() @IsOptional() level?: number;
  @ApiPropertyOptional() @IsString() @IsOptional() description?: string;
}
