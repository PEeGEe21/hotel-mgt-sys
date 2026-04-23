import { IsBoolean, IsDateString, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateFacilityBookingDto {
  @IsOptional() @IsString() facilityId?: string;
  @IsOptional() @IsString() reservationId?: string;
  @IsOptional() @IsString() guestId?: string;
  @IsOptional() @IsString() guestName?: string;
  @IsOptional() @IsString() roomNo?: string;
  @IsOptional() @IsDateString() startTime?: string;
  @IsOptional() @IsDateString() endTime?: string;
  @IsOptional() @IsInt() durationMins?: number;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsInt() pax?: number;
  @IsOptional() @IsNumber() amount?: number;
  @IsOptional() @IsString() chargeType?: string;
  @IsOptional() @IsBoolean() isPaid?: boolean;
  @IsOptional() @IsString() invoiceId?: string;
  @IsOptional() @IsString() approvedBy?: string;
  @IsOptional() @IsDateString() approvedAt?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsDateString() cancelledAt?: string;
  @IsOptional() @IsString() cancelReason?: string;
  @IsOptional() @IsString() refundMethod?: string;
  @IsOptional() @IsString() creditNoteId?: string;
  @IsOptional() @IsString() refundId?: string;
}
