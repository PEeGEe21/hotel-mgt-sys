import { Transform } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

// ─── DTOs ────────────
export class OrderFilterDto {
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() type?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() billing?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() posTerminalId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() staffId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() tableNo?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dateFrom?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dateTo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @Transform(({ value }) => parseInt(value, 10)) @IsInt() @Min(1) page?: number;
  @ApiPropertyOptional() @IsOptional() @Transform(({ value }) => parseInt(value, 10)) @IsInt() @Min(1) @Max(100) limit?: number;
}
