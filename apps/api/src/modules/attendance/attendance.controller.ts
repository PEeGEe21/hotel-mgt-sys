import { Controller, Post, Get, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Attendance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private attendanceService: AttendanceService) {}

  @Post('clock-in')
  clockIn(@Request() req: any, @Body() body: { method?: string; note?: string }) {
    return this.attendanceService.clockIn(req.user.staffId, body.method, body.note);
  }

  @Post('clock-out')
  clockOut(@Request() req: any, @Body() body: { method?: string; note?: string }) {
    return this.attendanceService.clockOut(req.user.staffId, body.method, body.note);
  }

  @Get('today')
  getTodayStatus(@Request() req: any) {
    return this.attendanceService.getTodayStatus(req.user.staffId);
  }

  @Get('report/:staffId')
  getReport(
    @Param('staffId') staffId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.attendanceService.getAttendanceReport(staffId, new Date(from), new Date(to));
  }
}
