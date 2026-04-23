import { IsArray, IsBoolean, IsInt, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateFacilityDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsInt() capacity?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsString() openTime?: string;
  @IsOptional() @IsString() closeTime?: string;
  @IsOptional() @IsObject() operatingSchedule?: Record<string, unknown>;
  @IsOptional() @IsNumber() baseRate?: number;
  @IsOptional() @IsString() rateUnit?: string;
  @IsOptional() @IsBoolean() requiresApproval?: boolean;
  @IsOptional() @IsInt() minDurationMins?: number;
  @IsOptional() @IsInt() maxDurationMins?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) images?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) amenities?: string[];
  @IsOptional() @IsString() typeId?: string;
  @IsOptional() @IsString() locationId?: string;
  @IsOptional() @IsString() departmentId?: string;
}
