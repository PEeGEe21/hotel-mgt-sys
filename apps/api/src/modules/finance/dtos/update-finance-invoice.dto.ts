import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class UpdateFinanceInvoiceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  counterpartyName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueAt?: string;
}
