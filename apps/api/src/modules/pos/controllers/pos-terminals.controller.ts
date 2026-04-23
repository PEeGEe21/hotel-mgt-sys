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
import { PosTerminalsService } from '../services/pos-terminals.service';
import { CreatePosTerminalDto } from '../dtos/terminals/create-pos-terminal.dto';
import { UpdatePosTerminalDto } from '../dtos/terminals/update-pos-terminal.dto';
import { UpdatePosTerminalGroupDto } from '../dtos/terminals/update-pos-terminal-group.dto';
import { CreatePosTerminalGroupDto } from '../dtos/terminals/create-pos-terminal-group.dto';

@ApiTags('POS Terminals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('pos/terminals')
export class PosTerminalsController {
  constructor(private posTerminalsService: PosTerminalsService) {}

  @Get()
  @Permissions('view:pos')
  list(@Request() req: any) {
    return this.posTerminalsService.list(req.user.hotelId);
  }

  @Post()
  @Permissions('manage:pos')
  create(@Request() req: any, @Body() dto: CreatePosTerminalDto) {
    return this.posTerminalsService.create(req.user.hotelId, dto);
  }

  @Patch(':id')
  @Permissions('manage:pos')
  update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdatePosTerminalDto) {
    return this.posTerminalsService.update(req.user.hotelId, id, dto);
  }

  @Delete(':id')
  @Permissions('manage:pos')
  remove(@Request() req: any, @Param('id') id: string) {
    return this.posTerminalsService.remove(req.user.hotelId, id);
  }

  @Post('group')
  @Permissions('manage:pos')
  createGroup(@Request() req: any, @Body() dto: CreatePosTerminalGroupDto) {
    return this.posTerminalsService.createGroup(req.user.hotelId, dto);
  }

  @Patch('group/:id')
  @Permissions('manage:pos')
  updateGroup(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdatePosTerminalGroupDto,
  ) {
    return this.posTerminalsService.updateGroup(req.user.hotelId, id, dto);
  }

  @Get('groups')
  @Permissions('view:pos')
  findAll(@Request() req: any) {
    return this.posTerminalsService.findAllGroups(req.user.hotelId);
  }
}
