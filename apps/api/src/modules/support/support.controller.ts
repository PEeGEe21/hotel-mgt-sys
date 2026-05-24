import { Body, Controller, Get, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SupportService } from './support.service';
import { CreateTenantSupportCaseDto } from './dtos/create-tenant-support-case.dto';
import { QueryTenantSupportCasesDto } from './dtos/query-tenant-support-cases.dto';

@ApiTags('Support')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Get('cases')
  @ApiOperation({ summary: 'List tenant-visible support cases for the current hotel' })
  listCases(@Request() req: any, @Query() query: QueryTenantSupportCasesDto) {
    return this.supportService.listCases({
      hotelId: req.user.hotelId,
      actorUserId: req.user.sub,
      role: req.user.role,
      status: query.status,
      priority: query.priority,
      search: query.search,
    });
  }

  @Get('cases/:id')
  @ApiOperation({ summary: 'Get one tenant-visible support case' })
  getCaseDetail(@Request() req: any, @Param('id') id: string) {
    return this.supportService.getCaseDetail({
      hotelId: req.user.hotelId,
      actorUserId: req.user.sub,
      role: req.user.role,
      caseId: id,
    });
  }

  @Post('cases')
  @ApiOperation({ summary: 'Create a tenant support case' })
  createCase(@Request() req: any, @Body() dto: CreateTenantSupportCaseDto) {
    return this.supportService.createCase({
      hotelId: req.user.hotelId,
      actorUserId: req.user.sub,
      dto,
    });
  }
}
