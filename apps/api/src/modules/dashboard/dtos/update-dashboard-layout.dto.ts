import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

const DASHBOARD_WIDGET_SIZES = ['compact', 'wide', 'full'] as const;

export class DashboardLayoutRowDto {
  @ApiProperty({ enum: Role })
  @IsEnum(Role)
  role!: Role;

  @ApiProperty()
  @IsString()
  widgetId!: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  position!: number;

  @ApiProperty()
  @IsBoolean()
  enabled!: boolean;

  @ApiProperty({ enum: DASHBOARD_WIDGET_SIZES, required: false, nullable: true })
  @IsIn(DASHBOARD_WIDGET_SIZES)
  @IsOptional()
  sizeOverride?: string | null;
}

export class UpdateDashboardLayoutDto {
  @ApiProperty({ type: [DashboardLayoutRowDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DashboardLayoutRowDto)
  rows!: DashboardLayoutRowDto[];
}
