import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RevokeKeycardDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}
