import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions, PermissionsGuard } from '../auth/guards';
import { CreateInventoryItemDto } from './dtos/create-inventory-item.dto';
import { UpdateInventoryItemDto } from './dtos/update-inventory-item.dto';

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
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('category') category?: string,
  ) {
    return this.inventoryService.list(req.user.hotelId, {
      page,
      limit,
      search,
      category,
    });
  }

  @Post()
  @Permissions('create:inventory')
  create(@Request() req: any, @Body() dto: CreateInventoryItemDto) {
    return this.inventoryService.create(req.user.hotelId, dto);
  }

  @Get('generate-sku')
  @Permissions('create:inventory')
  generateSku(@Request() req: any) {
    return this.inventoryService.generateSku(req.user.hotelId);
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
