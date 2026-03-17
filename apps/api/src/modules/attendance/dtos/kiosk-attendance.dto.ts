import { IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class KioskAttendanceDto {
  @ApiProperty() @IsString() employeeCode!: string;
  @ApiPropertyOptional() @IsString() @IsOptional() pin?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() note?: string;
  @ApiPropertyOptional() @IsNumber() @IsOptional() latitude?: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() longitude?: number;
}
