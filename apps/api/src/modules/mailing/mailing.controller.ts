import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, Roles, RolesGuard } from '../auth/guards';
import { MailingService } from './mailing.service';

@ApiTags('Mailing')
@Controller('mailing')
export class MailingController {
  constructor(private mailingService: MailingService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Get('emails')
  @ApiOperation({ summary: 'List outbound email delivery logs (admin only)' })
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
