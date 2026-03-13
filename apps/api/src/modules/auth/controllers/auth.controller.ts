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
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthService } from '../services/auth.service';
import { JwtAuthGuard, LocalAuthGuard } from '../guards/index';
import { RefreshDto } from '../dtos/refresh.dto';
import { LogoutDto } from '../dtos/logout.dto';

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
    return this.authService.login(req.user);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout current session' })
  logout(@Request() req: any, @Body() dto: LogoutDto) {
    return this.authService.logout(req.user.sub, dto.refreshToken);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout all sessions' })
  logoutAll(@Request() req: any) {
    return this.authService.logoutAll(req.user.sub);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  getMe(@Request() req: any) {
    return this.authService.getMe(req.user.sub);
  }
}
