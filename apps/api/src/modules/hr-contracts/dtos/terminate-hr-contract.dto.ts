import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsString } from 'class-validator';

export class TerminateHrContractDto {
  @ApiProperty()
  @IsDateString()
  terminationDate!: string;

  @ApiProperty()
  @IsString()
  reason!: string;
}
