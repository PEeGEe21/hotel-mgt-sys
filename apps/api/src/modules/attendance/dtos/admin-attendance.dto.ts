import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, IsDateString } from 'class-validator';

export class AdminAttendanceDto {
  @ApiProperty() @IsUUID() @IsString() staffId!: string;
  @ApiPropertyOptional() @IsDateString() @IsOptional() timestamp?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() method?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() note?: string;
}
