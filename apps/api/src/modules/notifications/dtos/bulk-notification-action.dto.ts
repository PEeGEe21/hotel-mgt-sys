import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsIn, IsString, MinLength } from 'class-validator';

export class BulkNotificationActionDto {
  @ApiProperty({ enum: ['read', 'archive', 'unarchive', 'pin', 'unpin'] })
  @IsString()
  @IsIn(['read', 'archive', 'unarchive', 'pin', 'unpin'])
  action!: 'read' | 'archive' | 'unarchive' | 'pin' | 'unpin';

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @MinLength(1, { each: true })
  ids!: string[];
}
