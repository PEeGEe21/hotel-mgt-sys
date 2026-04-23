import { IsBoolean, IsDateString, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateFacilityRequisitionDto {
  @IsOptional() @IsString() facilityId?: string;
  @IsOptional() @IsString() requestedBy?: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() priority?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsObject() items?: Record<string, unknown>;
  @IsOptional() @IsNumber() estimatedTotal?: number;
  @IsOptional() @IsString() approvedBy?: string;
  @IsOptional() @IsDateString() approvedAt?: string;
  @IsOptional() @IsDateString() fulfilledAt?: string;
  @IsOptional() @IsString() rejectionReason?: string;
  @IsOptional() @IsBoolean() inventoryLinked?: boolean;
}
