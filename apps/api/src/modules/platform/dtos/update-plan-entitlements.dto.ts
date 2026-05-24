import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class UpdatePlanEntitlementItemDto {
  @ApiProperty()
  @IsString()
  @MaxLength(120)
  flagKey!: string;

  @ApiProperty()
  @IsBoolean()
  enabled!: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  limitValue?: string | null;
}

export class UpdatePlanEntitlementsDto {
  @ApiProperty({ type: [UpdatePlanEntitlementItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdatePlanEntitlementItemDto)
  entitlements!: UpdatePlanEntitlementItemDto[];
}
