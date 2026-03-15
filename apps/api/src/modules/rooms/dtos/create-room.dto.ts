import { IsString, IsNumber, IsEnum, IsOptional, IsArray, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { RoomStatus, RoomType } from '@prisma/client';

// ─── DTOs ─────────────────────────────────────────────────────────────────────
export class CreateRoomDto {
  @ApiProperty() @IsString() number!: string;
  @ApiProperty() @IsString() floorId!: string;
  @ApiProperty({ enum: RoomType }) @IsEnum(RoomType) type!: RoomType;
  @ApiProperty() @IsNumber() @Min(0) baseRate!: number;
  @ApiPropertyOptional() @IsInt() @Min(1) @IsOptional() maxGuests?: number;
  @ApiPropertyOptional() @IsString() @IsOptional() description?: string;
  @ApiPropertyOptional() @IsArray() @IsOptional() amenities?: string[];
  @ApiPropertyOptional() @IsArray() @IsOptional() images?: string[];
}
