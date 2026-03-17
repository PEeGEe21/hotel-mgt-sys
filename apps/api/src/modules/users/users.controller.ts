import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions, PermissionsGuard } from '../auth/guards';
import { CreateUserAccountDto } from './dtos/create-user-account.dto';
import { UpdateUserAccountDto } from './dtos/update-user-account.dto';
import { ResetPasswordDto } from './dtos/reset-password.dto';
import { UpdateUserPermissionsDto } from './dtos/update-user-permissions.dto';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @Permissions('view:hr')
  list(@Request() req: any, @Query('search') search?: string) {
    return this.usersService.list(req.user.hotelId, search);
  }

  @Post()
  @Permissions('manage:hr')
  create(@Request() req: any, @Body() dto: CreateUserAccountDto) {
    return this.usersService.create(req.user.hotelId, dto);
  }

  @Patch(':id')
  @Permissions('manage:hr')
  update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateUserAccountDto) {
    return this.usersService.update(req.user.hotelId, id, dto);
  }

  @Patch(':id/permissions')
  @Permissions('manage:permissions')
  updatePermissions(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateUserPermissionsDto,
  ) {
    return this.usersService.updatePermissions(req.user.hotelId, req.user.sub, id, dto);
  }

  @Patch(':id/reset-password')
  @Permissions('manage:hr')
  resetPassword(@Request() req: any, @Param('id') id: string, @Body() dto: ResetPasswordDto) {
    return this.usersService.resetPassword(req.user.hotelId, id, dto);
  }

  @Delete(':id')
  @Permissions('manage:hr')
  remove(@Request() req: any, @Param('id') id: string) {
    return this.usersService.remove(req.user.hotelId, id);
  }
}
