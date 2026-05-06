import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PrepStation, PrepStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsArray, IsEnum, IsOptional } from 'class-validator';

function normalizeStatuses(value: unknown): PrepStatus[] | undefined {
  if (!value) return undefined;

  const values = Array.isArray(value)
    ? value
    : String(value)
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);

  return values as PrepStatus[];
}

export class PrepBoardQueryDto {
  @ApiProperty({ enum: PrepStation })
  @IsEnum(PrepStation)
  station!: PrepStation;

  @ApiPropertyOptional({ enum: PrepStatus, isArray: true })
  @Transform(({ value }) => normalizeStatuses(value))
  @IsArray()
  @IsEnum(PrepStatus, { each: true })
  @IsOptional()
  statuses?: PrepStatus[];
}
