import {
  Body, Controller, Delete, Get, Param, Patch, Post,
  Query, Request, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions, PermissionsGuard } from '../auth/guards';
import { CreateInventoryItemDto } from './dtos/create-inventory-item.dto';
import { UpdateInventoryItemDto } from './dtos/update-inventory-item.dto';
import { InventoryListQueryDto, InventoryMovementQueryDto } from './dtos/inventory-query.dto';
import { RecordStockMovementDto } from './dtos/record-stock-movement.dto';

@ApiTags('Inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  @Get()
  @Permissions('view:inventory')
  list(@Request() req: any, @Query() query: InventoryListQueryDto) {
    return this.inventoryService.list(req.user.hotelId, query);
  }

  @Get('movements')
  @Permissions('view:inventory')
  getMovements(@Request() req: any, @Query() query: InventoryMovementQueryDto) {
    return this.inventoryService.getMovements(req.user.hotelId, query);
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
  create(@Request() req: any, @Body() dto: CreateInventoryItemDto) {
    return this.inventoryService.create(req.user.hotelId, dto);
  }

  @Post(':id/movements')
  @Permissions('edit:inventory')
  recordMovement(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: RecordStockMovementDto,
  ) {
    return this.inventoryService.recordMovement(req.user.hotelId, id, {
      ...dto,
      staffId: req.user.staffId,
    });
  }

  @Patch(':id')
  @Permissions('edit:inventory')
  update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateInventoryItemDto) {
    return this.inventoryService.update(req.user.hotelId, id, dto);
  }

  @Delete(':id')
  @Permissions('delete:inventory')
  remove(@Request() req: any, @Param('id') id: string) {
    return this.inventoryService.remove(req.user.hotelId, id);
  }
}
