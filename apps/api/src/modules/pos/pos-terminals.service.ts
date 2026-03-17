import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePosTerminalDto } from './dtos/create-pos-terminal.dto';
import { UpdatePosTerminalDto } from './dtos/update-pos-terminal.dto';

@Injectable()
export class PosTerminalsService {
  constructor(private prisma: PrismaService) {}

  async list(hotelId: string) {
    const terminals = await this.prisma.posTerminal.findMany({
      where: { hotelId },
      orderBy: { createdAt: 'desc' },
      include: { staff: { select: { id: true, firstName: true, lastName: true } } },
    });

    return terminals.map((t) => ({
      id: t.id,
      name: t.name,
      location: t.location,
      group: t.group,
      device: t.device,
      status: t.status,
      staffId: t.staffId,
      staffName: t.staff
        ? `${t.staff.firstName} ${t.staff.lastName}`
        : null,
      createdAt: t.createdAt,
    }));
  }

  async create(hotelId: string, dto: CreatePosTerminalDto) {
    const name = dto.name.trim();
    const location = dto.location.trim();
    const group = dto.group.trim();
    const device = dto.device.trim();
    const status = dto.status?.trim() || 'Online';

    if (!name || !location || !group || !device) {
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
        group,
        device,
        status,
        staffId: dto.staffId ?? null,
      },
      include: { staff: { select: { id: true, firstName: true, lastName: true } } },
    });

    return {
      id: terminal.id,
      name: terminal.name,
      location: terminal.location,
      group: terminal.group,
      device: terminal.device,
      status: terminal.status,
      staffId: terminal.staffId,
      staffName: terminal.staff
        ? `${terminal.staff.firstName} ${terminal.staff.lastName}`
        : null,
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

    const updated = await this.prisma.posTerminal.update({
      where: { id },
      data: {
        name: dto.name?.trim() ?? terminal.name,
        location: dto.location?.trim() ?? terminal.location,
        group: dto.group?.trim() ?? terminal.group,
        device: dto.device?.trim() ?? terminal.device,
        status: dto.status?.trim() ?? terminal.status,
        staffId: dto.staffId === undefined ? terminal.staffId : dto.staffId,
      },
      include: { staff: { select: { id: true, firstName: true, lastName: true } } },
    });

    return {
      id: updated.id,
      name: updated.name,
      location: updated.location,
      group: updated.group,
      device: updated.device,
      status: updated.status,
      staffId: updated.staffId,
      staffName: updated.staff
        ? `${updated.staff.firstName} ${updated.staff.lastName}`
        : null,
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

  async renameGroup(hotelId: string, fromGroup: string, toGroup: string) {
    const from = fromGroup.trim();
    const to = toGroup.trim();

    if (!from || !to) {
      throw new BadRequestException('Both current and new group names are required.');
    }

    if (from === to) return { updated: 0 };

    const result = await this.prisma.posTerminal.updateMany({
      where: { hotelId, group: from },
      data: { group: to },
    });

    return { updated: result.count };
  }
}
