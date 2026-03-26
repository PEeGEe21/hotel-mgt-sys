import {
  Controller, Get, Post, Put, Param, Body,
  Query, Request, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { LedgerService } from './ledger.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Ledger')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ledger')
export class LedgerController {
  constructor(private svc: LedgerService) {}

  // ── Chart of Accounts ─────────────────────────────────────────────────────
  @Get('accounts')
  @ApiOperation({ summary: 'List chart of accounts with running balances' })
  listAccounts(@Request() req: any, @Query('type') type?: string) {
    return this.svc.listAccounts(req.user.hotelId, type);
  }

  @Post('accounts')
  @ApiOperation({ summary: 'Add a custom account' })
  createAccount(@Request() req: any, @Body() dto: {
    code: string; name: string; type: string;
    normalBalance: string; description?: string;
  }) {
    return this.svc.createAccount(req.user.hotelId, dto);
  }

  @Put('accounts/:id')
  @ApiOperation({ summary: 'Update account name / description / active status' })
  updateAccount(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: { name?: string; description?: string; isActive?: boolean },
  ) {
    return this.svc.updateAccount(req.user.hotelId, id, dto);
  }

  @Post('accounts/seed')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Seed standard hotel chart of accounts (run once)' })
  seedCoa(@Request() req: any) {
    return this.svc.seedChartOfAccounts(req.user.hotelId);
  }

  // ── Journal Entries ───────────────────────────────────────────────────────
  @Post('entries')
  @ApiOperation({ summary: 'Post a manual journal entry' })
  postEntry(@Request() req: any, @Body() dto: {
    description: string;
    reference?:  string;
    date?:       string;
    lines: { accountCode: string; type: 'DEBIT' | 'CREDIT'; amount: number; description?: string }[];
  }) {
    return this.svc.postEntry(req.user.hotelId, {
      ...dto,
      date:     dto.date ? new Date(dto.date) : undefined,
      postedBy: req.user.staffId,
    });
  }

  // ── Reports ───────────────────────────────────────────────────────────────
  @Get('day-book')
  @ApiOperation({ summary: 'Day book — all journal entries for a date' })
  getDayBook(
    @Request()    req: any,
    @Query('date')  date?: string,
    @Query('page')  page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.svc.getDayBook(
      req.user.hotelId,
      date ?? new Date().toISOString().slice(0, 10),
      page  ? Number(page)  : 1,
      limit ? Number(limit) : 50,
    );
  }

  @Get('trial-balance')
  @ApiOperation({ summary: 'Trial balance as of a date' })
  getTrialBalance(@Request() req: any, @Query('asOf') asOf?: string) {
    return this.svc.getTrialBalance(req.user.hotelId, asOf);
  }

  @Get('profit-loss')
  @ApiOperation({ summary: 'Profit & Loss for a date range' })
  getProfitAndLoss(
    @Request()         req: any,
    @Query('from')     from?: string,
    @Query('to')       to?:   string,
  ) {
    const today = new Date().toISOString().slice(0, 10);
    const firstOfMonth = new Date();
    firstOfMonth.setDate(1);
    return this.svc.getProfitAndLoss(
      req.user.hotelId,
      from ?? firstOfMonth.toISOString().slice(0, 10),
      to   ?? today,
    );
  }

  @Get('accounts/:code/statement')
  @ApiOperation({ summary: 'Account statement with running balance' })
  getStatement(
    @Request()     req: any,
    @Param('code') code: string,
    @Query('from') from?: string,
    @Query('to')   to?:   string,
  ) {
    return this.svc.getAccountStatement(req.user.hotelId, code, from, to);
  }
}