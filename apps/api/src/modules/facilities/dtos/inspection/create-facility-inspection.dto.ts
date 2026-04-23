import { IsDateString, IsInt, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateFacilityInspectionDto {
  @IsOptional() @IsString() inspectionNo?: string;
  @IsString() inspectionType!: string;
  @IsOptional() @IsString() scheduledBy?: string;
  @IsOptional() @IsString() inspectorName?: string;
  @IsOptional() @IsString() inspectorOrganization?: string;
  @IsOptional() @IsString() facilityId?: string;
  @IsOptional() @IsString() area?: string;
  @IsDateString() scheduledAt!: string;
  @IsOptional() @IsObject() checklist?: Record<string, unknown>;
  @IsOptional() @IsString() findings?: string;
  @IsOptional() @IsInt() score?: number;
  @IsOptional() @IsString() status?: string;
}
