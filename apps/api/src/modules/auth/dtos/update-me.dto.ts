import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { IsSafeImageReference } from '../../../common/utils/image-input.utils';

export class UpdateMeDto {
  @ApiPropertyOptional()
  @IsString()
  @MinLength(2)
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  phone?: string | null;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @IsSafeImageReference({ maxBytes: 2 * 1024 * 1024 })
  avatar?: string | null;
}
