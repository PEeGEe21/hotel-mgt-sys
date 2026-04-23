import { Type } from 'class-transformer';
import { IsArray, IsInt, IsString, Min, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReorderTableItemDto {
  @ApiProperty()
  @IsString()
  id!: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  sortOrder!: number;
}

export class ReorderTablesDto {
  @ApiProperty({ type: [ReorderTableItemDto], description: 'Array of { id, sortOrder }' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderTableItemDto)
  items!: ReorderTableItemDto[];
}
