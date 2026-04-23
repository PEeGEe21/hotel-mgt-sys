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
import { PosProductsService } from '../services/pos-products.service';
import { JwtAuthGuard, Permissions, PermissionsGuard } from '../../auth/guards';
import { ProductFilterDto } from '../dtos/products/product-filter.dto';
import { CreateProductDto } from '../dtos/products/create-product.dto';
import { UpdateProductDto } from '../dtos/products/update-product.dto';
import { CreatePosProductCategoryDto } from '../dtos/products/create-pos-product-category.dto';
import { UpdatePosProductCategoryDto } from '../dtos/products/update-pos-product-category.dto';

@ApiTags('POS Products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('pos/products')
export class PosProductsController {
  constructor(private svc: PosProductsService) {}

  @Get('categories')
  @Permissions('manage:settings')
  @ApiOperation({ summary: 'List all product categories' })
  getCategories(@Request() req: any) {
    return this.svc.getCategories(req.user.hotelId);
  }

  @Post('categories')
  @Permissions('manage:settings')
  createCategory(@Request() req: any, @Body() dto: CreatePosProductCategoryDto) {
    return this.svc.createCategory(req.user.hotelId, dto);
  }

  @Patch('categories/:id')
  @Permissions('manage:settings')
  updateCategory(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdatePosProductCategoryDto,
  ) {
    return this.svc.updateCategory(req.user.hotelId, id, dto);
  }

  @Delete('categories/:id')
  @Permissions('manage:settings')
  removeCategory(@Request() req: any, @Param('id') id: string) {
    return this.svc.removeCategory(req.user.hotelId, id);
  }

  @Get('inventory-items')
  @Permissions('view:pos')
  @ApiOperation({ summary: 'Search inventory items for ingredient picker' })
  getInventoryItems(@Request() req: any, @Query('search') search?: string) {
    return this.svc.getInventoryItems(req.user.hotelId, search);
  }

  @Get()
  @Permissions('view:pos')
  @ApiOperation({ summary: 'List products with filters' })
  findAll(@Request() req: any, @Query() filters: ProductFilterDto) {
    return this.svc.findAll(req.user.hotelId, filters);
  }

  @Get(':id')
  @Permissions('view:pos')
  @ApiOperation({ summary: 'Get single product with ingredients' })
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.svc.findOne(req.user.hotelId, id);
  }

  @Post()
  @Permissions('manage:pos')
  @ApiOperation({ summary: 'Create product (physical/bundle must have ingredients)' })
  create(@Request() req: any, @Body() dto: CreateProductDto) {
    return this.svc.create(req.user.hotelId, dto);
  }

  @Put(':id')
  @Permissions('manage:pos')
  @ApiOperation({ summary: 'Update product and ingredients' })
  update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.svc.update(req.user.hotelId, id, dto);
  }

  @Patch(':id/toggle')
  @Permissions('manage:pos')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle product availability' })
  toggle(@Request() req: any, @Param('id') id: string) {
    return this.svc.toggleAvailability(req.user.hotelId, id);
  }

  @Delete(':id')
  @Permissions('manage:pos')
  @ApiOperation({ summary: 'Delete product (archives if has order history)' })
  remove(@Request() req: any, @Param('id') id: string) {
    return this.svc.remove(req.user.hotelId, id);
  }
}
