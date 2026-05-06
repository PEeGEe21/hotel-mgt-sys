
import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TerminalSetupDto {
  @ApiProperty({ description: 'The setup code shown in terminal settings' })
  @IsString() setupCode!: string;

  @ApiPropertyOptional({ description: 'Friendly name for the registering device' })
  @IsString()
  @IsOptional()
  deviceName?: string;
}
