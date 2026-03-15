import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Param,
  Body,
  Query,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { HousekeepingService } from '../services/housekeeping.service';
import { TaskPriority } from '@prisma/client';
import { JwtAuthGuard } from 'src/modules/auth/guards';
import { TaskFilterDto } from '../dtos/task-filter.dto';
import { CreateTaskDto } from '../dtos/create-task.dto';
import { BulkCreateDto } from '../dtos/bulk-create.dto';
import { UpdateTaskDto } from '../dtos/update-task.dto';
import { AssignDto } from '../dtos/assign.dto';

@ApiTags('Housekeeping')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('housekeeping')
export class HousekeepingController {
  constructor(private svc: HousekeepingService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Overview stats + floor summary' })
  getStats(@Request() req: any) {
    return this.svc.getStats(req.user.hotelId);
  }

  @Get('staff')
  @ApiOperation({ summary: 'List housekeeping staff with active task count' })
  getStaff(@Request() req: any) {
    return this.svc.getStaff(req.user.hotelId);
  }

  @Get()
  @ApiOperation({ summary: 'List tasks with filters' })
  findAll(@Request() req: any, @Query() filters: TaskFilterDto) {
    return this.svc.findAll(req.user.hotelId, filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single task' })
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.svc.findOne(req.user.hotelId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a housekeeping task' })
  create(@Request() req: any, @Body() dto: CreateTaskDto) {
    return this.svc.create(req.user.hotelId, dto);
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Bulk create tasks for multiple rooms' })
  bulkCreate(@Request() req: any, @Body() dto: BulkCreateDto) {
    return this.svc.bulkCreate(
      req.user.hotelId,
      dto.roomIds,
      dto.type,
      dto.priority ?? TaskPriority.NORMAL,
    );
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update task details, status, priority' })
  update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateTaskDto) {
    return this.svc.update(req.user.hotelId, id, dto);
  }

  @Patch(':id/done')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark task done — updates room status if no remaining tasks' })
  markDone(@Request() req: any, @Param('id') id: string) {
    return this.svc.markDone(req.user.hotelId, id);
  }

  @Patch(':id/assign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Assign or unassign a task' })
  assign(@Request() req: any, @Param('id') id: string, @Body() dto: AssignDto) {
    return this.svc.assign(req.user.hotelId, id, dto.staffId ?? null);
  }
}
