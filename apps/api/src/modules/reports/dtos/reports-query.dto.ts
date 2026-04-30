import { Transform } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, IsString, Max, Min, ValidateIf } from 'class-validator';

export class ReportsRangeQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

export class ReportsListQueryDto extends ReportsRangeQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}

export class OutstandingFoliosQueryDto extends ReportsListQueryDto {}

export const REPORT_EXPORT_SCOPES = ['tab', 'full'] as const;
export const REPORT_EXPORT_FORMATS = ['excel', 'pdf'] as const;
export const REPORT_EXPORT_TYPES = [
  'overview',
  'revenue',
  'expenses',
  'occupancy',
  'guests',
  'staff',
  'inventory',
] as const;

export type ReportExportScope = (typeof REPORT_EXPORT_SCOPES)[number];
export type ReportExportFormat = (typeof REPORT_EXPORT_FORMATS)[number];
export type ReportExportType = (typeof REPORT_EXPORT_TYPES)[number];

export class ReportsExportQueryDto extends ReportsRangeQueryDto {
  @IsIn(REPORT_EXPORT_SCOPES)
  scope!: ReportExportScope;

  @IsIn(REPORT_EXPORT_FORMATS)
  format!: ReportExportFormat;

  @ValidateIf((value: ReportsExportQueryDto) => value.scope === 'tab')
  @IsString()
  @IsIn(REPORT_EXPORT_TYPES)
  report?: ReportExportType;
}
