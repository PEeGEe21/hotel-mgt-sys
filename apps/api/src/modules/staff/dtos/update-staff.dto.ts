
import { IsString, IsOptional, IsEnum, IsNumber, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class UpdateStaffDto {
  @ApiPropertyOptional() @IsString()  @IsOptional() firstName?:   string;
  @ApiPropertyOptional() @IsString()  @IsOptional() lastName?:    string;
  @ApiPropertyOptional() @IsString()  @IsOptional() email?:       string;
  @ApiPropertyOptional() @IsString()  @IsOptional() department?:  string;
  @ApiPropertyOptional() @IsString()  @IsOptional() position?:    string;
  @ApiPropertyOptional({ enum: Role }) @IsEnum(Role) @IsOptional() role?: Role;
  @ApiPropertyOptional() @IsString()  @IsOptional() phone?:       string;
  @ApiPropertyOptional() @IsNumber() @Min(0) @IsOptional() salary?: number;
}