import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class KioskStatusDto {
  @ApiProperty() @IsString() employeeCode!: string;
}
