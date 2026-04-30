import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, Permissions, PermissionsGuard } from '../auth/guards';
import { MailingService } from './mailing.service';

@ApiTags('Mailing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('mailing')
export class MailingController {
  constructor(private mailingService: MailingService) {}

  @Get('emails')
  @Permissions('view:mailing')
  @ApiOperation({ summary: 'List outbound email delivery logs' })
  list(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('event') event?: string,
    @Query('search') search?: string,
  ) {
    return this.mailingService.list({
      hotelId: req.user.hotelId ?? null,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      status,
      event,
      search,
    });
  }
}
