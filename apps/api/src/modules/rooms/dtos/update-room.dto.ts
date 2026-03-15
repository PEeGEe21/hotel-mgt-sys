import { IsString, IsNumber, IsEnum, IsOptional, IsArray, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { RoomStatus, RoomType } from '@prisma/client';

export class UpdateRoomDto {
  @ApiPropertyOptional({ enum: RoomType }) @IsEnum(RoomType) @IsOptional() type?: RoomType;
  @ApiPropertyOptional({ enum: RoomStatus }) @IsEnum(RoomStatus) @IsOptional() status?: RoomStatus;
  @ApiPropertyOptional() @IsNumber() @Min(0) @IsOptional() baseRate?: number;
  @ApiPropertyOptional() @IsInt() @Min(1) @IsOptional() maxGuests?: number;
  @ApiPropertyOptional() @IsString() @IsOptional() description?: string;
  @ApiPropertyOptional() @IsArray() @IsOptional() amenities?: string[];
  @ApiPropertyOptional() @IsArray() @IsOptional() images?: string[];
}
