import {
  Body, Controller, Delete, Get, Param, Patch, Post,
  Query, Request, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions, PermissionsGuard } from '../auth/guards';

@ApiTags('Inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  @Get()
  @Permissions('view:inventory')
  list(
    @Request() req: any,
    @Query('page')     page?: string,
    @Query('limit')    limit?: string,
    @Query('search')   search?: string,
    @Query('category') category?: string,
  ) {
    return this.inventoryService.list(req.user.hotelId, { page, limit, search, category });
  }

  @Get('movements')
  @Permissions('view:inventory')
  getMovements(
    @Request() req: any,
    @Query('itemId')   itemId?: string,
    @Query('type')     type?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo')   dateTo?: string,
    @Query('page')     page?: string,
    @Query('limit')    limit?: string,
  ) {
    return this.inventoryService.getMovements(req.user.hotelId, {
      itemId, type, dateFrom, dateTo, page, limit,
    });
  }

  @Get('valuation')
  @Permissions('view:inventory')
  getValuation(@Request() req: any) {
    return this.inventoryService.getValuation(req.user.hotelId);
  }

  @Get('generate-sku')
  @Permissions('create:inventory')
  generateSku(@Request() req: any) {
    return this.inventoryService.generateSku(req.user.hotelId);
  }

  @Get(':id')
  @Permissions('view:inventory')
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.inventoryService.findOne(req.user.hotelId, id);
  }

  @Post()
  @Permissions('create:inventory')
  create(@Request() req: any, @Body() dto: any) {
    return this.inventoryService.create(req.user.hotelId, dto);
  }

  @Post(':id/movements')
  @Permissions('edit:inventory')
  recordMovement(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: {
      type:      'IN' | 'OUT' | 'WASTAGE' | 'ADJUSTMENT';
      quantity:  number;
      note?:     string;
      staffId?:  string;
    },
  ) {
    return this.inventoryService.recordMovement(req.user.hotelId, id, {
      ...dto,
      staffId: req.user.staffId,
    });
  }

  @Patch(':id')
  @Permissions('edit:inventory')
  update(@Request() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.inventoryService.update(req.user.hotelId, id, dto);
  }

  @Delete(':id')
  @Permissions('delete:inventory')
  remove(@Request() req: any, @Param('id') id: string) {
    return this.inventoryService.remove(req.user.hotelId, id);
  }
}
