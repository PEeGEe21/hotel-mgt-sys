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
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TerminalSetupDto } from '../dtos/terminals/terminal-setup.dto';
import { StaffPinLoginDto } from '../dtos/terminals/staff-pin-login.dto';

@ApiTags('POS Terminal Auth')
@Controller('pos/terminals')
export class PosTerminalAuthController {
  constructor(private svc: PosTerminalAuthService) {}

  // ── Public — no JWT needed ─────────────────────────────────────────────────
  // Terminal devices aren't logged in as users — they authenticate via setup code

  @Post('authenticate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate a device using setup code — binds device to terminal' })
  authenticate(@Body() dto: TerminalSetupDto) {
    // hotelId is embedded in the setup code lookup — no auth header needed
    // This endpoint is intentionally public so unregistered devices can call it
    return this.svc.authenticateTerminal(dto);
  }

  @Post(':id/staff-login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Staff PIN login on a registered terminal' })
  staffLogin(@Param('id') id: string, @Body() dto: StaffPinLoginDto) {
    return this.svc.staffPinLogin(id, dto);
  }

  @Post(':id/staff-logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Staff logout from terminal' })
  staffLogout(@Param('id') id: string) {
    return this.svc.staffLogout(id);
  }

  @Get(':id/status')
  @ApiOperation({ summary: 'Get terminal status — who is logged in, setup code exists etc' })
  getStatus(@Param('id') id: string) {
    return this.svc.getTerminalStatus(id);
  }

  // ── Protected — manager only ───────────────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post(':id/setup-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate a one-time setup code for a terminal (manager action)' })
  generateSetupCode(@Request() req: any, @Param('id') id: string) {
    return this.svc.generateSetupCode(req.user.hotelId, id);
  }
}
