import { IsDateString, IsOptional, IsString } from 'class-validator';

export class UpdateFacilityComplaintDto {
  @IsOptional() @IsString() complaintNo?: string;
  @IsOptional() @IsString() reporterType?: string;
  @IsOptional() @IsString() reporterStaffId?: string;
  @IsOptional() @IsString() reporterGuestId?: string;
  @IsOptional() @IsString() channel?: string;
  @IsOptional() @IsString() facilityId?: string;
  @IsOptional() @IsString() roomId?: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() priority?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() maintenanceRequestId?: string;
  @IsOptional() @IsDateString() resolvedAt?: string;
}
