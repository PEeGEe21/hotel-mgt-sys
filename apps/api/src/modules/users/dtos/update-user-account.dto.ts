import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { Role } from '@prisma/client';

export class UpdateUserAccountDto {
  @ApiPropertyOptional() @IsEmail() @IsOptional() email?: string;
  @ApiPropertyOptional() role?: Role;
  @ApiPropertyOptional() isActive?: boolean;

  @ApiPropertyOptional() @IsString() @MinLength(2) @IsOptional() firstName?: string;
  @ApiPropertyOptional() @IsString() @MinLength(2) @IsOptional() lastName?: string;
  @ApiPropertyOptional() @IsString() @MinLength(2) @IsOptional() department?: string;
  @ApiPropertyOptional() @IsString() @MinLength(2) @IsOptional() position?: string;
  @ApiPropertyOptional() @IsString() @MinLength(2) @IsOptional() employeeCode?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() phone?: string;
}
