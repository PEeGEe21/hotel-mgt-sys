import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PosTerminalAuthService } from '../services/pos-terminal-auth.service';
import { JwtAuthGuard, Permissions, PermissionsGuard } from '../../auth/guards';
import { TerminalSetupDto } from '../dtos/terminals/terminal-setup.dto';
import { StaffPinLoginDto } from '../dtos/terminals/staff-pin-login.dto';
import { getRequestIp, getUserAgent } from '../../../common/utils/request.utils';

@ApiTags('POS Terminal Auth')
@Controller('pos/terminals')
export class PosTerminalAuthController {
  constructor(private svc: PosTerminalAuthService) {}

  private getDeviceKey(req: any) {
    const key = req?.headers?.['x-pos-device-key'];
    return typeof key === 'string' && key.trim().length > 0 ? key.trim() : null;
  }

  // ── Public — no JWT needed ─────────────────────────────────────────────────
  // Terminal devices aren't logged in as users — they authenticate via setup code

  @Post('authenticate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate a device using setup code — binds device to terminal' })
  authenticate(@Request() req: any, @Body() dto: TerminalSetupDto) {
    return this.svc.authenticateTerminal(dto, {
      ipAddress: getRequestIp(req),
      userAgent: getUserAgent(req),
    });
  }

  @Post(':id/staff-login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Staff PIN login on a registered terminal' })
  staffLogin(@Request() req: any, @Param('id') id: string, @Body() dto: StaffPinLoginDto) {
    return this.svc.staffPinLogin(id, dto, this.getDeviceKey(req));
  }

  @Post(':id/staff-logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Staff logout from terminal' })
  staffLogout(@Request() req: any, @Param('id') id: string) {
    return this.svc.staffLogout(id, this.getDeviceKey(req));
  }

  @Get(':id/status')
  @ApiOperation({ summary: 'Get terminal status — who is logged in, setup code exists etc' })
  getStatus(@Request() req: any, @Param('id') id: string) {
    return this.svc.getTerminalStatus(id, this.getDeviceKey(req));
  }

  // ── Protected — manager only ───────────────────────────────────────────────
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  @Post(':id/setup-code')
  @HttpCode(HttpStatus.OK)
  @Permissions('manage:pos')
  @ApiOperation({ summary: 'Generate a one-time setup code for a terminal (manager action)' })
  generateSetupCode(@Request() req: any, @Param('id') id: string) {
    return this.svc.generateSetupCode(req.user.hotelId, id);
  }
}
