import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, Permissions, PermissionsGuard } from '../auth/guards';
import { HrContractsService } from './hr-contracts.service';
import { HrContractQueryDto } from './dtos/hr-contract-query.dto';
import { CreateHrContractDto } from './dtos/create-hr-contract.dto';
import { UpdateHrContractDto } from './dtos/update-hr-contract.dto';
import { UploadHrContractDocumentDto } from './dtos/upload-hr-contract-document.dto';
import { TerminateHrContractDto } from './dtos/terminate-hr-contract.dto';
import { RenewHrContractDto } from './dtos/renew-hr-contract.dto';
import { ApproveHrContractDto } from './dtos/approve-hr-contract.dto';
import { RejectHrContractDto } from './dtos/reject-hr-contract.dto';
import { UpsertHrContractApprovalRouteDto } from './dtos/upsert-hr-contract-approval-route.dto';
import { HrContractAuditLogQueryDto } from './dtos/hr-contract-audit-log-query.dto';
import { SignHrContractDto } from './dtos/sign-hr-contract.dto';

@ApiTags('HR Contracts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('hr/contracts')
export class HrContractsController {
  constructor(private readonly hrContractsService: HrContractsService) {}

  @Get()
  @Permissions('view:hr')
  @ApiOperation({ summary: 'List HR contracts' })
  list(@Request() req: any, @Query() query: HrContractQueryDto) {
    return this.hrContractsService.list(req.user.hotelId, query);
  }

  @Post('scan/notifications')
  @Permissions('manage:hr')
  @ApiOperation({ summary: 'Run HR contract expiry and stale approval notifications scan' })
  runNotificationsScan(@Request() req: any) {
    return this.hrContractsService.runNotificationsScan(req.user.hotelId, true);
  }

  @Get('overview')
  @Permissions('view:hr')
  @ApiOperation({ summary: 'Get HR contracts reporting overview' })
  getOverview(@Request() req: any) {
    return this.hrContractsService.getOverview(req.user.hotelId);
  }

  @Get('audit-logs')
  @Permissions('view:hr')
  @ApiOperation({ summary: 'List HR contract audit logs' })
  listAuditLogs(@Request() req: any, @Query() query: HrContractAuditLogQueryDto) {
    return this.hrContractsService.listAuditLogs(req.user.hotelId, query);
  }

  @Get('approval-routes')
  @Permissions('manage:hr')
  @ApiOperation({ summary: 'List HR contract approval routes' })
  listApprovalRoutes(@Request() req: any) {
    return this.hrContractsService.listApprovalRoutes(req.user.hotelId);
  }

  @Post('approval-routes')
  @Permissions('manage:hr')
  @ApiOperation({ summary: 'Create an HR contract approval route' })
  createApprovalRoute(@Request() req: any, @Body() dto: UpsertHrContractApprovalRouteDto) {
    return this.hrContractsService.createApprovalRoute(req.user.hotelId, dto);
  }

  @Patch('approval-routes/:id')
  @Permissions('manage:hr')
  @ApiOperation({ summary: 'Update an HR contract approval route' })
  updateApprovalRoute(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpsertHrContractApprovalRouteDto,
  ) {
    return this.hrContractsService.updateApprovalRoute(req.user.hotelId, id, dto);
  }

  @Get(':id')
  @Permissions('view:hr')
  @ApiOperation({ summary: 'Get one HR contract' })
  getOne(@Request() req: any, @Param('id') id: string) {
    return this.hrContractsService.getOne(req.user.hotelId, id);
  }

  @Post()
  @Permissions('manage:hr')
  @ApiOperation({ summary: 'Create HR contract' })
  create(@Request() req: any, @Body() dto: CreateHrContractDto) {
    return this.hrContractsService.create(req.user.hotelId, req.user.id ?? null, dto);
  }

  @Patch(':id')
  @Permissions('manage:hr')
  @ApiOperation({ summary: 'Update HR contract' })
  update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateHrContractDto) {
    return this.hrContractsService.update(req.user.hotelId, id, req.user.id ?? null, dto);
  }

  @Post(':id/documents')
  @Permissions('manage:hr')
  @ApiOperation({ summary: 'Upload HR contract document metadata/reference' })
  uploadDocument(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UploadHrContractDocumentDto,
  ) {
    return this.hrContractsService.uploadDocument(req.user.hotelId, id, req.user.id ?? null, dto);
  }

  @Post(':id/terminate')
  @Permissions('manage:hr')
  @ApiOperation({ summary: 'Terminate an HR contract early' })
  terminate(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: TerminateHrContractDto,
  ) {
    return this.hrContractsService.terminate(
      req.user.hotelId,
      id,
      req.user.id ?? null,
      dto,
    );
  }

  @Post(':id/renew')
  @Permissions('manage:hr')
  @ApiOperation({ summary: 'Renew an HR contract by creating a linked successor contract' })
  renew(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: RenewHrContractDto,
  ) {
    return this.hrContractsService.renew(req.user.hotelId, id, req.user.id ?? null, dto);
  }

  @Post(':id/submit')
  @Permissions('manage:hr')
  @ApiOperation({ summary: 'Submit an HR contract for approval' })
  submit(@Request() req: any, @Param('id') id: string) {
    return this.hrContractsService.submitForApproval(req.user.hotelId, id, req.user.id ?? null);
  }

  @Post(':id/approve')
  @Permissions('manage:hr')
  @ApiOperation({ summary: 'Approve an HR contract' })
  approve(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: ApproveHrContractDto,
  ) {
    return this.hrContractsService.approve(
      req.user.hotelId,
      id,
      req.user.id ?? null,
      req.user.role,
      dto,
    );
  }

  @Post(':id/reject')
  @Permissions('manage:hr')
  @ApiOperation({ summary: 'Reject an HR contract approval request' })
  reject(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: RejectHrContractDto,
  ) {
    return this.hrContractsService.reject(
      req.user.hotelId,
      id,
      req.user.id ?? null,
      req.user.role,
      dto,
    );
  }

  @Post(':id/sign')
  @Permissions('manage:hr')
  @ApiOperation({ summary: 'Mark an HR contract as signed and activate it' })
  sign(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: SignHrContractDto,
  ) {
    return this.hrContractsService.sign(req.user.hotelId, id, req.user.id ?? null, dto);
  }

  @Get(':id/download')
  @Permissions('view:hr')
  @ApiOperation({ summary: 'Download the generated HR contract PDF' })
  async download(@Request() req: any, @Param('id') id: string, @Res() res: any) {
    const { fileName, buffer } = await this.hrContractsService.downloadSummary(
      req.user.hotelId,
      id,
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(buffer);
  }
}
