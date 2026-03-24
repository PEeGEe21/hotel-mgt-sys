// ─── DTOs ─────────────────────────────────────────────────────────────────────

import { IsString, IsOptional, IsEnum, IsDateString, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class CreateStaffDto {
  @ApiProperty() @IsString() firstName!: string;
  @ApiProperty() @IsString() lastName!: string;
  @ApiProperty() @IsString() email!: string;
  @ApiProperty() @IsString() department!: string;
  @ApiProperty() @IsString() position!: string;
  @ApiProperty({ enum: Role })
  @IsEnum(Role)
  role!: Role;
  @ApiProperty() @IsDateString() hireDate!: string;
  @ApiPropertyOptional() @IsString() @IsOptional() phone?: string;
  @ApiPropertyOptional() @IsNumber() @Min(0) @IsOptional() salary?: number;
}
