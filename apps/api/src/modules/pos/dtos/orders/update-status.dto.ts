
import { OrderStatus } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateStatusDto {
  @ApiProperty({ enum: OrderStatus }) @IsEnum(OrderStatus) status!: OrderStatus;
  @ApiPropertyOptional() @IsString() @IsOptional() posTerminalId?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() terminalDeviceKey?: string;
}
