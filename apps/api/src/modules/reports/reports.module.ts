import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { ReportsExportService } from './reports-export.service';
@Module({
  providers: [ReportsService, ReportsExportService],
  controllers: [ReportsController],
  exports: [ReportsService, ReportsExportService],
})
export class ReportsModule {}
