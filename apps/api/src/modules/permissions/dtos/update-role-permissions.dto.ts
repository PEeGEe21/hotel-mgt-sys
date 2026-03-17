import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsString, ValidateNested } from 'class-validator';
import { Role } from '@prisma/client';

export class RolePermissionsDto {
  @ApiProperty({ enum: Role })
  @IsEnum(Role)
  role!: Role;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  permissions!: string[];
}

export class UpdateRolePermissionsDto {
  @ApiProperty({ type: [RolePermissionsDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RolePermissionsDto)
  roles!: RolePermissionsDto[];
}
