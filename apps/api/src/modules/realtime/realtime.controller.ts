import { Body, Controller, Get, Patch, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, Permissions, PermissionsGuard } from '../auth/guards';
import { RealtimeDiagnosticsService } from './realtime-diagnostics.service';
import { UpdateRealtimeSettingsDto } from './dtos/update-realtime-settings.dto';

@ApiTags('Realtime')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('realtime')
export class RealtimeController {
  constructor(private readonly diagnosticsService: RealtimeDiagnosticsService) {}

  @Get('diagnostics')
  @Permissions('manage:settings')
  @ApiOperation({ summary: 'Get persisted realtime diagnostics for the current hotel' })
  diagnostics(@Request() req: any, @Query('limit') limit?: string) {
    return this.diagnosticsService.getHotelDiagnostics(
      req.user.hotelId,
      limit ? Number(limit) : undefined,
    );
  }

  @Get('settings')
  @Permissions('view:settings')
  @ApiOperation({ summary: 'Get realtime diagnostics settings for the current hotel' })
  settings(@Request() req: any) {
    return this.diagnosticsService.getRealtimeSettings(req.user.hotelId);
  }

  @Patch('settings')
  @Permissions('manage:settings')
  @ApiOperation({ summary: 'Update realtime diagnostics settings for the current hotel' })
  updateSettings(@Request() req: any, @Body() dto: UpdateRealtimeSettingsDto) {
    return this.diagnosticsService.updateRealtimeSettings(req.user.hotelId, dto);
  }
}
