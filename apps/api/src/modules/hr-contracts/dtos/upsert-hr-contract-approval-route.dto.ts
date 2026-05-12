import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

class HrContractApprovalRouteStepDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  stepOrder!: number;

  @ApiProperty()
  @IsString()
  role!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userId?: string;
}

export class UpsertHrContractApprovalRouteDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contractType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ type: [HrContractApprovalRouteStepDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HrContractApprovalRouteStepDto)
  steps!: HrContractApprovalRouteStepDto[];
}
