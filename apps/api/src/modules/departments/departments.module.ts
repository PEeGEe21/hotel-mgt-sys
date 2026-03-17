import { Module } from '@nestjs/common';
import { DepartmentsController } from './controllers/departments.controller';
import { DepartmentsService } from './services/departments.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [DepartmentsController],
  providers: [DepartmentsService, PrismaService],
})
export class DepartmentsModule {}
