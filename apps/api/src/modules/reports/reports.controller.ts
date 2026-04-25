import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard, Permissions, PermissionsGuard } from '../auth/guards';
import { OutstandingFoliosQueryDto, ReportsRangeQueryDto } from './dtos/reports-query.dto';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('overview')
  @Permissions('view:reports')
  @ApiOperation({ summary: 'Overview snapshot for the reports dashboard' })
  getOverview(@Request() req: any, @Query() query: ReportsRangeQueryDto) {
    return this.reportsService.getOverview(req.user.hotelId, query);
  }

  @Get('revenue')
  @Permissions('view:reports')
  @ApiOperation({ summary: 'Revenue report by invoice type, payment status, and day' })
  getRevenue(@Request() req: any, @Query() query: ReportsRangeQueryDto) {
    return this.reportsService.getRevenue(req.user.hotelId, query);
  }

  @Get('cogs')
  @Permissions('view:reports')
  @ApiOperation({ summary: 'Cost of goods sold from POS inventory consumption' })
  getCogs(@Request() req: any, @Query() query: ReportsRangeQueryDto) {
    return this.reportsService.getCogs(req.user.hotelId, query);
  }

  @Get('outstanding-folios')
  @Permissions('view:reports')
  @ApiOperation({ summary: 'Outstanding reservation folio balances' })
  getOutstandingFolios(@Request() req: any, @Query() query: OutstandingFoliosQueryDto) {
    return this.reportsService.getOutstandingFolios(req.user.hotelId, query);
  }

  @Get('guests')
  @Permissions('view:reports')
  @ApiOperation({ summary: 'Guest report snapshot with source, nationality, and reservation summaries' })
  getGuests(@Request() req: any, @Query() query: ReportsRangeQueryDto) {
    return this.reportsService.getGuestInsights(req.user.hotelId, query);
  }

  @Get('staff')
  @Permissions('view:reports')
  @ApiOperation({ summary: 'Staff report snapshot with attendance trends and department summaries' })
  getStaff(@Request() req: any, @Query() query: ReportsRangeQueryDto) {
    return this.reportsService.getStaffInsights(req.user.hotelId, query);
  }

  @Get('inventory')
  @Permissions('view:reports')
  @ApiOperation({ summary: 'Inventory report snapshot with stock alerts and turnover summary' })
  getInventory(@Request() req: any, @Query() query: ReportsRangeQueryDto) {
    return this.reportsService.getInventoryInsights(req.user.hotelId, query);
  }

  @Get('occupancy')
  @Permissions('view:reports')
  @ApiOperation({ summary: 'Occupancy report snapshot with daily trend and room type performance' })
  getOccupancy(@Request() req: any, @Query() query: ReportsRangeQueryDto) {
    return this.reportsService.getOccupancyInsights(req.user.hotelId, query);
  }
}
