import { IsArray, IsDateString, IsInt, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateMaintenanceRequestDto {
  @IsOptional() @IsString() facilityId?: string;
  @IsOptional() @IsString() roomId?: string;
  @IsOptional() @IsString() requestNo?: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() priority?: string;
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
  @IsOptional() @IsArray() @IsString({ each: true }) images?: string[];
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() inspectionId?: string;
  @IsOptional() @IsString() verificationInspectionId?: string;
}
