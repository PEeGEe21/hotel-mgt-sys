import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AttendanceType } from '@prisma/client';
import dayjs from 'dayjs';

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  private async getStaffHotelId(staffId: string): Promise<string> {
    const staff = await this.prisma.staff.findUnique({
      where: { id: staffId },
      select: { hotelId: true },
    });
    if (!staff) throw new BadRequestException('Staff not found.');
    return staff.hotelId;
  }

  async clockIn(staffId: string, method = 'PIN', note?: string) {
    const hotelId = await this.getStaffHotelId(staffId);
    const today = dayjs().startOf('day').toDate();
    const lastRecord = await this.prisma.attendance.findFirst({
      where: { staffId, timestamp: { gte: today } },
      orderBy: { timestamp: 'desc' },
    });
    if (lastRecord?.type === AttendanceType.CLOCK_IN) {
      throw new BadRequestException('Already clocked in. Please clock out first.');
    }
    return this.prisma.attendance.create({
      data: { staffId, hotelId, type: AttendanceType.CLOCK_IN, method, note },
    });
  }

  async clockOut(staffId: string, method = 'PIN', note?: string) {
    const hotelId = await this.getStaffHotelId(staffId);
    const today = dayjs().startOf('day').toDate();
    const lastRecord = await this.prisma.attendance.findFirst({
      where: { staffId, timestamp: { gte: today } },
      orderBy: { timestamp: 'desc' },
    });
    if (!lastRecord || lastRecord.type === AttendanceType.CLOCK_OUT) {
      throw new BadRequestException('Not clocked in.');
    }
    return this.prisma.attendance.create({
      data: { staffId, hotelId, type: AttendanceType.CLOCK_OUT, method, note },
    });
  }

  async getTodayStatus(staffId: string) {
    const today = dayjs().startOf('day').toDate();
    const records = await this.prisma.attendance.findMany({
      where: { staffId, timestamp: { gte: today } },
      orderBy: { timestamp: 'asc' },
    });
    const last = records[records.length - 1];
    return {
      isClockedIn: last?.type === 'CLOCK_IN',
      records,
      totalMinutes: this.calcTotalMinutes(records),
    };
  }

  async getAttendanceReport(staffId: string, from: Date, to: Date) {
    return this.prisma.attendance.findMany({
      where: { staffId, timestamp: { gte: from, lte: to } },
      orderBy: { timestamp: 'asc' },
    });
  }

  private calcTotalMinutes(records: any[]) {
    let total = 0;
    for (let i = 0; i < records.length - 1; i += 2) {
      if (records[i]?.type === 'CLOCK_IN' && records[i + 1]?.type === 'CLOCK_OUT') {
        total += dayjs(records[i + 1].timestamp).diff(records[i].timestamp, 'minute');
      }
    }
    return total;
  }
}