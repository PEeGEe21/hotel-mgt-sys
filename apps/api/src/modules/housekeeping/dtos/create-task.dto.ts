// ─── DTOs ─────────────────────────────────────────────────────────────────────
import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskPriority } from '@prisma/client';

export class CreateTaskDto {
  @ApiProperty() @IsString() roomId!: string;
  @ApiProperty() @IsString() type!: string; // CLEANING | TURNDOWN | MAINTENANCE | INSPECTION | AMENITY
  @ApiPropertyOptional({ enum: TaskPriority })
  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority;
  @ApiPropertyOptional() @IsString() @IsOptional() assignedTo?: string; // staffId
  @ApiPropertyOptional() @IsString() @IsOptional() notes?: string;
  @ApiPropertyOptional() @IsDateString() @IsOptional() dueBy?: string;
  @ApiPropertyOptional() @IsDateString() @IsOptional() scheduledAt?: string;
}