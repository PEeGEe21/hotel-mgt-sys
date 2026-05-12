import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Permissions, PermissionsGuard } from '../../auth/guards';
import { JobTitlesService } from '../services/job-titles.service';
import { CreateJobTitleDto } from '../dtos/create-job-title.dto';
import { UpdateJobTitleDto } from '../dtos/update-job-title.dto';

@ApiTags('Job Titles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('job-titles')
export class JobTitlesController {
  constructor(private readonly jobTitlesService: JobTitlesService) {}

  @Get()
  @Permissions('view:settings')
  list(@Request() req: any) {
    return this.jobTitlesService.list(req.user.hotelId);
  }

  @Post()
  @Permissions('manage:settings')
  create(@Request() req: any, @Body() dto: CreateJobTitleDto) {
    return this.jobTitlesService.create(req.user.hotelId, dto);
  }

  @Patch(':id')
  @Permissions('manage:settings')
  update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateJobTitleDto) {
    return this.jobTitlesService.update(req.user.hotelId, id, dto);
  }

  @Delete(':id')
  @Permissions('manage:settings')
  remove(@Request() req: any, @Param('id') id: string) {
    return this.jobTitlesService.remove(req.user.hotelId, id);
  }
}
