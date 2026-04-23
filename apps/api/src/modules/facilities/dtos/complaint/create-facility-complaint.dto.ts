import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateFacilityComplaintDto {
  @IsOptional() @IsString() complaintNo?: string;
  @IsString() reporterType!: string;
  @IsOptional() @IsString() reporterStaffId?: string;
  @IsOptional() @IsString() reporterGuestId?: string;
  @IsString() channel!: string;
  @IsOptional() @IsString() facilityId?: string;
  @IsOptional() @IsString() roomId?: string;
  @IsString() title!: string;
  @IsString() description!: string;
  @IsString() category!: string;
  @IsString() priority!: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() maintenanceRequestId?: string;
  @IsOptional() @IsDateString() resolvedAt?: string;
}
