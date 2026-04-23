import { IsOptional, IsString } from 'class-validator';

export class CreateFacilityLocationDto {
  @IsString() name!: string;
  @IsOptional() @IsString() building?: string;
  @IsOptional() @IsString() floor?: string;
  @IsOptional() @IsString() description?: string;
}
