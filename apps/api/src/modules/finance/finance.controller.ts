import { Body, Controller, Get, Param, Patch, Post, Query, Request, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { FinanceService } from './finance.service';
import { JwtAuthGuard, Permissions, PermissionsGuard } from '../auth/guards';
import {
  FinanceRangeQueryDto,
  InvoiceListQueryDto,
  PaymentListQueryDto,
} from './dtos/finance-query.dto';
import { CreateFinanceInvoiceDto } from './dtos/create-finance-invoice.dto';
import { RecordFinancePaymentDto } from './dtos/record-finance-payment.dto';
import { UpdateFinanceInvoiceDto } from './dtos/update-finance-invoice.dto';

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

  @Post('invoices')
  @Permissions('create:finance')
  @ApiOperation({ summary: 'Create a manual finance invoice' })
  createInvoice(@Request() req: any, @Body() dto: CreateFinanceInvoiceDto) {
    return this.financeService.createInvoice(req.user.hotelId, dto);
  }

  @Patch('invoices/:id')
  @Permissions('create:finance')
  @ApiOperation({ summary: 'Update editable finance invoice fields' })
  updateInvoice(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateFinanceInvoiceDto) {
    return this.financeService.updateInvoice(req.user.hotelId, id, dto);
  }

  @Post('invoices/from-requisition/:id')
  @Permissions('create:finance')
  @ApiOperation({ summary: 'Create an expense invoice from an approved requisition' })
  createInvoiceFromRequisition(@Request() req: any, @Param('id') id: string) {
    return this.financeService.createInvoiceFromRequisition(req.user.hotelId, id);
  }

  @Post('payments')
  @Permissions('create:finance')
  @ApiOperation({ summary: 'Record a payment against any finance invoice' })
  recordPayment(@Request() req: any, @Body() dto: RecordFinancePaymentDto) {
    return this.financeService.recordPayment(req.user.hotelId, dto);
  }

  @Post('payments/reference')
  @Permissions('create:finance')
  @ApiOperation({ summary: 'Generate a backend payment transaction reference' })
  generatePaymentReference(@Request() req: any) {
    return this.financeService.generatePaymentReference(req.user.hotelId);
  }

  @Get('invoices/export')
  @Permissions('view:finance')
  @ApiOperation({ summary: 'Export invoices as CSV' })
  async exportInvoices(
    @Request() req: any,
    @Query() query: InvoiceListQueryDto,
    @Res() res: any,
  ) {
    const csv = await this.financeService.exportInvoicesCsv(req.user.hotelId, query);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="finance-invoices.csv"');
    res.send(csv);
  }

  @Get('payments/export')
  @Permissions('view:finance')
  @ApiOperation({ summary: 'Export payments as CSV' })
  async exportPayments(
    @Request() req: any,
    @Query() query: PaymentListQueryDto,
    @Res() res: any,
  ) {
    const csv = await this.financeService.exportPaymentsCsv(req.user.hotelId, query);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="finance-payments.csv"');
    res.send(csv);
  }

  @Get('invoices/:id/print')
  @Permissions('view:finance')
  @ApiOperation({ summary: 'Get printable invoice HTML' })
  async printInvoice(@Request() req: any, @Param('id') id: string, @Res() res: any) {
    const html = await this.financeService.getInvoicePrintHtml(req.user.hotelId, id);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }
}
