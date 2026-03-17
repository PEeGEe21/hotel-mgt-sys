import { Controller, Post, Get, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AttendanceService } from '../services/attendance.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Permissions, PermissionsGuard } from '../../auth/guards';
import { KioskAttendanceDto } from '../dtos/kiosk-attendance.dto';
import { KioskStatusDto } from '../dtos/kiosk-status.dto';
import { AdminAttendanceDto } from '../dtos/admin-attendance.dto';

@ApiTags('Attendance')
@Controller('attendance')
export class AttendanceController {
  constructor(private attendanceService: AttendanceService) {}

  // ─── Kiosk / Staff Self Clock ──────────────────────────────────────────────
  @Post('kiosk/status')
  kioskStatus(@Body() body: KioskStatusDto) {
    return this.attendanceService.kioskStatus(body.employeeCode);
  }

  @Post('kiosk/clock-in')
  kioskClockIn(@Body() body: KioskAttendanceDto) {
    return this.attendanceService.kioskClockIn(body);
  }

  @Post('kiosk/clock-out')
  kioskClockOut(@Body() body: KioskAttendanceDto) {
    return this.attendanceService.kioskClockOut(body);
  }

  // ─── Authenticated Staff / Admin ───────────────────────────────────────────
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post('clock-in')
  @Permissions('clock:self')
  clockIn(@Request() req: any, @Body() body: { method?: string; note?: string }) {
    return this.attendanceService.clockIn(req.user.staffId, body.method, body.note);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post('clock-out')
  @Permissions('clock:self')
  clockOut(@Request() req: any, @Body() body: { method?: string; note?: string }) {
    return this.attendanceService.clockOut(req.user.staffId, body.method, body.note);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get('today')
  @Permissions('clock:self')
  getTodayStatus(@Request() req: any) {
    return this.attendanceService.getTodayStatus(req.user.staffId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get('today/list')
  @Permissions('view:attendance')
  getTodayList(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('department') department?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.attendanceService.getTodayList(req.user.staffId, req.user.id, {
      page,
      limit,
      search,
      department,
      from,
      to,
    });
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post('admin/clock-in')
  @Permissions('manage:attendance')
  adminClockIn(@Request() req: any, @Body() body: AdminAttendanceDto) {
    return this.attendanceService.adminClockIn(req.user.staffId, req.user.id, body);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post('admin/clock-out')
  @Permissions('manage:attendance')
  adminClockOut(@Request() req: any, @Body() body: AdminAttendanceDto) {
    return this.attendanceService.adminClockOut(req.user.staffId, req.user.id, body);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get('report/:staffId')
  @Permissions('view:attendance')
  getReport(
    @Param('staffId') staffId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.attendanceService.getAttendanceReport(staffId, new Date(from), new Date(to));
  }
}
