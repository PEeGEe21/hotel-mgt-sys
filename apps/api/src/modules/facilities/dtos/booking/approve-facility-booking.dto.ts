import { IsDateString, IsOptional } from 'class-validator';

export class ApproveFacilityBookingDto {
  @IsOptional() @IsDateString() approvedAt?: string;
}
