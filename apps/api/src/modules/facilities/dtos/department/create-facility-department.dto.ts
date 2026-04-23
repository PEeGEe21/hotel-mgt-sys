import { IsOptional, IsString } from 'class-validator';

export class CreateFacilityDepartmentDto {
  @IsString() name!: string;
  @IsOptional() @IsString() headId?: string;
  @IsOptional() @IsString() description?: string;
}
