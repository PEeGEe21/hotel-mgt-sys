import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdatePlatformHotelLifecycleDto {
  @ApiProperty({
    description: 'Exact hotel name confirmation to reduce accidental lifecycle actions.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  confirmationName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(240)
  reason?: string;
}
