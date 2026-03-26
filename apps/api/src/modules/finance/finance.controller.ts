import { Controller, Get, UseGuards, Query, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { FinanceService } from './finance.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Finance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('finance')
export class FinanceController {
  constructor(private financeService: FinanceService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Finance overview for a date range (defaults to current month)' })
  getOverview(@Request() req: any, @Query('from') from?: string, @Query('to') to?: string) {
    return this.financeService.getOverview(req.user.hotelId, { from, to });
  }

  @Get('invoices')
  @ApiOperation({ summary: 'List invoices for a date range with filters' })
  listInvoices(
    @Request() req: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.financeService.listInvoices(req.user.hotelId, {
      from,
      to,
      search,
      status,
      type,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('payments')
  @ApiOperation({ summary: 'List payments for a date range with filters' })
  listPayments(
    @Request() req: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.financeService.listPayments(req.user.hotelId, {
      from,
      to,
      search,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }
}
