import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { Role } from '@prisma/client';

export class CreateUserAccountDto {
  @ApiProperty() @IsEmail() email!: string;
  @ApiProperty() @IsString() @MinLength(6) password!: string;
  @ApiProperty() role!: Role;

  @ApiProperty() @IsString() @MinLength(2) firstName!: string;
  @ApiProperty() @IsString() @MinLength(2) lastName!: string;
  @ApiProperty() @IsString() @MinLength(2) department!: string;
  @ApiProperty() @IsString() @MinLength(2) position!: string;
  @ApiProperty() @IsString() @MinLength(2) employeeCode!: string;

  @ApiPropertyOptional() @IsString() @IsOptional() phone?: string;
}
