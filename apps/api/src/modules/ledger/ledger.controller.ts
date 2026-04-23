import {
  Controller, Get, Post, Put, Param, Body,
  Query, Request, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { LedgerService } from './ledger.service';
import { JwtAuthGuard, Permissions, PermissionsGuard } from '../auth/guards';
import {
  AccountListQueryDto,
  AsOfQueryDto,
  CreateAccountDto,
  DateRangeQueryDto,
  DayBookQueryDto,
  PostJournalEntryDto,
  UpdateAccountDto,
} from './dtos/ledger.dto';

@ApiTags('Ledger')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('ledger')
export class LedgerController {
  constructor(private svc: LedgerService) {}

  // ── Chart of Accounts ─────────────────────────────────────────────────────
  @Get('accounts')
  @Permissions('view:finance')
  @ApiOperation({ summary: 'List chart of accounts with running balances' })
  listAccounts(@Request() req: any, @Query() query: AccountListQueryDto) {
    return this.svc.listAccounts(req.user.hotelId, query.type);
  }

  @Post('accounts')
  @Permissions('edit:finance')
  @ApiOperation({ summary: 'Add a custom account' })
  createAccount(@Request() req: any, @Body() dto: CreateAccountDto) {
    return this.svc.createAccount(req.user.hotelId, dto);
  }

  @Put('accounts/:id')
  @Permissions('edit:finance')
  @ApiOperation({ summary: 'Update account name / description / active status' })
  updateAccount(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateAccountDto,
  ) {
    return this.svc.updateAccount(req.user.hotelId, id, dto);
  }

  @Post('accounts/seed')
  @Permissions('edit:finance')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Seed standard hotel chart of accounts (run once)' })
  seedCoa(@Request() req: any) {
    return this.svc.seedChartOfAccounts(req.user.hotelId);
  }

  // ── Journal Entries ───────────────────────────────────────────────────────
  @Post('entries')
  @Permissions('create:finance')
  @ApiOperation({ summary: 'Post a manual journal entry' })
  postEntry(@Request() req: any, @Body() dto: PostJournalEntryDto) {
    return this.svc.postEntry(req.user.hotelId, {
      ...dto,
      date:     dto.date ? new Date(dto.date) : undefined,
      postedBy: req.user.staffId,
    });
  }

  // ── Reports ───────────────────────────────────────────────────────────────
  @Get('day-book')
  @Permissions('view:finance')
  @ApiOperation({ summary: 'Day book — all journal entries for a date' })
  getDayBook(
    @Request()    req: any,
    @Query() query: DayBookQueryDto,
  ) {
    return this.svc.getDayBook(
      req.user.hotelId,
      query.date ?? new Date().toISOString().slice(0, 10),
      query.page ?? 1,
      query.limit ?? 50,
    );
  }

  @Get('trial-balance')
  @Permissions('view:finance')
  @ApiOperation({ summary: 'Trial balance as of a date' })
  getTrialBalance(@Request() req: any, @Query() query: AsOfQueryDto) {
    return this.svc.getTrialBalance(req.user.hotelId, query.asOf);
  }

  @Get('profit-loss')
  @Permissions('view:finance')
  @ApiOperation({ summary: 'Profit & Loss for a date range' })
  getProfitAndLoss(
    @Request()         req: any,
    @Query() query: DateRangeQueryDto,
  ) {
    const today = new Date().toISOString().slice(0, 10);
    const firstOfMonth = new Date();
    firstOfMonth.setDate(1);
    return this.svc.getProfitAndLoss(
      req.user.hotelId,
      query.from ?? firstOfMonth.toISOString().slice(0, 10),
      query.to ?? today,
    );
  }

  @Get('accounts/:code/statement')
  @Permissions('view:finance')
  @ApiOperation({ summary: 'Account statement with running balance' })
  getStatement(
    @Request()     req: any,
    @Param('code') code: string,
    @Query() query: DateRangeQueryDto,
  ) {
    return this.svc.getAccountStatement(req.user.hotelId, code, query.from, query.to);
  }
}
