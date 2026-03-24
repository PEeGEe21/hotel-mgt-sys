
import { IsString, IsOptional, IsInt, IsBoolean, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class UpdateTableDto {
  @ApiPropertyOptional()  @IsString()   @IsOptional() name?:      string;
  @ApiPropertyOptional()  @IsString()   @IsOptional() section?:   string;
  @ApiPropertyOptional()  @IsInt() @Min(1) @IsOptional() capacity?: number;
  @ApiPropertyOptional()  @IsInt()      @IsOptional() sortOrder?: number;
  @ApiPropertyOptional()  @IsBoolean()  @IsOptional() isActive?:  boolean;
}