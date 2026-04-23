import { IsString, IsEnum, IsOptional, IsInt, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { RoomStatus, RoomType } from '@prisma/client';

export class RoomFilterDto {
  @ApiPropertyOptional({ enum: RoomStatus }) @IsEnum(RoomStatus) @IsOptional() status?: RoomStatus;
  @ApiPropertyOptional({ enum: RoomType }) @IsEnum(RoomType) @IsOptional() type?: RoomType;
  @IsOptional()
  @IsString()
  floorId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @Transform(({ value }) => parseInt(value, 10)) @IsInt() @Min(1) page?: number;
  @ApiPropertyOptional() @IsOptional() @Transform(({ value }) => parseInt(value, 10)) @IsInt() @Min(1) @Max(100) limit?: number;
}
