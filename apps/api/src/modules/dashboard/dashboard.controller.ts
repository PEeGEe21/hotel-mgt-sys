import { Controller, Get, Param, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, Permissions, PermissionsGuard } from '../auth/guards';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('config')
  @Permissions('view:dashboard')
  @ApiOperation({ summary: 'Get dashboard widget config for the current user role' })
  getConfig(@Request() req: any) {
    return this.dashboardService.getConfig(req.user.sub);
  }

  @Get('feature-flags')
  @Permissions('view:dashboard')
  @ApiOperation({ summary: 'Get dashboard feature flags for the current user context' })
  getFeatureFlags(@Request() req: any) {
    return this.dashboardService.getFeatureFlags(req.user.sub);
  }

  @Get('widgets/:widgetId')
  @Permissions('view:dashboard')
  @ApiOperation({ summary: 'Get dashboard widget data for the current user context' })
  getWidgetData(@Request() req: any, @Param('widgetId') widgetId: string) {
    return this.dashboardService.getWidgetData(req.user.sub, widgetId);
  }
}
