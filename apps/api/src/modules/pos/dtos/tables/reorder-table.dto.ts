import { IsString, IsOptional, IsInt, IsBoolean, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class ReorderTablesDto {
  @ApiProperty({ type: [Object], description: 'Array of { id, sortOrder }' })
  items!: { id: string; sortOrder: number }[];
}
