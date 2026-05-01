import { Body, Controller, Get, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions, PermissionsGuard } from '../auth/guards';
import { PermissionsService } from './permissions.service';
import { UpdateRolePermissionsDto } from './dtos/update-role-permissions.dto';

@ApiTags('Permissions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('permissions')
export class PermissionsController {
  constructor(private permissionsService: PermissionsService) {}

  @Get('roles')
  @Permissions('manage:permissions')
  listRolePermissions(@Request() req: any) {
    return this.permissionsService.listRolePermissions(req.user.hotelId);
  }

  @Patch('roles')
  @Permissions('manage:permissions')
  updateRolePermissions(@Request() req: any, @Body() dto: UpdateRolePermissionsDto) {
    return this.permissionsService.updateRolePermissions(req.user.hotelId, req.user.sub, dto);
  }

  @Post('roles/backfill')
  @Permissions('manage:permissions')
  backfillRolePermissions(@Request() req: any) {
    return this.permissionsService.backfillRolePermissions(req.user.hotelId, req.user.sub);
  }

  @Get('audit')
  @Permissions('manage:permissions')
  listAudit(@Request() req: any, @Query('limit') limit?: string) {
    const n = limit ? Number(limit) : 50;
    return this.permissionsService.listAudit(req.user.hotelId, Number.isFinite(n) ? n : 50);
  }
}
