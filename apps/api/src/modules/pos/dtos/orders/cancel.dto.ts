import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CancelDto {
  @ApiPropertyOptional() @IsString() @IsOptional() reason?: string;
}
