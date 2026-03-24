
import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateSetupCodeDto {
  @ApiPropertyOptional() @IsString() @IsOptional() terminalId?: string;
}
