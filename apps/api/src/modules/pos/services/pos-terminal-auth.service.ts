import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { randomInt } from 'crypto';
import { TerminalSetupDto } from '../dtos/terminals/terminal-setup.dto';
import { StaffPinLoginDto } from '../dtos/terminals/staff-pin-login.dto';

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class PosTerminalAuthService {
  constructor(private prisma: PrismaService) {}

  // ── Validate terminal setup code → binds device to terminal ───────────────
  async authenticateTerminal(dto: TerminalSetupDto) {
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

    // Clear the setup code after use — one-time use
    await this.prisma.posTerminal.update({
      where: { id: terminal.id },
      data: { setupCode: null },
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
      message: `Terminal "${terminal.name}" authenticated successfully.`,
    };
  }

  // ── Staff PIN login on terminal ────────────────────────────────────────────
  async staffPinLogin(terminalId: string, dto: StaffPinLoginDto) {
    const terminal = await this.prisma.posTerminal.findFirst({
      where: { id: terminalId },
      select: { id: true, hotelId: true, status: true, name: true },
    });
    if (!terminal) throw new NotFoundException('Terminal not found.');
    if (terminal.status === 'Offline') throw new BadRequestException('Terminal is offline.');

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
      data: { currentStaffId: staff.id },
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
  async staffLogout(terminalId: string) {
    const terminal = await this.prisma.posTerminal.findFirst({
      where: { id: terminalId },
      select: { id: true, currentStaffId: true },
    });
    if (!terminal) throw new NotFoundException('Terminal not found.');

    await this.prisma.posTerminal.update({
      where: { id: terminalId },
      data: { currentStaffId: null },
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

    await this.prisma.posTerminal.update({
      where: { id: terminalId },
      data: { setupCode: code },
    });

    return {
      terminalId,
      terminalName: terminal.name,
      setupCode: code,
      expiresIn: '24 hours', // informational only — no expiry enforced yet, Option B will add proper expiry
      note: 'Share this code with the staff setting up the device. It can only be used once.',
      // TODO (Option B): generate a QR code URL here
      // qrCodeUrl: `/api/pos/terminals/${terminalId}/setup-qr?code=${code}`,
    };
  }

  // ── Get current terminal status (who's logged in etc) ─────────────────────
  async getTerminalStatus(terminalId: string) {
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
