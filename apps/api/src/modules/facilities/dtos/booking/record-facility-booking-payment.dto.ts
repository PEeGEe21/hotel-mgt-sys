import { IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class RecordFacilityBookingPaymentDto {
  @IsOptional() @IsNumber() @Min(0.01) amount?: number;
  @IsOptional() @IsString() method?: string;
  @IsOptional() @IsString() reference?: string;
  @IsOptional() @IsString() note?: string;
  @IsOptional() @IsDateString() paidAt?: string;
}
