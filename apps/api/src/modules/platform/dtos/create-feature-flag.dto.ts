import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

const FEATURE_SCOPE_TYPES = ['MODULE', 'SUB_FEATURE', 'LIMIT'] as const;
const FEATURE_ROLLOUT_STAGES = ['INTERNAL', 'BETA', 'GA', 'DEPRECATED'] as const;

export class CreateFeatureFlagDto {
  @ApiProperty({
    description: 'Stable machine key for entitlement resolution and feature gating.',
    example: 'module_housekeeping',
  })
  @IsString()
  @MaxLength(120)
  @Matches(/^[a-z0-9_]+$/, {
    message: 'Feature key must use lowercase letters, numbers, and underscores only.',
  })
  key!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  category?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  defaultEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  planRequired?: string | null;

  @ApiPropertyOptional({ enum: FEATURE_SCOPE_TYPES, default: 'MODULE' })
  @IsOptional()
  @IsIn(FEATURE_SCOPE_TYPES)
  scopeType?: (typeof FEATURE_SCOPE_TYPES)[number];

  @ApiPropertyOptional({ enum: FEATURE_ROLLOUT_STAGES, default: 'GA' })
  @IsOptional()
  @IsIn(FEATURE_ROLLOUT_STAGES)
  rolloutStage?: (typeof FEATURE_ROLLOUT_STAGES)[number];
}
