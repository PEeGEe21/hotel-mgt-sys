import { Body, Controller, Get, Param, Put, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, Permissions, PermissionsGuard } from '../auth/guards';
import { DashboardService } from './dashboard.service';
import { UpdateDashboardLayoutDto } from './dtos/update-dashboard-layout.dto';

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

  @Get('admin/layouts')
  @Permissions('manage:settings')
  @ApiOperation({ summary: 'Get editable dashboard layouts for all roles' })
  getAdminLayouts(@Request() req: any) {
    return this.dashboardService.getAdminLayouts(req.user.sub);
  }

  @Put('admin/layouts')
  @Permissions('manage:settings')
  @ApiOperation({ summary: 'Update dashboard layouts for roles' })
  updateAdminLayouts(@Request() req: any, @Body() dto: UpdateDashboardLayoutDto) {
    return this.dashboardService.updateAdminLayouts(req.user.sub, dto);
  }
}
