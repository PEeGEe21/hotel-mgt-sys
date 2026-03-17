import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SetStaffPinDto } from '../dtos/set-pin.dto';
import * as bcrypt from 'bcryptjs';
import { randomInt } from 'crypto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class StaffService {
  constructor(private prisma: PrismaService) {}

  async setPin(hotelId: string, staffId: string, dto: SetStaffPinDto) {
    const staff = await this.prisma.staff.findFirst({
      where: { id: staffId, hotelId },
      select: { id: true },
    });
    if (!staff) throw new NotFoundException('Staff not found.');

    let pin = dto.pin?.trim();
    if (!pin || dto.generate) {
      pin = String(randomInt(1000, 10000));
    }

    if (!/^\d{4,6}$/.test(pin)) {
      throw new BadRequestException('PIN must be 4 to 6 digits.');
    }

    const pinHash = await bcrypt.hash(pin, 10);
    await this.prisma.staff.update({
      where: { id: staffId },
      data: {
        pinHash,
        pinUpdatedAt: new Date(),
        pinFailedAttempts: 0,
      },
    });

    return { staffId, pin };
  }
}
