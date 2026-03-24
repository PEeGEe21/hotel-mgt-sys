import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreatePosTerminalDto } from '../dtos/terminals/create-pos-terminal.dto';
import { UpdatePosTerminalDto } from '../dtos/terminals/update-pos-terminal.dto';
import { CreatePosTerminalGroupDto } from '../dtos/terminals/create-pos-terminal-group.dto';
import { UpdatePosTerminalGroupDto } from '../dtos/terminals/update-pos-terminal-group.dto';

@Injectable()
export class PosTerminalsService {
  constructor(private prisma: PrismaService) {}

  async list(hotelId: string) {
    const terminals = await this.prisma.posTerminal.findMany({
      where: { hotelId },
      orderBy: { createdAt: 'desc' },
      include: {
        staff: { select: { id: true, firstName: true, lastName: true } },
        terminalGroup: { select: { id: true, name: true } },
      },
    });

    return terminals.map((t) => ({
      id: t.id,
      name: t.name,
      location: t.location,
      terminalGroup: t.terminalGroup,
      terminalGroupId: t.terminalGroupId,
      terminalGroupName: t.terminalGroup?.name ?? null,
      device: t.device,
      status: t.status,
      staffId: t.staffId,
      staffName: t.staff ? `${t.staff.firstName} ${t.staff.lastName}` : null,
      createdAt: t.createdAt,
    }));
  }

  async create(hotelId: string, dto: CreatePosTerminalDto) {
    const name = dto.name.trim();
    const location = dto.location.trim();
    const device = dto.device.trim();
    const status = dto.status?.trim() || 'Online';

    if (dto.terminalGroupId) {
      const group = await this.prisma.posTerminalGroup.findFirst({
        where: { id: dto.terminalGroupId, hotelId },
      });

      if (!group) {
        throw new BadRequestException('Terminal group not found.');
      }
    }

    if (!name || !location || !device) {
      throw new BadRequestException('Name, location, group and device are required.');
    }

    if (dto.staffId) {
      const staff = await this.prisma.staff.findFirst({
        where: { id: dto.staffId, hotelId },
        select: { id: true },
      });
      if (!staff) throw new BadRequestException('Assigned staff not found.');
    }

    const terminal = await this.prisma.posTerminal.create({
      data: {
        hotelId,
        name,
        location,
        terminalGroupId: dto.terminalGroupId ?? null,
        device,
        status,
        staffId: dto.staffId ?? null,
      },
      include: {
        staff: { select: { id: true, firstName: true, lastName: true } },
        terminalGroup: { select: { id: true, name: true } },
      },
    });

    return {
      id: terminal.id,
      name: terminal.name,
      location: terminal.location,
      terminalGroup: terminal.terminalGroup,
      device: terminal.device,
      status: terminal.status,
      staffId: terminal.staffId,
      staffName: terminal.staff ? `${terminal.staff.firstName} ${terminal.staff.lastName}` : null,
      createdAt: terminal.createdAt,
    };
  }

  async update(hotelId: string, id: string, dto: UpdatePosTerminalDto) {
    const terminal = await this.prisma.posTerminal.findFirst({
      where: { id, hotelId },
    });
    if (!terminal) throw new NotFoundException('Terminal not found.');

    if (dto.staffId) {
      const staff = await this.prisma.staff.findFirst({
        where: { id: dto.staffId, hotelId },
        select: { id: true },
      });
      if (!staff) throw new BadRequestException('Assigned staff not found.');
    }

    if (dto.terminalGroupId !== undefined) {
      if (dto.terminalGroupId) {
        const group = await this.prisma.posTerminalGroup.findFirst({
          where: { id: dto.terminalGroupId, hotelId },
        });

        if (!group) {
          throw new BadRequestException('Terminal group not found.');
        }
      }
    }

    const updated = await this.prisma.posTerminal.update({
      where: { id },
      data: {
        name: dto.name?.trim() ?? terminal.name,
        location: dto.location?.trim() ?? terminal.location,
        terminalGroupId:
          dto.terminalGroupId === undefined ? terminal.terminalGroupId : dto.terminalGroupId,
        device: dto.device?.trim() ?? terminal.device,
        status: dto.status?.trim() ?? terminal.status,
        staffId: dto.staffId === undefined ? terminal.staffId : dto.staffId,
      },
      include: {
        staff: { select: { id: true, firstName: true, lastName: true } },
        terminalGroup: { select: { id: true, name: true } },
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      location: updated.location,
      terminalGroup: updated.terminalGroup,
      device: updated.device,
      status: updated.status,
      staffId: updated.staffId,
      staffName: updated.staff ? `${updated.staff.firstName} ${updated.staff.lastName}` : null,
      createdAt: updated.createdAt,
    };
  }

  async remove(hotelId: string, id: string) {
    const terminal = await this.prisma.posTerminal.findFirst({
      where: { id, hotelId },
      select: { id: true },
    });
    if (!terminal) throw new NotFoundException('Terminal not found.');

    await this.prisma.posTerminal.delete({ where: { id } });
    return { success: true };
  }

  // ---------------- POS TERMINAL GROUP ---------------//
  async createGroup(hotelId: string, dto: CreatePosTerminalGroupDto) {
    // check name
    const byName = await this.prisma.posTerminalGroup.findUnique({
      where: { hotelId_name: { hotelId, name: dto.name } },
    });

    if (byName) {
      throw new ConflictException(`A group named "${dto.name}" already exists.`);
    }

    const lastGroup = await this.prisma.posTerminalGroup.findFirst({
      where: { hotelId },
      orderBy: { level: 'desc' },
      select: { level: true },
    });

    const nextLevel = lastGroup ? lastGroup.level + 1 : 1;

    return this.prisma.posTerminalGroup.create({
      data: {
        hotelId,
        name: dto.name,
        level: nextLevel,
        description: dto.description,
      },
    });
  }

  async updateGroup(hotelId: string, id: string, dto: UpdatePosTerminalGroupDto) {
    const terminalGroup = await this.prisma.posTerminalGroup.findFirst({
      where: { id, hotelId },
    });

    if (!terminalGroup) {
      throw new NotFoundException('Terminal Group not found.');
    }

    if (dto.name) {
      const byName = await this.prisma.posTerminalGroup.findUnique({
        where: { hotelId_name: { hotelId, name: dto.name } },
      });

      if (byName && byName.id !== id) {
        throw new ConflictException(`A Terminal Group named "${dto.name}" already exists.`);
      }
    }

    const { level, ...data } = dto;

    return this.prisma.posTerminalGroup.update({
      where: { id },
      data,
    });
  }

  async findAllGroups(hotelId: string) {
    const groups = await this.prisma.posTerminalGroup.findMany({
      where: { hotelId },
      orderBy: { level: 'asc' },
      include: { _count: { select: { posTerminals: true } } },
    });
    return groups;
  }

  // async renameGroup(hotelId: string, fromGroup: string, toGroup: string) {
  //   const from = fromGroup.trim();
  //   const to = toGroup.trim();

  //   if (!from || !to) {
  //     throw new BadRequestException('Both current and new group names are required.');
  //   }

  //   if (from === to) return { updated: 0 };

  //   const result = await this.prisma.posTerminal.updateMany({
  //     where: { hotelId, group: from },
  //     data: { group: to },
  //   });

  //   return { updated: result.count };
  // }
}
