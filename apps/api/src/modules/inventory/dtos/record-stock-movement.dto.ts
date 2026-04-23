import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class RecordStockMovementDto {
  @IsIn(['IN', 'OUT', 'WASTAGE', 'ADJUSTMENT'])
  type!: 'IN' | 'OUT' | 'WASTAGE' | 'ADJUSTMENT';

  @IsNumber()
  @Min(0.01)
  quantity!: number;

  @IsOptional()
  @IsString()
  note?: string;
}
