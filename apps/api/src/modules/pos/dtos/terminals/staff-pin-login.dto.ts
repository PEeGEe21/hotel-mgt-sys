

import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StaffPinLoginDto {
  @ApiProperty() @IsString() employeeCode!: string;
  @ApiProperty() @IsString() pin!:          string;
}