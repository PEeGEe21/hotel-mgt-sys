import { IsOptional, IsString } from 'class-validator';

export class UpdateFacilityTypeDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
}
