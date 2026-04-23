import { IsString, IsArray, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskPriority } from '@prisma/client';

export class BulkCreateDto {
  @ApiProperty() @IsArray() @IsString({ each: true }) roomIds!: string[];
  @ApiProperty() @IsString() type!: string;
  @ApiPropertyOptional({ enum: TaskPriority })
  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority;
}
