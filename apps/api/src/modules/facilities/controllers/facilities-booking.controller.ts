import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, Permissions, PermissionsGuard } from '../../auth/guards';
import { FacilitiesService } from '../services/facilities.service';
import { CreateFacilityBookingDto } from '../dtos/booking/create-facility-booking.dto';
import { UpdateFacilityBookingDto } from '../dtos/booking/update-facility-booking.dto';
import { CancelFacilityBookingDto } from '../dtos/booking/cancel-facility-booking.dto';
import { ApproveFacilityBookingDto } from '../dtos/booking/approve-facility-booking.dto';
import { CreateFacilityBookingInvoiceDto } from '../dtos/booking/create-facility-booking-invoice.dto';
import { RecordFacilityBookingPaymentDto } from '../dtos/booking/record-facility-booking-payment.dto';
import { PostFacilityBookingFolioDto } from '../dtos/booking/post-facility-booking-folio.dto';
import { FacilityBookingFilterDto } from '../dtos/filter.dto';

@ApiTags('FacilitiesBooking')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('facilities/booking')
export class FacilitiesBookingController {
  constructor(private facilitiesService: FacilitiesService) {}

  @Get('list')
  @Permissions('view:facilities')
  @ApiOperation({ summary: 'List facility bookings' })
  listBookings(@Request() req: any, @Query() filters: FacilityBookingFilterDto) {
    return this.facilitiesService.listBookings(req.user.hotelId, filters);
  }

  @Post('')
  @Permissions('create:facilities')
  @ApiOperation({ summary: 'Create facility booking' })
  createBooking(@Request() req: any, @Body() dto: CreateFacilityBookingDto) {
    return this.facilitiesService.createBooking(req.user.hotelId, req.user.staffId, dto);
  }

  @Patch(':id')
  @Permissions('manage:facilities')
  @ApiOperation({ summary: 'Update facility booking' })
  updateBooking(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateFacilityBookingDto,
  ) {
    return this.facilitiesService.updateBooking(req.user.hotelId, id, dto);
  }

  @Post(':id/cancel')
  @Permissions('manage:facilities')
  @ApiOperation({ summary: 'Cancel facility booking' })
  cancelBooking(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: CancelFacilityBookingDto,
  ) {
    return this.facilitiesService.cancelBooking(req.user.hotelId, id, dto);
  }

  @Post(':id/approve')
  @Permissions('view:facilities')
  @ApiOperation({ summary: 'Approve a pending facility booking' })
  approveBooking(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: ApproveFacilityBookingDto,
  ) {
    return this.facilitiesService.approveBooking(req.user.hotelId, id, {
      userId: req.user.sub,
      role: req.user.role,
      staffId: req.user.staffId ?? null,
      approvedAt: dto.approvedAt,
    });
  }

  @Post(':id/invoice')
  @Permissions('create:finance')
  @ApiOperation({ summary: 'Create an invoice for a confirmed facility booking' })
  createBookingInvoice(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: CreateFacilityBookingInvoiceDto,
  ) {
    return this.facilitiesService.createBookingInvoice(req.user.hotelId, id, dto);
  }

  @Post(':id/pay')
  @Permissions('create:finance')
  @ApiOperation({ summary: 'Record payment for a facility booking invoice' })
  recordBookingPayment(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: RecordFacilityBookingPaymentDto,
  ) {
    return this.facilitiesService.recordBookingPayment(req.user.hotelId, id, dto);
  }

  @Post(':id/post-to-room')
  @Permissions('manage:facilities')
  @ApiOperation({ summary: 'Post a confirmed room-charge facility booking to the reservation folio' })
  postBookingToRoom(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: PostFacilityBookingFolioDto,
  ) {
    return this.facilitiesService.postBookingToRoomFolio(req.user.hotelId, id, dto);
  }
}
