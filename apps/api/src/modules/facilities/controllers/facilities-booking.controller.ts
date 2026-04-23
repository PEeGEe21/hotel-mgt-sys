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
}
