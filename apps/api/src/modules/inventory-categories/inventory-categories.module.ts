import { Module } from '@nestjs/common';
import { InventoryCategoriesController } from './inventory-categories.controller';
import { InventoryCategoriesService } from './inventory-categories.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [InventoryCategoriesController],
  providers: [InventoryCategoriesService, PrismaService],
})
export class InventoryCategoriesModule {}
