import { IsArray, IsDateString, IsInt, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';
import { IsSafeImageReference } from '../../../../common/utils/image-input.utils';

export class CreateMaintenanceRequestDto {
  @IsOptional() @IsString() facilityId?: string;
  @IsOptional() @IsString() roomId?: string;
  @IsOptional() @IsString() requestNo?: string;
  @IsString() title!: string;
  @IsString() description!: string;
  @IsString() category!: string;
  @IsString() priority!: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() reportedBy?: string;
  @IsOptional() @IsString() assignedTo?: string;
  @IsOptional() @IsDateString() assignedAt?: string;
  @IsOptional() @IsDateString() startedAt?: string;
  @IsOptional() @IsDateString() resolvedAt?: string;
  @IsOptional() @IsDateString() closedAt?: string;
  @IsOptional() @IsInt() estimatedMins?: number;
  @IsOptional() @IsInt() actualMins?: number;
  @IsOptional() @IsObject() partsUsed?: Record<string, unknown>;
  @IsOptional() @IsNumber() totalCost?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) @IsSafeImageReference({}, { each: true }) images?: string[];
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() inspectionId?: string;
  @IsOptional() @IsString() verificationInspectionId?: string;
}
