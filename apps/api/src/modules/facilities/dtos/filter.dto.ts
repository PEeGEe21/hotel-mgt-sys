import { Transform } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class FilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class FacilityListFilterDto extends FilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;
}

export class FacilityActivityFilterDto extends FilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  facilityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  priority?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}

export class FacilityBookingFilterDto extends FacilityActivityFilterDto {}

export class FacilityRequisitionFilterDto extends FacilityActivityFilterDto {}

export class FacilityMaintenanceFilterDto extends FacilityActivityFilterDto {}

export class FacilityComplaintFilterDto extends FacilityActivityFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reporterType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reporterStaffId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reporterGuestId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  channel?: string;
}

export class FacilityInspectionFilterDto extends FacilityActivityFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  inspectionType?: string;
}
