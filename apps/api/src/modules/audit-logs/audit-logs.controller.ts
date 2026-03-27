import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, Roles, RolesGuard } from '../auth/guards';
import { AuditLogsService } from './audit-logs.service';

@ApiTags('Audit Logs')
@Controller('audit-logs')
export class AuditLogsController {
  constructor(private auditLogsService: AuditLogsService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Get()
  @ApiOperation({ summary: 'List audit logs (admin only)' })
  list(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('action') action?: string,
    @Query('actorUserId') actorUserId?: string,
    @Query('targetUserId') targetUserId?: string,
    @Query('search') search?: string,
  ) {
    return this.auditLogsService.list({
      hotelId: req.user.hotelId,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      action,
      actorUserId,
      targetUserId,
      search,
    });
  }
}
