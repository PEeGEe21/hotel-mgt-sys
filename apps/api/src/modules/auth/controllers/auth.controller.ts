import {
  Controller,
  Post,
  Get,
  Body,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
  Patch,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthService } from '../services/auth.service';
import { JwtAuthGuard, LocalAuthGuard, Roles, RolesGuard } from '../guards/index';
import { RefreshDto } from '../dtos/refresh.dto';
import { LogoutDto } from '../dtos/logout.dto';
import { UpdateMeDto } from '../dtos/update-me.dto';
import { ForgotPasswordDto } from '../dtos/forgot-password.dto';
import { ResetPasswordDto } from '../dtos/reset-password.dto';
import { ChangePasswordDto } from '../dtos/change-password.dto';
import { getRequestIp, getUserAgent } from '../../../common/utils/request.utils';

// ─── Controller ────────────────────────────────────────────────────────────────
@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get('hotel-info')
  @ApiOperation({ summary: 'Public hotel info for login page branding' })
  getHotelInfo(@Query('domain') domain?: string) {
    return this.authService.getPublicHotelInfo(domain);
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  login(@Request() req: any) {
    return this.authService.login(req.user, {
      ipAddress: getRequestIp(req),
      userAgent: getUserAgent(req),
    });
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request a password reset email' })
  forgotPassword(@Request() req: any, @Body() dto: ForgotPasswordDto) {
    return this.authService.requestPasswordReset(dto.email, {
      ipAddress: getRequestIp(req),
      userAgent: getUserAgent(req),
    });
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using an email token' })
  resetPassword(@Request() req: any, @Body() dto: ResetPasswordDto) {
    return this.authService.resetPasswordWithToken(dto.token, dto.newPassword, {
      ipAddress: getRequestIp(req),
      userAgent: getUserAgent(req),
    });
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout current session' })
  logout(@Request() req: any, @Body() dto: LogoutDto) {
    return this.authService.logout(req.user.sub, dto.refreshToken, {
      ipAddress: getRequestIp(req),
      userAgent: getUserAgent(req),
    });
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout all sessions' })
  logoutAll(@Request() req: any) {
    return this.authService.logoutAll(req.user.sub, {
      ipAddress: getRequestIp(req),
      userAgent: getUserAgent(req),
    });
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  getMe(@Request() req: any) {
    return this.authService.getMe(req.user.sub, {
      impersonatorId: req.user.impersonatorId ?? null,
      isImpersonation: Boolean(req.user.isImpersonation),
    });
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  updateMe(@Request() req: any, @Body() dto: UpdateMeDto) {
    return this.authService.updateMe(req.user.sub, dto);
  }

  @Patch('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change own password (clears mustChangePassword flag)' })
  changePassword(
    @Request() req: any,
    @Body() body: ChangePasswordDto,
  ) {
    return this.authService.changePassword(req.user.sub, body.currentPassword, body.newPassword);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('me/attendance-pin/reset')
  @ApiOperation({ summary: 'Reset current user attendance PIN' })
  resetAttendancePin(@Request() req: any) {
    return this.authService.resetAttendancePin(req.user.sub);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('impersonate/stop')
  @ApiOperation({ summary: 'Stop impersonation and return to your account' })
  stopImpersonation(@Request() req: any, @Body() dto: LogoutDto) {
    return this.authService.stopImpersonation(
      req.user.sub,
      req.user.impersonatorId ?? null,
      dto.refreshToken ?? null,
      {
        ipAddress: getRequestIp(req),
        userAgent: getUserAgent(req),
      },
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @Post('impersonate/:userId')
  @ApiOperation({ summary: 'Impersonate a user account' })
  impersonate(@Request() req: any, @Param('userId') userId: string) {
    return this.authService.impersonate(req.user.sub, userId, {
      ipAddress: getRequestIp(req),
      userAgent: getUserAgent(req),
    });
  }
}
