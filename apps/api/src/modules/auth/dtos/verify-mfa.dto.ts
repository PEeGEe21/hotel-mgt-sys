import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class VerifyMfaDto {
  @ApiProperty()
  @IsString()
  challengeToken!: string;

  @ApiProperty()
  @IsString()
  @Length(6, 6)
  code!: string;
}
