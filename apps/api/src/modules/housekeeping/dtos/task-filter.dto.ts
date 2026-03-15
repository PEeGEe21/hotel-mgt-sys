import { IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { TaskPriority, TaskStatus } from '@prisma/client';

export class TaskFilterDto {
  @ApiPropertyOptional({ enum: TaskStatus }) @IsEnum(TaskStatus) @IsOptional() status?: TaskStatus;
  @ApiPropertyOptional({ enum: TaskPriority })
  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority;
  @ApiPropertyOptional() @IsOptional() type?: string;
  @ApiPropertyOptional() @IsOptional() assignedTo?: string;
  @ApiPropertyOptional() @IsOptional() roomId?: string;
  @ApiPropertyOptional() @IsOptional() floorId?: string;
  @ApiPropertyOptional() @IsOptional() search?: string;
  @ApiPropertyOptional() @IsOptional() @Transform(({ value }) => parseInt(value)) page?: number;
  @ApiPropertyOptional() @IsOptional() @Transform(({ value }) => parseInt(value)) limit?: number;
}
