import { Body, Controller, Delete, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions, PermissionsGuard } from '../auth/guards';
import { InventoryCategoriesService } from './inventory-categories.service';
import { CreateInventoryCategoryDto } from './dtos/create-inventory-category.dto';
import { UpdateInventoryCategoryDto } from './dtos/update-inventory-category.dto';

@ApiTags('Inventory Categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('inventory-categories')
export class InventoryCategoriesController {
  constructor(private inventoryCategoriesService: InventoryCategoriesService) {}

  @Get()
  @Permissions('view:settings')
  list(@Request() req: any) {
    return this.inventoryCategoriesService.list(req.user.hotelId);
  }

  @Post()
  @Permissions('manage:settings')
  create(@Request() req: any, @Body() dto: CreateInventoryCategoryDto) {
    return this.inventoryCategoriesService.create(req.user.hotelId, dto);
  }

  @Patch(':id')
  @Permissions('manage:settings')
  update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateInventoryCategoryDto) {
    return this.inventoryCategoriesService.update(req.user.hotelId, id, dto);
  }

  @Delete(':id')
  @Permissions('manage:settings')
  remove(@Request() req: any, @Param('id') id: string) {
    return this.inventoryCategoriesService.remove(req.user.hotelId, id);
  }
}
