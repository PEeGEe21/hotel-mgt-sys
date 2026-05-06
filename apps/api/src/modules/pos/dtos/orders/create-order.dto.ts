import {
  IsString,
  IsOptional,
  IsInt,
  IsNumber,
  IsArray,
  IsBoolean,
  Min,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderItemDto } from './order-item.dto';

// ─── DTOs ────────────
export class CreateOrderDto {
  @ApiProperty() @IsString() type!: string; // DINE_IN | ROOM_SERVICE | TAKEAWAY | RETAIL
  @ApiProperty({ type: [OrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];
  @ApiPropertyOptional() @IsString() @IsOptional() tableNo?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() roomNo?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() reservationId?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() posTerminalId?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() terminalDeviceKey?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() staffId?: string;
  @ApiPropertyOptional() @IsNumber() @IsOptional() discount?: number;
  @ApiPropertyOptional() @IsString() @IsOptional() note?: string;
}
