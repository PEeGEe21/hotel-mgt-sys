import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JobTitlesController } from './controllers/job-titles.controller';
import { JobTitlesService } from './services/job-titles.service';

@Module({
  controllers: [JobTitlesController],
  providers: [JobTitlesService, PrismaService],
})
export class JobTitlesModule {}
