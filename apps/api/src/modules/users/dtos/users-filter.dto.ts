import { IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class UsersFilterDto {
  @ApiPropertyOptional() @IsOptional() search?: string;
  @ApiPropertyOptional() @IsOptional() role?: string;
  @ApiPropertyOptional() @IsOptional() @Transform(({ value }) => parseInt(value)) page?: number;
  @ApiPropertyOptional() @IsOptional() @Transform(({ value }) => parseInt(value)) limit?: number;
}
