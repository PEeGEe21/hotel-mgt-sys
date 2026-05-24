import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTenantSupportCaseDto {
  @ApiProperty()
  @IsString()
  @MaxLength(120)
  category!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  priority?: string;

  @ApiProperty()
  @IsString()
  @MaxLength(200)
  subject!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(5000)
  description!: string;

  @ApiPropertyOptional({
    description:
      'Optional structured tenant request type such as PLAN_UPGRADE, BILLING_CONTACT_CHANGE, or FEATURE_ACTIVATION.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  requestType?: string;

  @ApiPropertyOptional({
    description: 'Optional structured request context captured alongside the support case.',
    type: Object,
  })
  @IsOptional()
  @IsObject()
  requestPayload?: Record<string, unknown>;
}
