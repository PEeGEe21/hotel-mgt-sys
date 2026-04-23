import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PosTablesService } from '../services/pos-tables.service';
import { JwtAuthGuard, Permissions, PermissionsGuard } from 'src/modules/auth/guards';
import { ReorderTablesDto } from '../dtos/tables/reorder-table.dto';
import { CreateTableDto } from '../dtos/tables/create-table.dto';
import { UpdateTableDto } from '../dtos/tables/update-table.dto';

@ApiTags('POS Tables')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('pos/tables')
export class PosTablesController {
  constructor(private svc: PosTablesService) {}

  @Get('sections')
  @Permissions('view:pos')
  @ApiOperation({ summary: 'List all table sections' })
  getSections(@Request() req: any) {
    return this.svc.getSections(req.user.hotelId);
  }

  @Post('seed')
  @Permissions('manage:pos')
  @ApiOperation({ summary: 'Seed default tables for a new hotel' })
  seed(@Request() req: any) {
    return this.svc.seed(req.user.hotelId);
  }

  @Post('reorder')
  @Permissions('manage:pos')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reorder tables within sections' })
  reorder(@Request() req: any, @Body() dto: ReorderTablesDto) {
    return this.svc.reorder(req.user.hotelId, dto);
  }

  @Get()
  @Permissions('view:pos')
  @ApiOperation({ summary: 'List all tables grouped by section' })
  findAll(@Request() req: any, @Query('includeInactive') includeInactive?: string) {
    return this.svc.findAll(req.user.hotelId, includeInactive === 'true');
  }

  @Get(':id')
  @Permissions('view:pos')
  @ApiOperation({ summary: 'Get table with open orders' })
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.svc.findOne(req.user.hotelId, id);
  }

  @Get(':id/orders')
  @Permissions('view:pos')
  @ApiOperation({ summary: 'Get open unpaid orders for a table' })
  getOpenOrders(@Request() req: any, @Param('id') id: string) {
    return this.svc.getOpenOrders(req.user.hotelId, id);
  }

  @Post()
  @Permissions('manage:pos')
  @ApiOperation({ summary: 'Create a table' })
  create(@Request() req: any, @Body() dto: CreateTableDto) {
    return this.svc.create(req.user.hotelId, dto);
  }

  @Put(':id')
  @Permissions('manage:pos')
  @ApiOperation({ summary: 'Update table details' })
  update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateTableDto) {
    return this.svc.update(req.user.hotelId, id, dto);
  }

  @Patch(':id/toggle')
  @Permissions('manage:pos')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle table active/inactive' })
  toggle(@Request() req: any, @Param('id') id: string) {
    return this.svc.toggle(req.user.hotelId, id);
  }

  @Delete(':id')
  @Permissions('manage:pos')
  @ApiOperation({ summary: 'Delete table (deactivates if has order history)' })
  remove(@Request() req: any, @Param('id') id: string) {
    return this.svc.remove(req.user.hotelId, id);
  }
}
