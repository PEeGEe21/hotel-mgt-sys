import { IsString, IsNumber, IsEnum, IsOptional, IsArray, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { RoomStatus, RoomType } from '@prisma/client';

export class RoomFilterDto {
  @ApiPropertyOptional({ enum: RoomStatus }) @IsEnum(RoomStatus) @IsOptional() status?: RoomStatus;
  @ApiPropertyOptional({ enum: RoomType }) @IsEnum(RoomType) @IsOptional() type?: RoomType;
  @IsOptional()
  @IsString()
  floorId?: string;
  @ApiPropertyOptional() @IsOptional() search?: string;
  @ApiPropertyOptional() @IsOptional() @Transform(({ value }) => parseInt(value)) page?: number;
  @ApiPropertyOptional() @IsOptional() @Transform(({ value }) => parseInt(value)) limit?: number;
}
