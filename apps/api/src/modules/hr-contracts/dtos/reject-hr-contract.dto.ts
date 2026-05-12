import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class RejectHrContractDto {
  @ApiProperty()
  @IsString()
  reason!: string;
}
