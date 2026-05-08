import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateFinanceInvoiceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sourceType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reservationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  posOrderId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  facilityBookingId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  requisitionId?: string;

  @ApiProperty()
  @IsString()
  counterpartyName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  subtotal!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  tax?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  debitAccountCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  creditAccountCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  recordInitialPayment?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  initialPaymentAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  initialPaymentMethod?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  initialPaymentReference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  initialPaymentNote?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  initialPaymentPaidAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  initialPaymentDebitAccountCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  initialPaymentCreditAccountCode?: string;
}
