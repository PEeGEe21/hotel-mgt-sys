import { Controller, Get, UseGuards, Query, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { FinanceService } from './finance.service';
import { JwtAuthGuard, Permissions, PermissionsGuard } from '../auth/guards';
import {
  FinanceRangeQueryDto,
  InvoiceListQueryDto,
  PaymentListQueryDto,
} from './dtos/finance-query.dto';

@ApiTags('Finance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('finance')
export class FinanceController {
  constructor(private financeService: FinanceService) {}

  @Get('overview')
  @Permissions('view:finance')
  @ApiOperation({ summary: 'Finance overview for a date range (defaults to current month)' })
  getOverview(@Request() req: any, @Query() query: FinanceRangeQueryDto) {
    return this.financeService.getOverview(req.user.hotelId, query);
  }

  @Get('invoices')
  @Permissions('view:finance')
  @ApiOperation({ summary: 'List invoices for a date range with filters' })
  listInvoices(@Request() req: any, @Query() query: InvoiceListQueryDto) {
    return this.financeService.listInvoices(req.user.hotelId, query);
  }

  @Get('payments')
  @Permissions('view:finance')
  @ApiOperation({ summary: 'List payments for a date range with filters' })
  listPayments(@Request() req: any, @Query() query: PaymentListQueryDto) {
    return this.financeService.listPayments(req.user.hotelId, query);
  }
}
