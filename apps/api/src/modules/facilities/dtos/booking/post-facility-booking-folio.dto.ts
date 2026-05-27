import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class PostFacilityBookingFolioDto {
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsInt() @Min(1) quantity?: number;
}
