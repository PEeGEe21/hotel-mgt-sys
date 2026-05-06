import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes, randomInt } from 'crypto';
import { AttendanceType } from '@prisma/client';
import dayjs from 'dayjs';
import { TerminalSetupDto } from '../dtos/terminals/terminal-setup.dto';
import { StaffPinLoginDto } from '../dtos/terminals/staff-pin-login.dto';

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class PosTerminalAuthService {
  constructor(private prisma: PrismaService) {}

  private hashDeviceKey(deviceKey: string) {
    return createHash('sha256').update(deviceKey).digest('hex');
  }

  private resolveDeviceName(dto?: { deviceName?: string }, userAgent?: string | null) {
    const trimmed = dto?.deviceName?.trim();
    if (trimmed) return trimmed.slice(0, 120);
    if (!userAgent) return 'Registered device';
    return userAgent.slice(0, 120);
  }

  private async assertStaffClockedInToday(staffId: string) {
    const today = dayjs().startOf('day').toDate();
    const lastRecord = await this.prisma.attendance.findFirst({
      where: { staffId, timestamp: { gte: today } },
      orderBy: { timestamp: 'desc' },
      select: { type: true, timestamp: true },
    });

    if (!lastRecord || lastRecord.type !== AttendanceType.CLOCK_IN) {
      throw new UnauthorizedException(
        'Clock in for today before using this terminal.',
      );
    }
  }

  async assertTerminalDeviceAccess(terminalId: string, deviceKey?: string | null) {
    const terminal = await this.prisma.posTerminal.findFirst({
      where: { id: terminalId },
      select: {
        id: true,
        hotelId: true,
        name: true,
        status: true,
        currentStaffId: true,
        registeredDeviceKeyHash: true,
      },
    });

    if (!terminal) throw new NotFoundException('Terminal not found.');
    if (!terminal.registeredDeviceKeyHash) {
      throw new UnauthorizedException('This terminal is not currently registered to a device.');
    }
    if (!deviceKey || this.hashDeviceKey(deviceKey) !== terminal.registeredDeviceKeyHash) {
      throw new UnauthorizedException('This device is not authorized for the selected terminal.');
    }
    if (terminal.status === 'Offline') {
      throw new BadRequestException('Terminal is offline.');
    }

    return terminal;
  }

  // ── Validate terminal setup code → binds device to terminal ───────────────
  async authenticateTerminal(
    dto: TerminalSetupDto,
    meta?: { ipAddress?: string | null; userAgent?: string | null },
  ) {
    const code = dto.setupCode.trim().toUpperCase();

    const terminal = await this.prisma.posTerminal.findFirst({
      where: { setupCode: code },
      include: {
        terminalGroup: { select: { id: true, name: true } },
        staff: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!terminal) {
      throw new UnauthorizedException('Invalid setup code. Check the code in terminal settings.');
    }

    if (terminal.status === 'Offline') {
      throw new BadRequestException(
        'This terminal is currently offline. Enable it in settings first.',
      );
    }

    if (terminal.setupCodeExpiresAt && terminal.setupCodeExpiresAt < new Date()) {
      throw new UnauthorizedException('This setup code has expired. Generate a new one.');
    }

    const deviceKey = randomBytes(32).toString('hex');
    const registeredAt = new Date();

    // Clear the setup code after use — one-time use
    await this.prisma.posTerminal.update({
      where: { id: terminal.id },
      data: {
        setupCode: null,
        setupCodeExpiresAt: null,
        registeredDeviceKeyHash: this.hashDeviceKey(deviceKey),
        registeredDeviceName: this.resolveDeviceName(dto, meta?.userAgent ?? null),
        registeredIpAddress: meta?.ipAddress ?? null,
        registeredAt,
        lastActivityAt: registeredAt,
      },
    });

    return {
      terminal: {
        id: terminal.id,
        name: terminal.name,
        location: terminal.location,
        device: terminal.device,
        status: terminal.status,
        terminalGroup: terminal.terminalGroup,
      },
      deviceKey,
      registeredAt: registeredAt.toISOString(),
      message: `Terminal "${terminal.name}" authenticated successfully.`,
    };
  }

  // ── Staff PIN login on terminal ────────────────────────────────────────────
  async staffPinLogin(terminalId: string, dto: StaffPinLoginDto, deviceKey?: string | null) {
    const terminal = await this.assertTerminalDeviceAccess(terminalId, deviceKey);

    const staff = await this.prisma.staff.findFirst({
      where: {
        hotelId: terminal.hotelId,
        employeeCode: { equals: dto.employeeCode.trim(), mode: 'insensitive' },
      },
      include: {
        user: { select: { id: true, role: true, isActive: true } },
      },
    });

    if (!staff) throw new UnauthorizedException('Employee code not found.');
    if (!staff.user.isActive) throw new UnauthorizedException('Account is inactive.');

    if (!staff.pinHash) {
      throw new BadRequestException('PIN not set for this staff member. Ask admin to set a PIN.');
    }

    const valid = await bcrypt.compare(dto.pin, staff.pinHash);
    if (!valid) {
      await this.prisma.staff.update({
        where: { id: staff.id },
        data: { pinFailedAttempts: { increment: 1 } },
      });
      throw new UnauthorizedException('Incorrect PIN.');
    }

    await this.assertStaffClockedInToday(staff.id);

    // Reset failed attempts, update last used
    await this.prisma.staff.update({
      where: { id: staff.id },
      data: {
        pinFailedAttempts: 0,
        pinLastUsedAt: new Date(),
      },
    });

    // Record who is operating this terminal
    await this.prisma.posTerminal.update({
      where: { id: terminalId },
      data: { currentStaffId: staff.id, lastActivityAt: new Date() },
    });

    return {
      staff: {
        id: staff.id,
        employeeCode: staff.employeeCode,
        firstName: staff.firstName,
        lastName: staff.lastName,
        role: staff.user.role,
        department: staff.department,
        position: staff.position,
      },
    };
  }

  // ── Staff logout from terminal ─────────────────────────────────────────────
  async staffLogout(terminalId: string, deviceKey?: string | null) {
    await this.assertTerminalDeviceAccess(terminalId, deviceKey);

    await this.prisma.posTerminal.update({
      where: { id: terminalId },
      data: { currentStaffId: null, lastActivityAt: new Date() },
    });

    return { message: 'Staff logged out from terminal.' };
  }

  // ── Generate a setup code for a terminal (manager action) ─────────────────
  async generateSetupCode(hotelId: string, terminalId: string) {
    const terminal = await this.prisma.posTerminal.findFirst({
      where: { id: terminalId, hotelId },
    });
    if (!terminal) throw new NotFoundException('Terminal not found.');

    // Generate a short memorable code: e.g. BAR01, T3X9
    const code = this.genCode();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.prisma.posTerminal.update({
      where: { id: terminalId },
      data: {
        setupCode: code,
        setupCodeExpiresAt: expiresAt,
        currentStaffId: null,
        registeredDeviceKeyHash: null,
        registeredDeviceName: null,
        registeredIpAddress: null,
        registeredAt: null,
      },
    });

    return {
      terminalId,
      terminalName: terminal.name,
      setupCode: code,
      expiresAt: expiresAt.toISOString(),
      expiresIn: '24 hours',
      note: 'Share this code with the staff setting up the device. It can only be used once.',
    };
  }

  // ── Get current terminal status (who's logged in etc) ─────────────────────
  async getTerminalStatus(terminalId: string, deviceKey?: string | null) {
    const terminal = await this.prisma.posTerminal.findFirst({
      where: { id: terminalId },
      include: {
        terminalGroup: { select: { id: true, name: true } },
        currentStaff: { select: { id: true, firstName: true, lastName: true, position: true } },
      },
    });
    if (!terminal) throw new NotFoundException('Terminal not found.');

    return {
      id: terminal.id,
      name: terminal.name,
      location: terminal.location,
      device: terminal.device,
      status: terminal.status,
      terminalGroup: terminal.terminalGroup,
      currentStaff: terminal.currentStaff ?? null,
      hasSetupCode: !!terminal.setupCode,
      isRegisteredOnThisDevice: Boolean(
        deviceKey &&
          terminal.registeredDeviceKeyHash &&
          this.hashDeviceKey(deviceKey) === terminal.registeredDeviceKeyHash,
      ),
      registeredDeviceName: terminal.registeredDeviceName ?? null,
      registeredAt: terminal.registeredAt?.toISOString() ?? null,
    };
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  private genCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no O/0, I/1 confusion
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[randomInt(0, chars.length)];
    }
    return code;
  }
}
