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
import {
  FeatureFlagsGuard,
  JwtAuthGuard,
  Permissions,
  PermissionsGuard,
  RequireFeatureFlags,
} from 'src/modules/auth/guards';
import { KeycardsService } from '../services/keycards.service';
import { IssueKeycardDto } from '../dtos/issue-keycard.dto';
import { RevokeKeycardDto } from '../dtos/revoke-keycard.dto';
import { IngestKeycardAccessEventDto } from '../dtos/ingest-keycard-access-event.dto';

@ApiTags('Keycards')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard, FeatureFlagsGuard)
@RequireFeatureFlags('keycard_auth')
@Controller('keycards')
export class KeycardsController {
  constructor(private readonly svc: KeycardsService) {}

  @Get('reservation/:reservationId')
  @Permissions('view:reservations')
  @ApiOperation({ summary: 'List keycards for a reservation' })
  listByReservation(@Request() req: any, @Param('reservationId') reservationId: string) {
    return this.svc.listByReservation(req.user.hotelId, reservationId);
  }

  @Get(':id/logs')
  @Permissions('view:reservations')
  @ApiOperation({ summary: 'Get keycard access logs (cursor pagination)' })
  getLogs(
    @Request() req: any,
    @Param('id') id: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.svc.getLogs(req.user.hotelId, id, {
      cursor,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post('issue')
  @Permissions('edit:reservations')
  @ApiOperation({ summary: 'Issue a reservation-backed keycard' })
  issue(@Request() req: any, @Body() dto: IssueKeycardDto) {
    return this.svc.issue(req.user.hotelId, req.user.sub, req.user.staffId ?? null, dto, {
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    });
  }

  @Patch(':id/revoke')
  @Permissions('edit:reservations')
  @ApiOperation({ summary: 'Revoke a keycard' })
  revoke(@Request() req: any, @Param('id') id: string, @Body() dto: RevokeKeycardDto) {
    return this.svc.revoke(req.user.hotelId, req.user.sub, id, dto, {
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    });
  }

  @Patch(':id/report-lost')
  @Permissions('edit:reservations')
  @ApiOperation({ summary: 'Report a keycard as lost' })
  reportLost(@Request() req: any, @Param('id') id: string, @Body() dto: RevokeKeycardDto) {
    return this.svc.reportLost(req.user.hotelId, req.user.sub, id, dto, {
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    });
  }

  @Post('reservation/:reservationId/revoke-all')
  @Permissions('edit:reservations')
  @ApiOperation({ summary: 'Revoke all keycards for a reservation' })
  revokeAll(
    @Request() req: any,
    @Param('reservationId') reservationId: string,
    @Body() dto: RevokeKeycardDto,
  ) {
    return this.svc.revokeAllForReservation(req.user.hotelId, req.user.sub, reservationId, dto, {
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    });
  }

  @Post('ingest-access-event')
  @Permissions('manage:settings')
  @ApiOperation({ summary: 'Ingest a keycard access event' })
  ingestAccessEvent(@Request() req: any, @Body() dto: IngestKeycardAccessEventDto) {
    return this.svc.ingestAccessEvent(req.user.hotelId, req.user.sub, dto, {
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    });
  }
}
