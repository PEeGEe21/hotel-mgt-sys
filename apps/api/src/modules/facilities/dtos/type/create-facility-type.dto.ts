import { IsOptional, IsString } from 'class-validator';

export class CreateFacilityTypeDto {
  @IsString() name!: string;
  @IsOptional() @IsString() description?: string;
}
