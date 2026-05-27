import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateFacilityBookingInvoiceDto {
  @IsOptional() @IsDateString() dueAt?: string;
  @IsOptional() @IsString() notes?: string;
}
