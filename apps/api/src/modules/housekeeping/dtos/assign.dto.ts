import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AssignDto {
  @ApiPropertyOptional() @IsString() @IsOptional() staffId?: string | null;
}
