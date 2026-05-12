import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ApproveHrContractDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comment?: string;
}
