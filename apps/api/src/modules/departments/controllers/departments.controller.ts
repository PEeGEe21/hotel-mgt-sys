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
import { DepartmentsService } from '../services/departments.service';
import { CreateDepartmentDto } from '../dtos/create-department.dto';
import { UpdateDepartmentDto } from '../dtos/update-department.dto';

@ApiTags('Departments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('departments')
export class DepartmentsController {
  constructor(private departmentsService: DepartmentsService) {}

  @Get()
  @Permissions('view:settings')
  list(@Request() req: any) {
    return this.departmentsService.list(req.user.hotelId);
  }

  @Post()
  @Permissions('manage:settings')
  create(@Request() req: any, @Body() dto: CreateDepartmentDto) {
    return this.departmentsService.create(req.user.hotelId, dto);
  }

  @Patch(':id')
  @Permissions('manage:settings')
  update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateDepartmentDto) {
    return this.departmentsService.update(req.user.hotelId, id, dto);
  }

  @Delete(':id')
  @Permissions('manage:settings')
  remove(@Request() req: any, @Param('id') id: string) {
    return this.departmentsService.remove(req.user.hotelId, id);
  }
}
