import { IsOptional, IsString } from 'class-validator';

export class UpdateFacilityLocationDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() building?: string;
  @IsOptional() @IsString() floor?: string;
  @IsOptional() @IsString() description?: string;
}
