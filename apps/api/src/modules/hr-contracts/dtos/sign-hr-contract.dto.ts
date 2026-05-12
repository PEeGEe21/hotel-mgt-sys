import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class SignHrContractDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comment?: string;
}
