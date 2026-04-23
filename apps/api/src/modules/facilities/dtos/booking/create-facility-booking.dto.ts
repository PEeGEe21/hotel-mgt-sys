import { IsBoolean, IsDateString, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateFacilityBookingDto {
  @IsString() facilityId!: string;
  @IsOptional() @IsString() reservationId?: string;
  @IsOptional() @IsString() guestId?: string;
  @IsString() guestName!: string;
  @IsOptional() @IsString() roomNo?: string;
  @IsDateString() startTime!: string;
  @IsDateString() endTime!: string;
  @IsOptional() @IsInt() durationMins?: number;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsInt() pax?: number;
  @IsNumber() amount!: number;
  @IsString() chargeType!: string;
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
  @IsOptional() @IsString() createdBy?: string;
}
