import { IsOptional, IsString } from 'class-validator';

export class UpdateFacilityDepartmentDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() headId?: string;
  @IsOptional() @IsString() description?: string;
}
