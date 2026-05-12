import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class UploadHrContractDocumentDto {
  @ApiProperty()
  @IsString()
  documentType!: string;

  @ApiProperty()
  @IsString()
  fileName!: string;

  @ApiProperty()
  @IsString()
  fileUrl!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10 * 1024 * 1024)
  fileSizeBytes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  source?: string;
}
