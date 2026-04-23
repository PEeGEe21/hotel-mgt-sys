import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CancelFacilityBookingDto {
  @IsOptional() @IsDateString() cancelledAt?: string;
  @IsOptional() @IsString() cancelReason?: string;
  @IsOptional() @IsString() refundMethod?: string;
  @IsOptional() @IsString() creditNoteId?: string;
  @IsOptional() @IsString() refundId?: string;
}
