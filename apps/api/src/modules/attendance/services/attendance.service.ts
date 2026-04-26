import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AttendanceType, HotelCronJobType, Prisma } from '@prisma/client';
import dayjs from 'dayjs';
import * as bcrypt from 'bcryptjs';
import { NotificationsService } from '../../notifications/notifications.service';

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  private async recordCronJobSuccess(args: {
    hotelId: string;
    jobType: HotelCronJobType;
    enabled: boolean;
    runAtHour: number;
    runAtMinute: number;
    triggeredAt: Date;
  }) {
    await this.prisma.hotelCronSetting.upsert({
      where: {
        hotelId_jobType: {
          hotelId: args.hotelId,
          jobType: args.jobType,
        },
      },
      update: {
        enabled: args.enabled,
        runAtHour: args.runAtHour,
        runAtMinute: args.runAtMinute,
        lastTriggeredAt: args.triggeredAt,
        lastSucceededAt: args.triggeredAt,
        lastError: null,
      } as any,
      create: {
        hotelId: args.hotelId,
        jobType: args.jobType,
        enabled: args.enabled,
        runAtHour: args.runAtHour,
        runAtMinute: args.runAtMinute,
        lastTriggeredAt: args.triggeredAt,
        lastSucceededAt: args.triggeredAt,
        lastError: null,
      } as any,
    });
  }

  private async recordCronJobFailure(args: {
    hotelId: string;
    jobType: HotelCronJobType;
    enabled: boolean;
    runAtHour: number;
    runAtMinute: number;
    triggeredAt: Date;
    error: unknown;
  }) {
    const message =
      args.error instanceof Error ? args.error.message : String(args.error ?? 'Unknown error');

    await this.prisma.hotelCronSetting.upsert({
      where: {
        hotelId_jobType: {
          hotelId: args.hotelId,
          jobType: args.jobType,
        },
      },
      update: {
        enabled: args.enabled,
        runAtHour: args.runAtHour,
        runAtMinute: args.runAtMinute,
        lastTriggeredAt: args.triggeredAt,
        lastFailedAt: args.triggeredAt,
        lastError: message,
      } as any,
      create: {
        hotelId: args.hotelId,
        jobType: args.jobType,
        enabled: args.enabled,
        runAtHour: args.runAtHour,
        runAtMinute: args.runAtMinute,
        lastTriggeredAt: args.triggeredAt,
        lastFailedAt: args.triggeredAt,
        lastError: message,
      } as any,
    });
  }

  private isLateClockIn(timestamp: Date) {
    return dayjs(timestamp).hour() >= 9;
  }

  private buildAttendanceAlertEmail(args: {
    hotelName: string;
    staffName: string;
    employeeCode: string;
    department?: string | null;
    position?: string | null;
    clockedInAt: Date;
    method: string;
  }) {
    const hotelName = escapeHtml(args.hotelName);
    const staffName = escapeHtml(args.staffName);
    const employeeCode = escapeHtml(args.employeeCode);
    const department = args.department ? escapeHtml(args.department) : null;
    const position = args.position ? escapeHtml(args.position) : null;
    const clockedInAt = fmtDateTime(args.clockedInAt);
    const method = escapeHtml(args.method);

    return {
      subject: `Attendance alert: late clock-in for ${args.staffName}`,
      text:
        `${args.hotelName}: a late staff clock-in was recorded.\n` +
        `Staff: ${args.staffName}\n` +
        `Employee code: ${args.employeeCode}\n` +
        `Clocked in at: ${clockedInAt}\n` +
        `Method: ${args.method}` +
        (args.department ? `\nDepartment: ${args.department}` : '') +
        (args.position ? `\nPosition: ${args.position}` : ''),
      html: `
        <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.6;">
          <p style="margin: 0 0 12px;">A late staff clock-in was recorded at <strong>${hotelName}</strong>.</p>
          <table style="border-collapse: collapse;">
            <tr><td style="padding: 4px 12px 4px 0;"><strong>Staff</strong></td><td style="padding: 4px 0;">${staffName}</td></tr>
            <tr><td style="padding: 4px 12px 4px 0;"><strong>Employee code</strong></td><td style="padding: 4px 0;">${employeeCode}</td></tr>
            <tr><td style="padding: 4px 12px 4px 0;"><strong>Clocked in at</strong></td><td style="padding: 4px 0;">${clockedInAt}</td></tr>
            <tr><td style="padding: 4px 12px 4px 0;"><strong>Method</strong></td><td style="padding: 4px 0;">${method}</td></tr>
            ${department ? `<tr><td style="padding: 4px 12px 4px 0;"><strong>Department</strong></td><td style="padding: 4px 0;">${department}</td></tr>` : ''}
            ${position ? `<tr><td style="padding: 4px 12px 4px 0;"><strong>Position</strong></td><td style="padding: 4px 0;">${position}</td></tr>` : ''}
          </table>
        </div>
      `,
    };
  }

  private buildAttendanceAlertInAppNotification(args: {
    staffName: string;
    employeeCode: string;
    clockedInAt: Date;
    method: string;
  }) {
    return {
      title: 'Attendance alert',
      message: `${args.staffName} clocked in late at ${fmtTime(args.clockedInAt)} via ${args.method}.`,
      metadata: {
        staffName: args.staffName,
        employeeCode: args.employeeCode,
        clockedInAt: args.clockedInAt.toISOString(),
        method: args.method,
      },
    };
  }

  private async dispatchLateClockInAlert(args: {
    hotelId: string;
    staffId: string;
    actorUserId?: string;
    timestamp: Date;
    method: string;
    fallbackStaff?: {
      employeeCode?: string | null;
      firstName?: string | null;
      lastName?: string | null;
      department?: string | null;
      position?: string | null;
    };
  }) {
    if (!this.isLateClockIn(args.timestamp)) return;

    try {
      const [hotel, staff] = await Promise.all([
        this.prisma.hotel.findUnique({
          where: { id: args.hotelId },
          select: { name: true },
        }),
        this.prisma.staff.findUnique({
          where: { id: args.staffId },
          select: {
            userId: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
            department: true,
            position: true,
          },
        }),
      ]);

      const resolvedStaff = staff ?? args.fallbackStaff;
      const staffName =
        `${resolvedStaff?.firstName ?? ''} ${resolvedStaff?.lastName ?? ''}`.trim() || 'Staff member';
      const employeeCode = resolvedStaff?.employeeCode ?? 'N/A';

      await this.notifications.dispatch({
        hotelId: args.hotelId,
        event: 'attendanceAlert',
        excludeUserIds: [args.actorUserId, staff?.userId].filter(Boolean) as string[],
        excludeEmailUserIds: [args.actorUserId, staff?.userId].filter(Boolean) as string[],
        email: this.buildAttendanceAlertEmail({
          hotelName: hotel?.name ?? 'HotelOS',
          staffName,
          employeeCode,
          department: resolvedStaff?.department ?? null,
          position: resolvedStaff?.position ?? null,
          clockedInAt: args.timestamp,
          method: args.method,
        }),
        inApp: this.buildAttendanceAlertInAppNotification({
          staffName,
          employeeCode,
          clockedInAt: args.timestamp,
          method: args.method,
        }),
      });
    } catch (error) {
      this.logger.warn(`Failed to dispatch attendanceAlert notification: ${String(error)}`);
    }
  }

  private async hasExistingAttendanceAlert(args: {
    hotelId: string;
    alertKind: 'late' | 'absence' | 'absenceDigest';
    alertDate: string;
    staffId?: string;
  }) {
    const metadataPattern = args.staffId
      ? {
          targetStaffId: args.staffId,
          alertKind: args.alertKind,
          alertDate: args.alertDate,
        }
      : {
          alertKind: args.alertKind,
          alertDate: args.alertDate,
        };

    const metadataWhere = Object.entries(metadataPattern).map(([key, value]) => ({
      metadata: {
        path: [key],
        equals: value,
      },
    }));

    const [notificationMatch, emailLogMatch] = await Promise.all([
      this.prisma.notification.findFirst({
        where: {
          hotelId: args.hotelId,
          event: 'attendanceAlert',
          AND: metadataWhere,
        },
        select: { id: true },
      }),
      this.prisma.emailDeliveryLog.findFirst({
        where: {
          hotelId: args.hotelId,
          event: 'attendanceAlert',
          AND: metadataWhere,
        },
        select: { id: true },
      }),
    ]);

    return Boolean(notificationMatch || emailLogMatch);
  }

  private async dispatchAbsenceInAppAlert(args: {
    hotelId: string;
    staff: {
      id: string;
      userId?: string | null;
      employeeCode?: string | null;
      firstName?: string | null;
      lastName?: string | null;
      department?: string | null;
      position?: string | null;
    };
    alertDate: string;
  }) {
    if (
      await this.hasExistingAttendanceAlert({
        hotelId: args.hotelId,
        staffId: args.staff.id,
        alertKind: 'absence',
        alertDate: args.alertDate,
      })
    ) {
      return;
    }

    const staffName =
      `${args.staff.firstName ?? ''} ${args.staff.lastName ?? ''}`.trim() || 'Staff member';
    const employeeCode = args.staff.employeeCode ?? 'N/A';
    const cutoffTime = `${args.alertDate} 09:00`;

    try {
      const hotel = await this.prisma.hotel.findUnique({
        where: { id: args.hotelId },
        select: { name: true },
      });

      await this.notifications.dispatch({
        hotelId: args.hotelId,
        event: 'attendanceAlert',
        excludeUserIds: args.staff.userId ? [args.staff.userId] : undefined,
        inApp: {
          title: 'Attendance alert',
          message: `${staffName} has not clocked in for ${args.alertDate}.`,
          metadata: {
            targetStaffId: args.staff.id,
            staffName,
            employeeCode,
            alertKind: 'absence',
            alertDate: args.alertDate,
            expectedBy: cutoffTime,
          },
        },
      });
    } catch (error) {
      this.logger.warn(
        `Failed to dispatch absence attendanceAlert for ${args.staff.id}: ${String(error)}`,
      );
    }
  }

  private buildAbsenceDigestEmail(args: {
    hotelName: string;
    alertDate: string;
    absentStaff: Array<{
      employeeCode?: string | null;
      firstName?: string | null;
      lastName?: string | null;
      department?: string | null;
      position?: string | null;
    }>;
  }) {
    const rows = args.absentStaff
      .map((member) => {
        const staffName =
          `${member.firstName ?? ''} ${member.lastName ?? ''}`.trim() || 'Staff member';
        return {
          staffName,
          employeeCode: member.employeeCode ?? 'N/A',
          department: member.department ?? 'Unassigned',
          position: member.position ?? 'Unassigned',
        };
      })
      .sort((a, b) => a.staffName.localeCompare(b.staffName));

    const rowsText = rows
      .map(
        (member) =>
          `- ${member.staffName} (${member.employeeCode})${member.department ? ` · ${member.department}` : ''}${member.position ? ` · ${member.position}` : ''}`,
      )
      .join('\n');

    const rowsHtml = rows
      .map(
        (member) => `
          <tr>
            <td style="padding: 6px 12px 6px 0;">${escapeHtml(member.staffName)}</td>
            <td style="padding: 6px 12px 6px 0;">${escapeHtml(member.employeeCode)}</td>
            <td style="padding: 6px 12px 6px 0;">${escapeHtml(member.department)}</td>
            <td style="padding: 6px 0;">${escapeHtml(member.position)}</td>
          </tr>
        `,
      )
      .join('');

    return {
      subject: `Attendance summary: ${rows.length} absent staff on ${args.alertDate}`,
      text:
        `${args.hotelName}: absence summary for ${args.alertDate}.\n` +
        `Absent staff count: ${rows.length}\n` +
        `${rowsText}`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.6;">
          <p style="margin: 0 0 12px;">Attendance absence summary for <strong>${escapeHtml(args.hotelName)}</strong> on <strong>${escapeHtml(args.alertDate)}</strong>.</p>
          <p style="margin: 0 0 12px;">Absent staff count: <strong>${rows.length}</strong></p>
          <table style="border-collapse: collapse; width: 100%;">
            <thead>
              <tr>
                <th style="text-align: left; padding: 6px 12px 6px 0;">Staff</th>
                <th style="text-align: left; padding: 6px 12px 6px 0;">Employee code</th>
                <th style="text-align: left; padding: 6px 12px 6px 0;">Department</th>
                <th style="text-align: left; padding: 6px 0;">Position</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </div>
      `,
    };
  }

  private async dispatchAbsenceDigestEmail(args: {
    hotelId: string;
    alertDate: string;
    absentStaff: Array<{
      id: string;
      userId?: string | null;
      employeeCode?: string | null;
      firstName?: string | null;
      lastName?: string | null;
      department?: string | null;
      position?: string | null;
    }>;
  }) {
    if (!args.absentStaff.length) return;
    if (
      await this.hasExistingAttendanceAlert({
        hotelId: args.hotelId,
        alertKind: 'absenceDigest',
        alertDate: args.alertDate,
      })
    ) {
      return;
    }

    try {
      const hotel = await this.prisma.hotel.findUnique({
        where: { id: args.hotelId },
        select: { name: true },
      });

      await this.notifications.dispatch({
        hotelId: args.hotelId,
        event: 'attendanceAlert',
        excludeUserIds: args.absentStaff
          .map((member) => member.userId)
          .filter(Boolean) as string[],
        excludeEmailUserIds: args.absentStaff
          .map((member) => member.userId)
          .filter(Boolean) as string[],
        email: this.buildAbsenceDigestEmail({
          hotelName: hotel?.name ?? 'HotelOS',
          alertDate: args.alertDate,
          absentStaff: args.absentStaff,
        }),
      });
    } catch (error) {
      this.logger.warn(`Failed to dispatch attendance absence digest: ${String(error)}`);
    }
  }

  private async dispatchAbsenceAlertsForToday(args: {
    hotelId: string;
    staff: Array<{
      id: string;
      userId?: string | null;
      employeeCode?: string | null;
      firstName?: string | null;
      lastName?: string | null;
      department?: string | null;
      position?: string | null;
      hireDate?: Date | null;
    }>;
    attendanceMap: Map<string, any[]>;
    leaveSet: Set<string>;
    rangeStart: dayjs.Dayjs;
    rangeEnd: dayjs.Dayjs;
  }) {
    const now = dayjs();
    const todayKey = now.format('YYYY-MM-DD');
    if (
      args.rangeStart.format('YYYY-MM-DD') !== todayKey ||
      args.rangeEnd.format('YYYY-MM-DD') !== todayKey ||
      now.hour() < 9
    ) {
      return;
    }

    const absentStaff = args.staff.filter((member) => {
      if (args.leaveSet.has(member.id)) return false;
      if ((args.attendanceMap.get(member.id) ?? []).length > 0) return false;
      if (member.hireDate && dayjs(member.hireDate).endOf('day').isAfter(now)) return false;
      return true;
    });

    for (const member of absentStaff) {
      await this.dispatchAbsenceInAppAlert({
        hotelId: args.hotelId,
        staff: member,
        alertDate: todayKey,
      });
    }

    await this.dispatchAbsenceDigestEmail({
      hotelId: args.hotelId,
      alertDate: todayKey,
      absentStaff,
    });
  }

  private async getAbsentStaffForHotelDay(hotelId: string, day: dayjs.Dayjs) {
    const dayStart = day.startOf('day').toDate();
    const dayEnd = day.endOf('day').toDate();
    const now = dayjs();

    const staff = await this.prisma.staff.findMany({
      where: { hotelId },
      select: {
        id: true,
        userId: true,
        employeeCode: true,
        firstName: true,
        lastName: true,
        department: true,
        position: true,
        hireDate: true,
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });

    if (!staff.length) return [];

    const staffIds = staff.map((member) => member.id);
    const [attendance, leaves] = await Promise.all([
      this.prisma.attendance.findMany({
        where: {
          hotelId,
          staffId: { in: staffIds },
          timestamp: { gte: dayStart, lte: dayEnd },
        },
        orderBy: { timestamp: 'asc' },
      }),
      this.prisma.leave.findMany({
        where: {
          hotelId,
          staffId: { in: staffIds },
          status: 'APPROVED',
          startDate: { lte: dayEnd },
          endDate: { gte: dayStart },
        },
        select: { staffId: true },
      }),
    ]);

    const attendanceMap = new Map<string, any[]>();
    attendance.forEach((record) => {
      const list = attendanceMap.get(record.staffId) ?? [];
      list.push(record);
      attendanceMap.set(record.staffId, list);
    });
    const leaveSet = new Set(leaves.map((leave) => leave.staffId));

    return staff.filter((member) => {
      if (leaveSet.has(member.id)) return false;
      if ((attendanceMap.get(member.id) ?? []).length > 0) return false;
      if (member.hireDate && dayjs(member.hireDate).endOf('day').isAfter(now)) return false;
      return true;
    });
  }

  async runAbsenceDetectionForDate(referenceDate = new Date()) {
    const reference = new Date(referenceDate);
    const hotels = await this.prisma.hotel.findMany({
      include: {
        cronSettings: {
          where: { jobType: HotelCronJobType.ATTENDANCE_ABSENCE_SCAN },
          take: 1,
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    let absentCount = 0;
    let hotelsProcessed = 0;
    let hotelsFailed = 0;

    for (const hotel of hotels) {
      const cronSetting = hotel.cronSettings[0];
      const enabled = cronSetting?.enabled ?? true;
      const runAtHour = cronSetting?.runAtHour ?? 9;
      const runAtMinute = cronSetting?.runAtMinute ?? 15;
      const timezone = hotel.timezone || 'Africa/Lagos';

      if (!enabled) continue;

      const localNow = getZonedDateParts(reference, timezone);
      const localMinutes = localNow.hour * 60 + localNow.minute;
      const scheduledMinutes = runAtHour * 60 + runAtMinute;
      if (localMinutes < scheduledMinutes) continue;

      const alertDate = localNow.date;
      if (cronSetting?.lastTriggeredAt) {
        const lastTriggeredDate = getZonedDateParts(cronSetting.lastTriggeredAt, timezone).date;
        if (lastTriggeredDate === alertDate) continue;
      }

      try {
        const targetDay = dayjs(`${alertDate}T00:00:00`);
        const absentStaff = await this.getAbsentStaffForHotelDay(hotel.id, targetDay);
        absentCount += absentStaff.length;
        hotelsProcessed += 1;

        for (const member of absentStaff) {
          await this.dispatchAbsenceInAppAlert({
            hotelId: hotel.id,
            staff: member,
            alertDate: localNow.date,
          });
        }

        await this.dispatchAbsenceDigestEmail({
          hotelId: hotel.id,
          alertDate: localNow.date,
          absentStaff,
        });

        await this.recordCronJobSuccess({
          hotelId: hotel.id,
          jobType: HotelCronJobType.ATTENDANCE_ABSENCE_SCAN,
          enabled,
          runAtHour,
          runAtMinute,
          triggeredAt: reference,
        });
      } catch (error) {
        hotelsFailed += 1;
        this.logger.error(
          `Attendance absence scan failed for hotel ${hotel.id}: ${String(error)}`,
        );

        await this.recordCronJobFailure({
          hotelId: hotel.id,
          jobType: HotelCronJobType.ATTENDANCE_ABSENCE_SCAN,
          enabled,
          runAtHour,
          runAtMinute,
          triggeredAt: reference,
          error,
        });
      }
    }

    return {
      date: reference.toISOString(),
      hotelsProcessed,
      hotelsFailed,
      absentStaffCount: absentCount,
    };
  }

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

    await this.dispatchLateClockInAlert({
      hotelId: staff.hotelId,
      staffId: staff.id,
      timestamp: record.timestamp,
      method: record.method,
      fallbackStaff: {
        employeeCode: staff.employeeCode,
        firstName: staff.firstName,
        lastName: staff.lastName,
        department: staff.department,
        position: staff.position,
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

  async clockIn(staffId: string, actorUserId?: string, method = 'PIN', note?: string) {
    const hotelId = await this.getStaffHotelId(staffId);
    const today = dayjs().startOf('day').toDate();
    const lastRecord = await this.prisma.attendance.findFirst({
      where: { staffId, timestamp: { gte: today } },
      orderBy: { timestamp: 'desc' },
    });
    if (lastRecord?.type === AttendanceType.CLOCK_IN) {
      throw new BadRequestException('Already clocked in. Please clock out first.');
    }
    const record = await this.prisma.attendance.create({
      data: { staffId, hotelId, type: AttendanceType.CLOCK_IN, method, note },
    });

    await this.dispatchLateClockInAlert({
      hotelId,
      staffId,
      actorUserId,
      timestamp: record.timestamp,
      method: record.method,
    });

    return record;
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

    const allStaff = total
      ? await this.prisma.staff.findMany({
          where,
          select: {
            id: true,
            userId: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
            department: true,
            position: true,
            hireDate: true,
          },
        })
      : [];
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

    const record = await this.prisma.attendance.create({
      data: {
        staffId: staff.id,
        hotelId: staff.hotelId,
        type: AttendanceType.CLOCK_IN,
        method: body.method ?? 'MANUAL',
        note: body.note,
        timestamp,
      },
    });

    await this.dispatchLateClockInAlert({
      hotelId: staff.hotelId,
      staffId: staff.id,
      actorUserId: userId,
      timestamp: record.timestamp,
      method: record.method,
    });

    return record;
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

function fmtDateTime(value: Date) {
  return new Date(value).toLocaleString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function fmtTime(value: Date) {
  return new Date(value).toLocaleTimeString('en-NG', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getZonedDateParts(value: Date, timezone: string) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(value);
  const read = (type: string) => parts.find((part) => part.type === type)?.value ?? '00';

  return {
    date: `${read('year')}-${read('month')}-${read('day')}`,
    hour: Number(read('hour')),
    minute: Number(read('minute')),
  };
}
