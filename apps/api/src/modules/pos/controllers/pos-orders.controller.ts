import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/guards';
import { PosOrdersService } from '../services/pos-orders.service';
import { OrderFilterDto } from '../dtos/orders/order-filter.dto';
import { CreateOrderDto } from '../dtos/orders/create-order.dto';
import { AddItemDto } from '../dtos/orders/add-item.dto';
import { UpdateItemDto } from '../dtos/orders/update-item.dto';
import { PayOrderDto } from '../dtos/orders/pay-order.dto';
import { CancelDto } from '../dtos/orders/cancel.dto';
import { UpdateStatusDto } from '../dtos/orders/update-status.dto';

@ApiTags('POS Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('pos/orders')
export class PosOrdersController {
  constructor(private svc: PosOrdersService) {}

  @Get('z-report')
  @ApiOperation({ summary: 'Z-report for a terminal or shift' })
  getZReport(
    @Request() req: any,
    @Query('posTerminalId') posTerminalId?: string,
    @Query('date') date?: string,
    @Query('staffId') staffId?: string,
  ) {
    return this.svc.getZReport(req.user.hotelId, { posTerminalId, date, staffId });
  }

  @Get('table/:tableNo')
  @ApiOperation({ summary: 'Get table summary for close-table flow' })
  closeTableSummary(@Request() req: any, @Param('tableNo') tableNo: string) {
    return this.svc.closeTable(req.user.hotelId, tableNo);
  }

  @Get()
  @ApiOperation({ summary: 'List orders with filters and today stats' })
  findAll(@Request() req: any, @Query() filters: OrderFilterDto) {
    return this.svc.findAll(req.user.hotelId, filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single order with full details' })
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.svc.findOne(req.user.hotelId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new order' })
  create(@Request() req: any, @Body() dto: CreateOrderDto) {
    return this.svc.create(req.user.hotelId, dto);
  }

  @Post(':id/items')
  @ApiOperation({ summary: 'Add item to existing order' })
  addItem(@Request() req: any, @Param('id') id: string, @Body() dto: AddItemDto) {
    return this.svc.addItem(req.user.hotelId, id, dto);
  }

  @Patch(':id/items/:itemId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update item quantity (0 = remove)' })
  updateItem(
    @Request() req: any,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateItemDto,
  ) {
    return this.svc.updateItem(req.user.hotelId, id, itemId, dto);
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update order status — DELIVERED triggers inventory + invoice' })
  updateStatus(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateStatusDto) {
    return this.svc.updateStatus(req.user.hotelId, id, dto.status);
  }

  @Post(':id/pay')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Record payment for a delivered walk-in order' })
  pay(@Request() req: any, @Param('id') id: string, @Body() dto: PayOrderDto) {
    return this.svc.payOrder(req.user.hotelId, id, dto);
  }

  @Patch(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel an order (not allowed after DELIVERED)' })
  cancel(@Request() req: any, @Param('id') id: string, @Body() dto: CancelDto) {
    return this.svc.cancel(req.user.hotelId, id, dto.reason);
  }
}
