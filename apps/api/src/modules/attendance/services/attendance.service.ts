import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AttendanceType, Prisma } from '@prisma/client';
import dayjs from 'dayjs';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  private async getStaffHotelId(staffId?: string, userId?: string): Promise<string> {
    if (!staffId && !userId) {
      throw new BadRequestException('Staff not found.');
    }

    const staff = await this.prisma.staff.findUnique({
      where: staffId ? { id: staffId } : { userId: userId as string },
      select: { hotelId: true },
    });
    if (!staff) throw new BadRequestException('Staff not found.');
    return staff.hotelId;
  }

  private async requirePin(staff: any, hotel: any, pin?: string) {
    const requiresPin = Boolean(hotel?.attendancePinRequired) || Boolean(staff?.pinHash);
    if (!requiresPin) return;

    if (!staff?.pinHash) {
      throw new BadRequestException('PIN not set for this staff. Please contact admin.');
    }

    if (!pin) {
      throw new BadRequestException('PIN is required.');
    }

    const ok = await bcrypt.compare(pin, staff.pinHash);
    if (!ok) {
      await this.prisma.staff.update({
        where: { id: staff.id },
        data: { pinFailedAttempts: { increment: 1 } },
      });
      throw new BadRequestException('Invalid PIN.');
    }

    await this.prisma.staff.update({
      where: { id: staff.id },
      data: { pinFailedAttempts: 0, pinLastUsedAt: new Date() },
    });
  }

  private ensureGeofence(hotel: any, latitude?: number, longitude?: number) {
    if (!hotel?.geofenceEnabled) return;

    if (hotel.latitude == null || hotel.longitude == null) {
      throw new BadRequestException('Hotel geofence is not configured.');
    }

    if (latitude == null || longitude == null) {
      throw new BadRequestException('Location is required to clock in/out.');
    }

    const dist = this.distanceMeters(latitude, longitude, hotel.latitude, hotel.longitude);
    const radius = hotel.geofenceRadiusMeters ?? 0;
    if (dist > radius) {
      throw new BadRequestException('You are outside the allowed clock-in area.');
    }
  }

  private distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
    const toRad = (v: number) => (v * Math.PI) / 180;
    const R = 6371000; // meters
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private async getTodayStatusByStaffId(staffId: string) {
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
      lastClockInAt: records.filter((r) => r.type === 'CLOCK_IN').at(-1)?.timestamp ?? null,
      lastClockOutAt: records.filter((r) => r.type === 'CLOCK_OUT').at(-1)?.timestamp ?? null,
    };
  }

  async kioskStatus(employeeCode: string) {
    const staff = await this.prisma.staff.findFirst({
      where: { employeeCode: { equals: employeeCode.trim(), mode: 'insensitive' } },
      select: {
        id: true,
        employeeCode: true,
        firstName: true,
        lastName: true,
        department: true,
        position: true,
      },
    });
    if (!staff) throw new BadRequestException('Invalid employee code.');

    const status = await this.getTodayStatusByStaffId(staff.id);
    return { staff, ...status };
  }

  async kioskClockIn(dto: {
    employeeCode: string;
    pin?: string;
    note?: string;
    latitude?: number;
    longitude?: number;
  }) {
    const staff = await this.prisma.staff.findFirst({
      where: { employeeCode: { equals: dto.employeeCode.trim(), mode: 'insensitive' } },
      include: { hotel: true },
    });
    if (!staff) throw new BadRequestException('Invalid employee code.');

    await this.requirePin(staff, staff.hotel, dto.pin);
    this.ensureGeofence(staff.hotel, dto.latitude, dto.longitude);

    const today = dayjs().startOf('day').toDate();
    const lastRecord = await this.prisma.attendance.findFirst({
      where: { staffId: staff.id, timestamp: { gte: today } },
      orderBy: { timestamp: 'desc' },
    });
    if (lastRecord?.type === AttendanceType.CLOCK_IN) {
      throw new BadRequestException('Already clocked in. Please clock out first.');
    }

    const record = await this.prisma.attendance.create({
      data: {
        staffId: staff.id,
        hotelId: staff.hotelId,
        type: AttendanceType.CLOCK_IN,
        method: 'KIOSK',
        note: dto.note,
        latitude: dto.latitude,
        longitude: dto.longitude,
      },
    });

    const status = await this.getTodayStatusByStaffId(staff.id);
    const staffInfo = {
      id: staff.id,
      employeeCode: staff.employeeCode,
      firstName: staff.firstName,
      lastName: staff.lastName,
      department: staff.department,
      position: staff.position,
    };

    return { staff: staffInfo, record, ...status };
  }

  async kioskClockOut(dto: {
    employeeCode: string;
    pin?: string;
    note?: string;
    latitude?: number;
    longitude?: number;
  }) {
    const staff = await this.prisma.staff.findFirst({
      where: { employeeCode: { equals: dto.employeeCode.trim(), mode: 'insensitive' } },
      include: { hotel: true },
    });
    if (!staff) throw new BadRequestException('Invalid employee code.');

    await this.requirePin(staff, staff.hotel, dto.pin);
    this.ensureGeofence(staff.hotel, dto.latitude, dto.longitude);

    const today = dayjs().startOf('day').toDate();
    const lastRecord = await this.prisma.attendance.findFirst({
      where: { staffId: staff.id, timestamp: { gte: today } },
      orderBy: { timestamp: 'desc' },
    });
    if (!lastRecord || lastRecord.type === AttendanceType.CLOCK_OUT) {
      throw new BadRequestException('Not clocked in.');
    }

    const record = await this.prisma.attendance.create({
      data: {
        staffId: staff.id,
        hotelId: staff.hotelId,
        type: AttendanceType.CLOCK_OUT,
        method: 'KIOSK',
        note: dto.note,
        latitude: dto.latitude,
        longitude: dto.longitude,
      },
    });

    const status = await this.getTodayStatusByStaffId(staff.id);
    const staffInfo = {
      id: staff.id,
      employeeCode: staff.employeeCode,
      firstName: staff.firstName,
      lastName: staff.lastName,
      department: staff.department,
      position: staff.position,
    };

    return { staff: staffInfo, record, ...status };
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
    return this.getTodayStatusByStaffId(staffId);
  }

  async getAttendanceReport(
    requesterStaffId: string | undefined,
    requesterUserId: string | undefined,
    staffId: string,
    from: Date,
    to: Date,
  ) {
    const hotelId = await this.getStaffHotelId(requesterStaffId, requesterUserId);
    const staff = await this.prisma.staff.findFirst({
      where: { id: staffId, hotelId },
      select: { id: true },
    });
    if (!staff) throw new BadRequestException('Staff not found.');

    return this.prisma.attendance.findMany({
      where: { staffId, hotelId, timestamp: { gte: from, lte: to } },
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

  async getTodayList(
    staffId: string | undefined,
    userId: string | undefined,
    query: {
      page?: string;
      limit?: string;
      search?: string;
      department?: string;
      from?: string;
      to?: string;
    },
  ) {
    const hotelId = await this.getStaffHotelId(staffId, userId);
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 10)));
    const search = query.search?.trim();
    const department = query.department?.trim();
    const rangeStart = query.from ? dayjs(query.from).startOf('day') : dayjs().startOf('day');
    const rangeEnd = query.to ? dayjs(query.to).endOf('day') : dayjs().endOf('day');
    if (!rangeStart.isValid() || !rangeEnd.isValid()) {
      throw new BadRequestException('Invalid date range.');
    }

    const where: Prisma.StaffWhereInput = { hotelId };
    if (department && department !== 'All Departments') {
      where.department = { equals: department, mode: 'insensitive' };
    }
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { employeeCode: { contains: search, mode: 'insensitive' } },
        { department: { contains: search, mode: 'insensitive' } },
        { position: { contains: search, mode: 'insensitive' } },
      ];
    }

    const total = await this.prisma.staff.count({ where });
    const lastPage = Math.max(1, Math.ceil(total / limit));
    const skip = (page - 1) * limit;

    const staff = await this.prisma.staff.findMany({
      where,
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
      skip,
      take: limit,
      select: {
        id: true,
        employeeCode: true,
        firstName: true,
        lastName: true,
        department: true,
        position: true,
      },
    });

    const allStaff = total ? await this.prisma.staff.findMany({ where, select: { id: true } }) : [];
    const staffIds = staff.map((s) => s.id);
    const allStaffIds = allStaff.map((s) => s.id);

    const todayStart = rangeStart.toDate();
    const todayEnd = rangeEnd.toDate();

    const [attendanceToday, leavesToday] = await Promise.all([
      staffIds.length
        ? this.prisma.attendance.findMany({
            where: {
              staffId: { in: staffIds },
              timestamp: { gte: todayStart, lte: todayEnd },
            },
            orderBy: { timestamp: 'asc' },
          })
        : Promise.resolve([]),
      staffIds.length
        ? this.prisma.leave.findMany({
            where: {
              staffId: { in: staffIds },
              status: 'APPROVED',
              startDate: { lte: todayEnd },
              endDate: { gte: todayStart },
            },
            select: { staffId: true },
          })
        : Promise.resolve([]),
    ]);

    const [attendanceAll, leavesAll] = await Promise.all([
      allStaffIds.length
        ? this.prisma.attendance.findMany({
            where: {
              staffId: { in: allStaffIds },
              timestamp: { gte: todayStart, lte: todayEnd },
            },
            orderBy: { timestamp: 'asc' },
          })
        : Promise.resolve([]),
      allStaffIds.length
        ? this.prisma.leave.findMany({
            where: {
              staffId: { in: allStaffIds },
              status: 'APPROVED',
              startDate: { lte: todayEnd },
              endDate: { gte: todayStart },
            },
            select: { staffId: true },
          })
        : Promise.resolve([]),
    ]);

    const attendanceMap = new Map<string, any[]>();
    attendanceToday.forEach((rec) => {
      const list = attendanceMap.get(rec.staffId) ?? [];
      list.push(rec);
      attendanceMap.set(rec.staffId, list);
    });

    const leaveSet = new Set(leavesToday.map((l) => l.staffId));

    const data = staff.map((s) => {
      const records = attendanceMap.get(s.id) ?? [];
      const last = records[records.length - 1];
      const lastClockIn = [...records].reverse().find((r) => r.type === 'CLOCK_IN');
      const lastClockOut = [...records].reverse().find((r) => r.type === 'CLOCK_OUT');
      const totalMinutes = this.calcTotalMinutes(records);
      const status = leaveSet.has(s.id) ? 'Leave' : records.length ? 'Present' : 'Absent';

      return {
        id: s.id,
        name: `${s.firstName} ${s.lastName}`.trim(),
        department: s.department,
        position: s.position,
        employeeCode: s.employeeCode,
        clockInAt: lastClockIn?.timestamp ?? null,
        clockOutAt: lastClockOut?.timestamp ?? null,
        hoursWorked: totalMinutes ? Number((totalMinutes / 60).toFixed(1)) : null,
        status,
        method: last?.method ?? null,
        note: last?.note ?? null,
      };
    });

    const attendanceAllMap = new Map<string, any[]>();
    attendanceAll.forEach((rec) => {
      const list = attendanceAllMap.get(rec.staffId) ?? [];
      list.push(rec);
      attendanceAllMap.set(rec.staffId, list);
    });
    const leaveAllSet = new Set(leavesAll.map((l) => l.staffId));

    const stats = {
      present: 0,
      late: 0,
      absent: 0,
      leave: 0,
      clockedOut: 0,
      inHouse: 0,
      notClocked: 0,
    };

    allStaffIds.forEach((id) => {
      const records = attendanceAllMap.get(id) ?? [];
      const last = records[records.length - 1];
      const onLeave = leaveAllSet.has(id);
      if (onLeave) {
        stats.leave += 1;
        return;
      }
      if (!records.length) {
        stats.absent += 1;
        stats.notClocked += 1;
        return;
      }
      stats.present += 1;
      if (last?.type === 'CLOCK_IN') stats.inHouse += 1;
      if (last?.type === 'CLOCK_OUT') stats.clockedOut += 1;
    });

    const deptRows = await this.prisma.department.findMany({
      where: { hotelId },
      select: { name: true },
      orderBy: { name: 'asc' },
    });
    const departments = deptRows.length
      ? deptRows.map((d) => d.name)
      : Array.from(
          new Set(
            (
              await this.prisma.staff.findMany({
                where: { hotelId },
                select: { department: true },
              })
            )
              .map((d) => d.department)
              .filter(Boolean) as string[],
          ),
        ).sort();

    return {
      data,
      meta: {
        total,
        current_page: page,
        per_page: limit,
        last_page: lastPage,
        from: total === 0 ? 0 : skip + 1,
        to: Math.min(total, skip + limit),
      },
      stats,
      departments,
    };
  }

  async adminClockIn(
    staffId: string | undefined,
    userId: string | undefined,
    body: { staffId: string; timestamp?: string; method?: string; note?: string },
  ) {
    const hotelId = await this.getStaffHotelId(staffId, userId);
    const staff = await this.prisma.staff.findFirst({
      where: { id: body.staffId, hotelId },
      select: { id: true, hotelId: true },
    });
    if (!staff) throw new BadRequestException('Staff not found.');

    const timestamp = body.timestamp ? new Date(body.timestamp) : new Date();
    const dayStart = dayjs(timestamp).startOf('day').toDate();
    const dayEnd = dayjs(timestamp).endOf('day').toDate();

    const lastRecord = await this.prisma.attendance.findFirst({
      where: { staffId: staff.id, timestamp: { gte: dayStart, lte: dayEnd } },
      orderBy: { timestamp: 'desc' },
    });
    if (lastRecord?.type === AttendanceType.CLOCK_IN) {
      throw new BadRequestException('Already clocked in. Please clock out first.');
    }

    return this.prisma.attendance.create({
      data: {
        staffId: staff.id,
        hotelId: staff.hotelId,
        type: AttendanceType.CLOCK_IN,
        method: body.method ?? 'MANUAL',
        note: body.note,
        timestamp,
      },
    });
  }

  async adminClockOut(
    staffId: string | undefined,
    userId: string | undefined,
    body: { staffId: string; timestamp?: string; method?: string; note?: string },
  ) {
    const hotelId = await this.getStaffHotelId(staffId, userId);
    const staff = await this.prisma.staff.findFirst({
      where: { id: body.staffId, hotelId },
      select: { id: true, hotelId: true },
    });
    if (!staff) throw new BadRequestException('Staff not found.');

    const timestamp = body.timestamp ? new Date(body.timestamp) : new Date();
    const dayStart = dayjs(timestamp).startOf('day').toDate();
    const dayEnd = dayjs(timestamp).endOf('day').toDate();

    const lastRecord = await this.prisma.attendance.findFirst({
      where: { staffId: staff.id, timestamp: { gte: dayStart, lte: dayEnd } },
      orderBy: { timestamp: 'desc' },
    });
    if (!lastRecord || lastRecord.type === AttendanceType.CLOCK_OUT) {
      throw new BadRequestException('Not clocked in.');
    }

    return this.prisma.attendance.create({
      data: {
        staffId: staff.id,
        hotelId: staff.hotelId,
        type: AttendanceType.CLOCK_OUT,
        method: body.method ?? 'MANUAL',
        note: body.note,
        timestamp,
      },
    });
  }
}
