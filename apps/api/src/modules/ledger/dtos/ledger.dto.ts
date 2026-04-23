import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export const ACCOUNT_TYPES = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'] as const;
export const NORMAL_BALANCES = ['DEBIT', 'CREDIT'] as const;
export const JOURNAL_LINE_TYPES = ['DEBIT', 'CREDIT'] as const;

export class AccountListQueryDto {
  @IsOptional()
  @IsIn(ACCOUNT_TYPES)
  type?: string;
}

export class CreateAccountDto {
  @IsString()
  @Matches(/^\d{3,10}$/)
  code!: string;

  @IsString()
  name!: string;

  @IsIn(ACCOUNT_TYPES)
  type!: string;

  @IsIn(NORMAL_BALANCES)
  normalBalance!: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateAccountDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class JournalLineDto {
  @IsString()
  @Matches(/^\d{3,10}$/)
  accountCode!: string;

  @IsIn(JOURNAL_LINE_TYPES)
  type!: 'DEBIT' | 'CREDIT';

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsString()
  description?: string;
}

export class PostJournalEntryDto {
  @IsString()
  description!: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => JournalLineDto)
  lines!: JournalLineDto[];
}

export class DayBookQueryDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}

export class AsOfQueryDto {
  @IsOptional()
  @IsDateString()
  asOf?: string;
}

export class DateRangeQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
