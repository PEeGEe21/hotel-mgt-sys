import { IsEmail, IsString, MinLength } from 'class-validator';

export class LogoutDto {
  @IsString()
  refreshToken!: string;
}
