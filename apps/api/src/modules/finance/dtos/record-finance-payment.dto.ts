import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class RecordFinancePaymentDto {
  @ApiProperty()
  @IsString()
  invoiceId!: string;

  @ApiProperty()
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiProperty()
  @IsString()
  method!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  debitAccountCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  creditAccountCode?: string;
}
