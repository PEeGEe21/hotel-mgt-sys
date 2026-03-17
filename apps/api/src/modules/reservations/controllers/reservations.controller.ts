import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Param,
  Body,
  Query,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
  Header,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ReservationsService } from '../services/reservations.service';
import { JwtAuthGuard, Permissions, PermissionsGuard } from 'src/modules/auth/guards';
import { AddFolioItemDto } from '../dtos/add-folio-item.dto';
import { AvailabilityDto } from '../dtos/availability.dto';
import { ReservationFilterDto } from '../dtos/reservation-filter.dto';
import { CreateReservationDto } from '../dtos/create-reservation.dto';
import { UpdateReservationDto } from '../dtos/update-reservation.dto';
import { RecordPaymentDto } from '../dtos/record-payment.dto';

@ApiTags('Reservations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('reservations')
export class ReservationsController {
  constructor(private svc: ReservationsService) {}

  @Get('availability')
  @Permissions('view:reservations')
  @ApiOperation({ summary: 'Get available rooms for date range' })
  getAvailability(@Request() req: any, @Query() dto: AvailabilityDto) {
    return this.svc.getAvailableRooms(req.user.hotelId, dto);
  }

  @Get()
  @Permissions('view:reservations')
  @ApiOperation({ summary: 'List reservations with filters and pagination' })
  findAll(@Request() req: any, @Query() filters: ReservationFilterDto) {
    return this.svc.findAll(req.user.hotelId, filters);
  }

  @Get(':id')
  @Permissions('view:reservations')
  @ApiOperation({ summary: 'Get a single reservation with full details' })
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.svc.findOne(req.user.hotelId, id);
  }

  @Post()
  @Permissions('create:reservations')
  @ApiOperation({ summary: 'Create a new reservation' })
  create(@Request() req: any, @Body() dto: CreateReservationDto) {
    return this.svc.create(req.user.hotelId, dto);
  }

  @Put(':id')
  @Permissions('edit:reservations')
  @ApiOperation({ summary: 'Update reservation details' })
  update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateReservationDto) {
    return this.svc.update(req.user.hotelId, id, dto);
  }

  @Patch(':id/check-in')
  @Permissions('checkin:reservations')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check in a guest' })
  checkIn(@Request() req: any, @Param('id') id: string) {
    return this.svc.checkIn(req.user.hotelId, id);
  }

  @Patch(':id/check-out')
  @Permissions('checkout:reservations')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check out a guest' })
  checkOut(@Request() req: any, @Param('id') id: string) {
    return this.svc.checkOut(req.user.hotelId, id);
  }

  @Patch(':id/cancel')
  @Permissions('delete:reservations')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a reservation' })
  cancel(@Request() req: any, @Param('id') id: string) {
    return this.svc.cancel(req.user.hotelId, id);
  }

  @Patch(':id/no-show')
  @Permissions('delete:reservations')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark as no-show' })
  noShow(@Request() req: any, @Param('id') id: string) {
    return this.svc.noShow(req.user.hotelId, id);
  }

  @Post(':id/folio')
  @Permissions('edit:reservations')
  @ApiOperation({ summary: 'Add a charge to the folio' })
  addFolioItem(@Request() req: any, @Param('id') id: string, @Body() dto: AddFolioItemDto) {
    return this.svc.addFolioItem(req.user.hotelId, id, dto);
  }

  @Post(':id/payments')
  @Permissions('create:finance')
  @ApiOperation({ summary: 'Record a payment for a reservation' })
  recordPayment(@Request() req: any, @Param('id') id: string, @Body() dto: RecordPaymentDto) {
    return this.svc.recordPayment(req.user.hotelId, id, dto);
  }

  @Get(':id/payments/:paymentId/receipt')
  @Permissions('view:finance')
  @ApiOperation({ summary: 'Get printable payment receipt (HTML)' })
  @HttpCode(HttpStatus.OK)
  @Header('Content-Type', 'text/html; charset=utf-8')
  getReceipt(
    @Request() req: any,
    @Param('id') id: string,
    @Param('paymentId') paymentId: string,
  ) {
    return this.svc.getPaymentReceiptHtml(req.user.hotelId, id, paymentId);
  }

  @Get(':id/folio-items')
  @Permissions('view:finance')
  @ApiOperation({ summary: 'Get reservation folio items (cursor pagination)' })
  getFolioItems(
    @Request() req: any,
    @Param('id') id: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.svc.getFolioItems(req.user.hotelId, id, {
      cursor,
      limit: limit ? Number(limit) : undefined,
    });
  }
}
