import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { HotelCronJobType } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { FilterDto } from '../dtos/filter.dto';
import { NotificationsService } from '../../notifications/notifications.service';

const MAINTENANCE_ESCALATION_SCAN_JOB_TYPE =
  'MAINTENANCE_ESCALATION_SCAN' as HotelCronJobType;

@Injectable()
export class FacilitiesService {
  private readonly logger = new Logger(FacilitiesService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  private generateCode(prefix: string) {
    const year = new Date().getFullYear();
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${year}-${rand}`;
  }

  private removeEmptyRelationIds<T extends Record<string, any>>(data: T, fields: string[]) {
    const normalized = { ...data };
    for (const field of fields) {
      if (normalized[field] === '') delete normalized[field];
    }
    return normalized;
  }

  private async assertStaffBelongsToHotel(hotelId: string, staffId?: string | null) {
    if (!staffId) return;
    const staff = await this.prisma.staff.findFirst({
      where: { id: staffId, hotelId },
      select: { id: true },
    });
    if (!staff) throw new NotFoundException('Staff not found');
  }

  private async assertGuestBelongsToHotel(hotelId: string, guestId?: string | null) {
    if (!guestId) return;
    const guest = await this.prisma.guest.findFirst({
      where: { id: guestId, hotelId },
      select: { id: true },
    });
    if (!guest) throw new NotFoundException('Guest not found');
  }

  private async assertRoomBelongsToHotel(hotelId: string, roomId?: string | null) {
    if (!roomId) return;
    const room = await this.prisma.room.findFirst({
      where: { id: roomId, hotelId },
      select: { id: true },
    });
    if (!room) throw new NotFoundException('Room not found');
  }

  private async assertReservationBelongsToHotel(hotelId: string, reservationId?: string | null) {
    if (!reservationId) return;
    const reservation = await this.prisma.reservation.findFirst({
      where: { id: reservationId, hotelId },
      select: { id: true },
    });
    if (!reservation) throw new NotFoundException('Reservation not found');
  }

  private async assertFacilityBelongsToHotel(hotelId: string, facilityId?: string | null) {
    if (!facilityId) return;
    const facility = await this.prisma.facility.findFirst({
      where: { id: facilityId, hotelId },
      select: { id: true },
    });
    if (!facility) throw new NotFoundException('Facility not found');
  }

  private async assertMaintenanceBelongsToHotel(hotelId: string, maintenanceRequestId?: string | null) {
    if (!maintenanceRequestId) return;
    const request = await this.prisma.maintenanceRequest.findFirst({
      where: { id: maintenanceRequestId, hotelId },
      select: { id: true },
    });
    if (!request) throw new NotFoundException('Maintenance request not found');
  }

  private async assertInspectionBelongsToHotel(hotelId: string, inspectionId?: string | null) {
    if (!inspectionId) return;
    const inspection = await this.prisma.facilityInspection.findFirst({
      where: { id: inspectionId, hotelId },
      select: { id: true },
    });
    if (!inspection) throw new NotFoundException('Inspection not found');
  }

  private async validateFacilityConfigRelations(hotelId: string, dto: any) {
    const [type, location, department] = await Promise.all([
      dto.typeId
        ? this.prisma.facilityType.findFirst({ where: { id: dto.typeId, hotelId }, select: { id: true } })
        : Promise.resolve(null),
      dto.locationId
        ? this.prisma.facilityLocation.findFirst({ where: { id: dto.locationId, hotelId }, select: { id: true } })
        : Promise.resolve(null),
      dto.departmentId
        ? this.prisma.facilityDepartment.findFirst({
            where: { id: dto.departmentId, hotelId },
            select: { id: true },
          })
        : Promise.resolve(null),
    ]);

    if (dto.typeId && !type) throw new NotFoundException('Facility type not found');
    if (dto.locationId && !location) throw new NotFoundException('Facility location not found');
    if (dto.departmentId && !department) throw new NotFoundException('Facility department not found');
    await this.assertStaffBelongsToHotel(hotelId, dto.managerId);
  }

  private groupCounts(rows: Array<{ group: string; count: number }>) {
    return rows.sort((a, b) => b.count - a.count || a.group.localeCompare(b.group));
  }

  private isUrgentMaintenancePriority(priority?: string | null) {
    return ['HIGH', 'URGENT', 'CRITICAL'].includes((priority ?? '').toUpperCase());
  }

  private buildMaintenanceAlertEmail(args: {
    hotelName: string;
    requestNo: string;
    title: string;
    priority: string;
    facilityName?: string | null;
    roomNumber?: string | null;
    assignedToName?: string | null;
    status: string;
  }) {
    const hotelName = escapeHtml(args.hotelName);
    const requestNo = escapeHtml(args.requestNo);
    const title = escapeHtml(args.title);
    const priority = escapeHtml(args.priority);
    const facilityName = args.facilityName ? escapeHtml(args.facilityName) : null;
    const roomNumber = args.roomNumber ? escapeHtml(args.roomNumber) : null;
    const assignedToName = args.assignedToName ? escapeHtml(args.assignedToName) : null;
    const status = escapeHtml(args.status);

    return {
      subject: `Urgent maintenance alert: ${requestNo}`,
      text:
        `${args.hotelName}: an urgent maintenance request needs attention.\n` +
        `Request: ${args.requestNo}\n` +
        `Title: ${args.title}\n` +
        `Priority: ${args.priority}\n` +
        `Status: ${args.status}` +
        (args.facilityName ? `\nFacility: ${args.facilityName}` : '') +
        (args.roomNumber ? `\nRoom: ${args.roomNumber}` : '') +
        (args.assignedToName ? `\nAssigned to: ${args.assignedToName}` : ''),
      html: `
        <div>
          <p style="margin: 0 0 12px;">An urgent maintenance request was raised at <strong>${hotelName}</strong>.</p>
          <p style="margin: 0 0 18px; color: #475569;">
            This issue may need immediate operational attention depending on guest or facility impact.
          </p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse; margin: 0 0 8px;">
            <tr>
              <td style="width: 50%; padding: 0 6px 12px 0; vertical-align: top;">
                <div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 14px; padding: 14px 16px;">
                  <div style="margin-bottom: 6px; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: #9a3412;">Priority</div>
                  <div style="font-size: 20px; font-weight: 700; color: #7c2d12;">${priority}</div>
                </div>
              </td>
              <td style="width: 50%; padding: 0 0 12px 6px; vertical-align: top;">
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px 16px;">
                  <div style="margin-bottom: 6px; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: #64748b;">Status</div>
                  <div style="font-size: 20px; font-weight: 700; color: #0f172a;">${status}</div>
                </div>
              </td>
            </tr>
          </table>
          <div style="margin-top: 16px; overflow: hidden; border: 1px solid #e2e8f0; border-radius: 16px;">
            <div style="padding: 14px 16px; background: #f8fafc; font-weight: 700; color: #0f172a;">Request details</div>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
              <tr><td style="padding: 10px 16px 10px 0; color: #64748b; font-weight: 600;">Request</td><td style="padding: 10px 0; color: #0f172a;">${requestNo}</td></tr>
              <tr><td style="padding: 10px 16px 10px 0; color: #64748b; font-weight: 600;">Issue</td><td style="padding: 10px 0; color: #0f172a;">${title}</td></tr>
              ${facilityName ? `<tr><td style="padding: 10px 16px 10px 0; color: #64748b; font-weight: 600;">Facility</td><td style="padding: 10px 0; color: #0f172a;">${facilityName}</td></tr>` : ''}
              ${roomNumber ? `<tr><td style="padding: 10px 16px 10px 0; color: #64748b; font-weight: 600;">Room</td><td style="padding: 10px 0; color: #0f172a;">${roomNumber}</td></tr>` : ''}
              ${assignedToName ? `<tr><td style="padding: 10px 16px 10px 0; color: #64748b; font-weight: 600;">Assigned to</td><td style="padding: 10px 0; color: #0f172a;">${assignedToName}</td></tr>` : ''}
            </table>
          </div>
        </div>
      `,
    };
  }

  private buildMaintenanceAlertInAppNotification(args: {
    requestId: string;
    requestNo: string;
    title: string;
    priority: string;
    facilityName?: string | null;
    roomNumber?: string | null;
    status: string;
  }) {
    const target = args.facilityName
      ? `facility ${args.facilityName}`
      : args.roomNumber
        ? `room ${args.roomNumber}`
        : 'the property';
    const priorityLabel = args.priority.toUpperCase();

    return {
      title: `${priorityLabel} maintenance request opened`,
      message: `Request ${args.requestNo} was opened for ${target}. Issue: ${args.title}. Current status: ${args.status}.`,
      metadata: {
        requestId: args.requestId,
        requestNo: args.requestNo,
        title: args.title,
        priority: args.priority,
        facilityName: args.facilityName ?? null,
        roomNumber: args.roomNumber ?? null,
        status: args.status,
        severity:
          args.priority === 'URGENT' || args.priority === 'HIGH'
            ? 'critical'
            : 'warning',
        summary: `${priorityLabel} issue affecting ${target}`,
        href: '/facilities/maintenance',
      },
    };
  }

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

  private buildMaintenanceEscalationEmail(args: {
    hotelName: string;
    alertDate: string;
    requests: Array<{
      requestId: string;
      requestNo: string;
      title: string;
      priority: string;
      status: string;
      facilityName: string | null;
      roomNumber: string | null;
      assignedToName: string | null;
      hoursOpen: number;
    }>;
  }) {
    const rows = args.requests
      .map(
        (request) => `
          <tr>
            <td style="padding: 6px 12px 6px 0;">${escapeHtml(request.requestNo)}</td>
            <td style="padding: 6px 12px 6px 0;">${escapeHtml(request.priority)}</td>
            <td style="padding: 6px 12px 6px 0;">${escapeHtml(request.status)}</td>
            <td style="padding: 6px 12px 6px 0;">${escapeHtml(request.facilityName ?? request.roomNumber ?? 'Property-wide')}</td>
            <td style="padding: 6px 0;">${request.hoursOpen}h</td>
          </tr>
        `,
      )
      .join('');

    return {
      subject: `Maintenance escalation for ${args.hotelName}`,
      text:
        `${args.requests.length} maintenance request${args.requests.length === 1 ? '' : 's'} still need escalation review as of ${args.alertDate}.\n` +
        args.requests
          .map(
            (request) =>
              `- ${request.requestNo}: ${request.title} (${request.priority}, ${request.status}, ${request.hoursOpen}h open)`,
          )
          .join('\n'),
      html: `
        <div>
          <p style="margin: 0 0 12px;">
            <strong>${escapeHtml(args.hotelName)}</strong> has urgent or high-priority maintenance requests that are still unresolved as of ${escapeHtml(args.alertDate)}.
          </p>
          <p style="margin: 0 0 18px; color: #475569;">
            Review the requests below so blocked rooms, guest-impacting issues, and longer-running repairs are escalated before they slip further.
          </p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse; margin: 0 0 8px;">
            <tr>
              <td style="width: 50%; padding: 0 6px 12px 0; vertical-align: top;">
                <div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 14px; padding: 14px 16px;">
                  <div style="margin-bottom: 6px; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: #9a3412;">Escalations</div>
                  <div style="font-size: 20px; font-weight: 700; color: #7c2d12;">${args.requests.length}</div>
                </div>
              </td>
              <td style="width: 50%; padding: 0 0 12px 6px; vertical-align: top;">
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px 16px;">
                  <div style="margin-bottom: 6px; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: #64748b;">Alert Date</div>
                  <div style="font-size: 20px; font-weight: 700; color: #0f172a;">${escapeHtml(args.alertDate)}</div>
                </div>
              </td>
            </tr>
          </table>
          <div style="margin-top: 16px; overflow: hidden; border: 1px solid #e2e8f0; border-radius: 16px;">
            <div style="padding: 14px 16px; background: #f8fafc; font-weight: 700; color: #0f172a;">Requests still open</div>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
              <thead>
                <tr>
                  <th style="padding: 12px 16px 10px 0; text-align: left; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em;">Request</th>
                  <th style="padding: 12px 16px 10px 0; text-align: left; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em;">Priority</th>
                  <th style="padding: 12px 16px 10px 0; text-align: left; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em;">Status</th>
                  <th style="padding: 12px 16px 10px 0; text-align: left; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em;">Location</th>
                  <th style="padding: 12px 0 10px; text-align: left; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em;">Hours Open</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </div>
      `,
    };
  }

  private buildMaintenanceEscalationInAppNotification(args: {
    alertDate: string;
    requests: Array<{
      requestId: string;
      requestNo: string;
      title: string;
      priority: string;
      status: string;
      facilityName: string | null;
      roomNumber: string | null;
      assignedToName: string | null;
      hoursOpen: number;
    }>;
  }) {
    const longestWaiting = args.requests.reduce(
      (max, request) => Math.max(max, request.hoursOpen),
      0,
    );

    return {
      title: 'Maintenance issues need escalation',
      message: `${args.requests.length} high-priority maintenance request${args.requests.length === 1 ? '' : 's'} remain open and need attention as of ${args.alertDate}.`,
      metadata: {
        alertDate: args.alertDate,
        jobType: MAINTENANCE_ESCALATION_SCAN_JOB_TYPE,
        severity: 'critical',
        escalationCount: args.requests.length,
        summary:
          longestWaiting > 0
            ? `Oldest urgent request has been open for ${longestWaiting}h`
            : 'Urgent maintenance requests remain unresolved',
        href: '/facilities/maintenance',
        requests: args.requests,
      },
    };
  }

  // ============ FACILITIES =========== //

  async getReportsSummary(
    hotelId: string,
    filters: { dateFrom?: string; dateTo?: string },
  ) {
    const complaintWhere: any = { hotelId };
    const maintenanceWhere: any = { hotelId };
    const requisitionWhere: any = { hotelId };
    const inspectionWhere: any = { hotelId };

    if (filters.dateFrom || filters.dateTo) {
      complaintWhere.createdAt = {};
      maintenanceWhere.createdAt = {};
      requisitionWhere.createdAt = {};
      inspectionWhere.scheduledAt = {};

      if (filters.dateFrom) {
        const dateFrom = new Date(filters.dateFrom);
        complaintWhere.createdAt.gte = dateFrom;
        maintenanceWhere.createdAt.gte = dateFrom;
        requisitionWhere.createdAt.gte = dateFrom;
        inspectionWhere.scheduledAt.gte = dateFrom;
      }

      if (filters.dateTo) {
        const dateTo = new Date(filters.dateTo);
        complaintWhere.createdAt.lte = dateTo;
        maintenanceWhere.createdAt.lte = dateTo;
        requisitionWhere.createdAt.lte = dateTo;
        inspectionWhere.scheduledAt.lte = dateTo;
      }
    }

    const [facilities, complaints, inspections, maintenanceRequests, requisitions] =
      await Promise.all([
        this.prisma.facility.findMany({
          where: { hotelId },
          select: {
            id: true,
            name: true,
            status: true,
            type: { select: { name: true } },
            location: { select: { name: true } },
            department: { select: { name: true } },
          },
        }),
        this.prisma.facilityComplaint.findMany({
          where: complaintWhere,
          select: { facilityId: true, status: true },
        }),
        this.prisma.facilityInspection.findMany({
          where: inspectionWhere,
          select: { facilityId: true, status: true, score: true },
        }),
        this.prisma.maintenanceRequest.findMany({
          where: maintenanceWhere,
          select: { facilityId: true, status: true, totalCost: true },
        }),
        this.prisma.facilityRequisition.findMany({
          where: requisitionWhere,
          select: { status: true },
        }),
      ]);

    const activeFacilities = facilities.filter((facility) => facility.status === 'ACTIVE').length;
    const inactiveFacilities = facilities.filter((facility) => facility.status === 'INACTIVE').length;
    const maintenanceFacilities = facilities.filter((facility) => facility.status === 'MAINTENANCE').length;

    const openComplaints = complaints.filter((complaint) =>
      ['NEW', 'ACKNOWLEDGED', 'IN_PROGRESS'].includes(complaint.status),
    ).length;
    const resolvedComplaints = complaints.filter((complaint) =>
      ['RESOLVED', 'CLOSED'].includes(complaint.status),
    ).length;

    const submittedInspections = inspections.filter(
      (inspection) => inspection.status === 'SUBMITTED',
    ).length;
    const scheduledInspections = inspections.filter(
      (inspection) => inspection.status === 'SCHEDULED',
    ).length;

    const activeMaintenance = maintenanceRequests.filter(
      (request) => !['RESOLVED', 'CLOSED'].includes(request.status),
    ).length;
    const closedMaintenance = maintenanceRequests.filter((request) =>
      ['RESOLVED', 'CLOSED'].includes(request.status),
    ).length;

    const pendingRequisitions = requisitions.filter(
      (requisition) => requisition.status === 'PENDING',
    ).length;
    const approvedRequisitions = requisitions.filter(
      (requisition) => requisition.status === 'APPROVED',
    ).length;
    const fulfilledRequisitions = requisitions.filter(
      (requisition) => requisition.status === 'FULFILLED',
    ).length;

    const maintenanceSpend = maintenanceRequests
      .filter((request) => ['RESOLVED', 'CLOSED'].includes(request.status))
      .reduce((sum, request) => sum + Number(request.totalCost ?? 0), 0);

    const facilityHealth = facilities.map((facility) => {
      const facilityComplaints = complaints.filter((complaint) => complaint.facilityId === facility.id);
      const facilityInspections = inspections.filter((inspection) => inspection.facilityId === facility.id);
      const facilityMaintenance = maintenanceRequests.filter(
        (request) => request.facilityId === facility.id,
      );
      const score = facilityInspections.length
        ? Math.round(
            facilityInspections.reduce((sum, inspection) => sum + Number(inspection.score ?? 0), 0) /
              facilityInspections.length,
          )
        : 0;

      const health =
        score >= 80
          ? 'Good'
          : score >= 60
            ? 'Fair'
            : score > 0
              ? 'Poor'
              : facilityMaintenance.length > 0
                ? 'Maintenance'
                : 'Not Inspected';

      return {
        name: facility.name,
        complaints: facilityComplaints.length,
        inspections: facilityInspections.length,
        maintenance: facilityMaintenance.length,
        score,
        health,
      };
    });

    const groupedType = this.groupCounts(
      Object.entries(
        facilities.reduce<Record<string, number>>((acc, facility) => {
          const key = facility.type?.name ?? 'Unassigned';
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {}),
      ).map(([group, count]) => ({ group, count })),
    );

    const groupedLocation = this.groupCounts(
      Object.entries(
        facilities.reduce<Record<string, number>>((acc, facility) => {
          const key = facility.location?.name ?? 'Unassigned';
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {}),
      ).map(([group, count]) => ({ group, count })),
    );

    const groupedDepartment = this.groupCounts(
      Object.entries(
        facilities.reduce<Record<string, number>>((acc, facility) => {
          const key = facility.department?.name ?? 'Unassigned';
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {}),
      ).map(([group, count]) => ({ group, count })),
    );

    return {
      summary: {
        facilities: {
          total: facilities.length,
          active: activeFacilities,
          inactive: inactiveFacilities,
          maintenance: maintenanceFacilities,
        },
        complaints: {
          total: complaints.length,
          open: openComplaints,
          resolved: resolvedComplaints,
        },
        inspections: {
          total: inspections.length,
          submitted: submittedInspections,
          scheduled: scheduledInspections,
        },
        maintenance: {
          total: maintenanceRequests.length,
          active: activeMaintenance,
          closed: closedMaintenance,
          spend: maintenanceSpend,
        },
        requisitions: {
          total: requisitions.length,
          pending: pendingRequisitions,
          approved: approvedRequisitions,
          fulfilled: fulfilledRequisitions,
        },
      },
      facilityHealth,
      grouped: {
        type: groupedType,
        location: groupedLocation,
        department: groupedDepartment,
      },
    };
  }

  async listFacilities(hotelId: string, filters: any) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 30;
    const skip = (page - 1) * limit;

    const where: any = { hotelId };
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    if (filters.type) where.typeId = filters.type;
    if (filters.status) {
      where.status = filters.status === 'Under Maintenance' ? 'MAINTENANCE' : filters.status;
    }

    const [facilities, total, statusGroups] = await Promise.all([
      this.prisma.facility.findMany({
        where,
        skip,
        take: limit,
        include: {
          type: true,
          location: true,
          department: true,
          manager: { select: { firstName: true, lastName: true } },
          _count: { select: { inspections: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.facility.count({ where }),
      this.prisma.facility.groupBy({
        by: ['status'],
        where,
        _count: { _all: true },
      }),
    ]);

    const mappedFacilities = facilities.map((facility) => {
      const location =
        facility.location?.name ??
        [facility.location?.building, facility.location?.floor].filter(Boolean).join(' - ');
      const manager = facility.manager
        ? `${facility.manager.firstName} ${facility.manager.lastName}`.trim()
        : null;
      const status =
        facility.status === 'MAINTENANCE'
          ? 'Under Maintenance'
          : facility.status?.charAt(0).toUpperCase() + facility.status?.slice(1).toLowerCase();

      return {
        id: facility.id,
        name: facility.name,
        type: facility.type?.name ?? null,
        location: location || null,
        department: facility.department?.name ?? null,
        status,
        quantities: 0,
        manager,
        description: facility.description ?? null,
        inspections: facility._count?.inspections ?? 0,
        typeId: facility.typeId,
        locationId: facility.locationId,
        departmentId: facility.departmentId,
        managerId: facility.managerId,
        capacity: facility.capacity,
        openTime: facility.openTime,
        closeTime: facility.closeTime,
        operatingSchedule: facility.operatingSchedule,
        baseRate: facility.baseRate ? Number(facility.baseRate) : null,
        rateUnit: facility.rateUnit,
        requiresApproval: facility.requiresApproval,
        minDurationMins: facility.minDurationMins,
        maxDurationMins: facility.maxDurationMins,
        images: facility.images,
        amenities: facility.amenities,
      };
    });

    const stats = {
      total,
      active: 0,
      inactive: 0,
      maintenance: 0,
    };

    for (const row of statusGroups) {
      if (row.status === 'ACTIVE') stats.active = row._count._all;
      if (row.status === 'INACTIVE') stats.inactive = row._count._all;
      if (row.status === 'MAINTENANCE') stats.maintenance = row._count._all;
    }

    return {
      facilities: mappedFacilities,
      stats,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      meta: {
        total,
        current_page: page,
        last_page: Math.ceil(total / limit),
        per_page: limit,
        from: skip + 1,
        to: Math.min(skip + limit, total),
      },
    };
  }

  async getFacility(hotelId: string, id: string) {
    const facility = await this.prisma.facility.findFirst({
      where: { id, hotelId },
      include: {
        type: true,
        location: true,
        department: true,
      },
    });
    if (!facility) throw new NotFoundException('Facility not found');
    return facility;
  }

  async createFacility(hotelId: string, dto: any) {
    const data: any = {
      ...this.removeEmptyRelationIds(dto, ['typeId', 'locationId', 'departmentId', 'managerId']),
      hotelId,
    };

    if (data.type && !data.typeId) {
      const type = await this.prisma.facilityType.findFirst({
        where: { hotelId, name: data.type },
        select: { id: true },
      });
      if (type) data.typeId = type.id;
    }

    delete data.type;
    await this.validateFacilityConfigRelations(hotelId, data);

    return this.prisma.facility.create({ data });
  }

  async updateFacility(hotelId: string, id: string, dto: any) {
    const facility = await this.getFacility(hotelId, id);
    const data: any = this.removeEmptyRelationIds(dto, ['typeId', 'locationId', 'departmentId', 'managerId']);

    if (data.type && !data.typeId) {
      const type = await this.prisma.facilityType.findFirst({
        where: { hotelId, name: data.type },
        select: { id: true },
      });
      if (type) data.typeId = type.id;
    }

    delete data.type;
    await this.validateFacilityConfigRelations(hotelId, data);
    return this.prisma.facility.update({
      where: { id: facility.id },
      data,
    });
  }

  async deleteFacility(hotelId: string, id: string) {
    const facility = await this.prisma.facility.findFirst({ where: { id, hotelId } });
    if (!facility) throw new NotFoundException('Facility not found');

    const [bookings, requisitions, maintenance, complaints, inspections] = await Promise.all([
      this.prisma.facilityBooking.count({ where: { hotelId, facilityId: id } }),
      this.prisma.facilityRequisition.count({ where: { hotelId, facilityId: id } }),
      this.prisma.maintenanceRequest.count({ where: { hotelId, facilityId: id } }),
      this.prisma.facilityComplaint.count({ where: { hotelId, facilityId: id } }),
      this.prisma.facilityInspection.count({ where: { hotelId, facilityId: id } }),
    ]);

    if (bookings + requisitions + maintenance + complaints + inspections > 0) {
      throw new BadRequestException('Cannot delete a facility with linked activity.');
    }

    await this.prisma.facility.delete({ where: { id: facility.id } });
    return { success: true };
  }

  // ============ BOOKINGS =========== //

  async listBookings(hotelId: string, filters: any) {
    const page = Number(filters.page ?? 1);
    const limit = Number(filters.limit ?? 30);
    const skip = (page - 1) * limit;

    const where: any = { hotelId };
    if (filters.search) {
      where.OR = [
        { guestName: { contains: filters.search, mode: 'insensitive' } },
        { roomNo: { contains: filters.search, mode: 'insensitive' } },
        { reservationId: { contains: filters.search, mode: 'insensitive' } },
        { facility: { name: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }
    if (filters.facilityId) where.facilityId = filters.facilityId;
    if (filters.status) where.status = filters.status;
    if (filters.dateFrom || filters.dateTo) {
      where.startTime = {};
      if (filters.dateFrom) where.startTime.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.startTime.lte = new Date(filters.dateTo);
    }

    const [bookings, total] = await Promise.all([
      this.prisma.facilityBooking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startTime: 'asc' },
        include: {
          facility: true,
        },
      }),
      this.prisma.facilityBooking.count({ where }),
    ]);

    return {
      bookings,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      meta: {
        total,
        current_page: page,
        last_page: Math.ceil(total / limit),
        per_page: limit,
        from: skip + 1,
        to: Math.min(skip + limit, total),
      },
    };
  }

  async createBooking(hotelId: string, staffId: string, dto: any) {
    const data = this.removeEmptyRelationIds(dto, [
      'reservationId',
      'guestId',
      'invoiceId',
      'approvedBy',
      'creditNoteId',
      'refundId',
      'createdBy',
    ]);
    const facility = await this.prisma.facility.findFirst({
      where: { id: data.facilityId, hotelId },
      select: { requiresApproval: true },
    });
    if (!facility) throw new NotFoundException('Facility not found');

    const start = new Date(data.startTime);
    const end = new Date(data.endTime);
    const durationMins =
      data.durationMins ?? Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));

    const status = data.status ?? (facility.requiresApproval ? 'PENDING' : 'CONFIRMED');
    const createdBy = data.createdBy ?? staffId;
    await Promise.all([
      this.assertReservationBelongsToHotel(hotelId, data.reservationId),
      this.assertGuestBelongsToHotel(hotelId, data.guestId),
      this.assertStaffBelongsToHotel(hotelId, createdBy),
      this.assertStaffBelongsToHotel(hotelId, data.approvedBy),
    ]);

    return this.prisma.facilityBooking.create({
      data: {
        ...data,
        hotelId,
        durationMins,
        status,
        createdBy,
      },
    });
  }

  async updateBooking(hotelId: string, id: string, dto: any) {
    const data = this.removeEmptyRelationIds(dto, [
      'facilityId',
      'reservationId',
      'guestId',
      'invoiceId',
      'approvedBy',
      'creditNoteId',
      'refundId',
    ]);
    const booking = await this.prisma.facilityBooking.findFirst({
      where: { id, hotelId },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    await Promise.all([
      this.assertFacilityBelongsToHotel(hotelId, data.facilityId),
      this.assertReservationBelongsToHotel(hotelId, data.reservationId),
      this.assertGuestBelongsToHotel(hotelId, data.guestId),
      this.assertStaffBelongsToHotel(hotelId, data.createdBy),
      this.assertStaffBelongsToHotel(hotelId, data.approvedBy),
    ]);

    if (data.startTime || data.endTime) {
      const start = new Date(data.startTime ?? booking.startTime);
      const end = new Date(data.endTime ?? booking.endTime);
      data.durationMins =
        data.durationMins ?? Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
    }

    return this.prisma.facilityBooking.update({
      where: { id: booking.id },
      data,
    });
  }

  async cancelBooking(hotelId: string, id: string, dto: any) {
    const booking = await this.prisma.facilityBooking.findFirst({
      where: { id, hotelId },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    return this.prisma.facilityBooking.update({
      where: { id: booking.id },
      data: {
        status: 'CANCELLED',
        cancelledAt: dto.cancelledAt ? new Date(dto.cancelledAt) : new Date(),
        cancelReason: dto.cancelReason,
        refundMethod: dto.refundMethod,
        creditNoteId: dto.creditNoteId,
        refundId: dto.refundId,
      },
    });
  }

  // ============ END BOOKINGS =========== //

  // ============ REQUISITIONS =========== //

  async listRequisitions(hotelId: string, filters: any) {
    const page = Number(filters.page ?? 1);
    const limit = Number(filters.limit ?? 30);
    const skip = (page - 1) * limit;

    const where: any = { hotelId };
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { priority: { contains: filters.search, mode: 'insensitive' } },
        { facility: { name: { contains: filters.search, mode: 'insensitive' } } },
        { requestedByStaff: { firstName: { contains: filters.search, mode: 'insensitive' } } },
        { requestedByStaff: { lastName: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }
    if (filters.facilityId) where.facilityId = filters.facilityId;
    if (filters.status) where.status = filters.status;
    if (filters.priority) where.priority = filters.priority;
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.createdAt.lte = new Date(filters.dateTo);
    }

    const [requisitions, total] = await Promise.all([
      this.prisma.facilityRequisition.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          facility: true,
          requestedByStaff: { select: { id: true, firstName: true, lastName: true } },
          approvedByStaff: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.facilityRequisition.count({ where }),
    ]);

    return {
      requisitions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      meta: {
        total,
        current_page: page,
        last_page: Math.ceil(total / limit),
        per_page: limit,
        from: skip + 1,
        to: Math.min(skip + limit, total),
      },
    };
  }

  async createRequisition(hotelId: string, staffId: string, dto: any) {
    const data = this.removeEmptyRelationIds(dto, ['approvedBy', 'requestedBy']);
    const requestedBy = data.requestedBy ?? staffId;
    await Promise.all([
      this.assertFacilityBelongsToHotel(hotelId, data.facilityId),
      this.assertStaffBelongsToHotel(hotelId, requestedBy),
      this.assertStaffBelongsToHotel(hotelId, data.approvedBy),
    ]);

    return this.prisma.facilityRequisition.create({
      data: {
        ...data,
        hotelId,
        requestedBy,
        status: data.status ?? 'PENDING',
      },
    });
  }

  async updateRequisition(hotelId: string, id: string, dto: any) {
    const data = this.removeEmptyRelationIds(dto, ['facilityId', 'approvedBy', 'requestedBy']);
    const req = await this.prisma.facilityRequisition.findFirst({
      where: { id, hotelId },
    });
    if (!req) throw new NotFoundException('Requisition not found');
    await Promise.all([
      this.assertFacilityBelongsToHotel(hotelId, data.facilityId),
      this.assertStaffBelongsToHotel(hotelId, data.requestedBy),
      this.assertStaffBelongsToHotel(hotelId, data.approvedBy),
    ]);

    return this.prisma.facilityRequisition.update({
      where: { id: req.id },
      data,
    });
  }

  // ============ END REQUISITION =========== //

  // ============ MAINTENANCE =========== //

  async listMaintenance(hotelId: string, filters: any) {
    const page = Number(filters.page ?? 1);
    const limit = Number(filters.limit ?? 30);
    const skip = (page - 1) * limit;

    const where: any = { hotelId };
    if (filters.search) {
      where.OR = [
        { requestNo: { contains: filters.search, mode: 'insensitive' } },
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { category: { contains: filters.search, mode: 'insensitive' } },
        { facility: { name: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }
    if (filters.facilityId) where.facilityId = filters.facilityId;
    if (filters.status) where.status = filters.status;
    if (filters.priority) where.priority = filters.priority;
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.createdAt.lte = new Date(filters.dateTo);
    }

    const [maintenanceRequests, total] = await Promise.all([
      this.prisma.maintenanceRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          facility: true,
          assignedToStaff: true,
        },
      }),
      this.prisma.maintenanceRequest.count({ where }),
    ]);

    return {
      maintenanceRequests,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      meta: {
        total,
        current_page: page,
        last_page: Math.ceil(total / limit),
        per_page: limit,
        from: skip + 1,
        to: Math.min(skip + limit, total),
      },
    };
  }

  async createMaintenance(hotelId: string, staffId: string, dto: any, actorUserId?: string) {
    const data = this.removeEmptyRelationIds(dto, [
      'facilityId',
      'roomId',
      'reportedBy',
      'assignedTo',
      'inspectionId',
      'verificationInspectionId',
    ]);
    const reportedBy = data.reportedBy ?? staffId;
    await Promise.all([
      this.assertFacilityBelongsToHotel(hotelId, data.facilityId),
      this.assertRoomBelongsToHotel(hotelId, data.roomId),
      this.assertStaffBelongsToHotel(hotelId, reportedBy),
      this.assertStaffBelongsToHotel(hotelId, data.assignedTo),
      this.assertInspectionBelongsToHotel(hotelId, data.inspectionId),
      this.assertInspectionBelongsToHotel(hotelId, data.verificationInspectionId),
    ]);

    const request = await this.prisma.maintenanceRequest.create({
      data: {
        ...data,
        hotelId,
        requestNo: data.requestNo ?? this.generateCode('MR'),
        reportedBy,
        status: data.status ?? 'OPEN',
      },
      include: {
        facility: { select: { id: true, name: true } },
        room: { select: { id: true, number: true } },
        assignedToStaff: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (this.isUrgentMaintenancePriority(request.priority)) {
      try {
        const hotel = await this.prisma.hotel.findUnique({
          where: { id: hotelId },
          select: { name: true },
        });

        const assignedToName = request.assignedToStaff
          ? `${request.assignedToStaff.firstName} ${request.assignedToStaff.lastName}`.trim()
          : null;

        await this.notifications.dispatch({
          hotelId,
          event: 'maintenanceAlert',
          excludeEmailUserIds: actorUserId ? [actorUserId] : undefined,
          email: this.buildMaintenanceAlertEmail({
            hotelName: hotel?.name ?? 'HotelOS',
            requestNo: request.requestNo,
            title: request.title,
            priority: request.priority,
            facilityName: request.facility?.name ?? null,
            roomNumber: request.room?.number ?? null,
            assignedToName,
            status: request.status,
          }),
          inApp: this.buildMaintenanceAlertInAppNotification({
            requestId: request.id,
            requestNo: request.requestNo,
            title: request.title,
            priority: request.priority,
            facilityName: request.facility?.name ?? null,
            roomNumber: request.room?.number ?? null,
            status: request.status,
          }),
        });
      } catch (error) {
        this.logger.warn(
          `Failed to dispatch maintenanceAlert notification for ${request.requestNo}: ${String(error)}`,
        );
      }
    }

    return request;
  }

  async updateMaintenance(hotelId: string, id: string, dto: any) {
    const data = this.removeEmptyRelationIds(dto, [
      'facilityId',
      'roomId',
      'reportedBy',
      'assignedTo',
      'inspectionId',
      'verificationInspectionId',
    ]);
    const req = await this.prisma.maintenanceRequest.findFirst({
      where: { id, hotelId },
    });
    if (!req) throw new NotFoundException('Maintenance request not found');
    await Promise.all([
      this.assertFacilityBelongsToHotel(hotelId, data.facilityId),
      this.assertRoomBelongsToHotel(hotelId, data.roomId),
      this.assertStaffBelongsToHotel(hotelId, data.reportedBy),
      this.assertStaffBelongsToHotel(hotelId, data.assignedTo),
      this.assertInspectionBelongsToHotel(hotelId, data.inspectionId),
      this.assertInspectionBelongsToHotel(hotelId, data.verificationInspectionId),
    ]);

    return this.prisma.maintenanceRequest.update({
      where: { id: req.id },
      data,
    });
  }

  async runMaintenanceEscalationScanForDate(
    referenceDate = new Date(),
    hotelIdFilter?: string,
    force = false,
  ) {
    const reference = new Date(referenceDate);
    const hotels = (await this.prisma.hotel.findMany({
      where: hotelIdFilter ? { id: hotelIdFilter } : undefined,
      select: {
        id: true,
        name: true,
        timezone: true,
        cronSettings: {
          where: { jobType: MAINTENANCE_ESCALATION_SCAN_JOB_TYPE },
          take: 1,
        },
      } as any,
      orderBy: { createdAt: 'asc' },
    })) as unknown as Array<{
      id: string;
      name: string;
      timezone: string | null;
      cronSettings: Array<{
        enabled: boolean;
        runAtHour: number;
        runAtMinute: number;
        lastTriggeredAt?: Date | null;
      }>;
    }>;

    let requestsFlagged = 0;
    let hotelsProcessed = 0;
    let hotelsFailed = 0;

    for (const hotel of hotels) {
      const cronSetting = hotel.cronSettings[0];
      const enabled = cronSetting?.enabled ?? true;
      const runAtHour = cronSetting?.runAtHour ?? 16;
      const runAtMinute = cronSetting?.runAtMinute ?? 0;
      const timezone = hotel.timezone || 'Africa/Lagos';

      if (!enabled && !force) continue;

      const localNow = getZonedDateParts(reference, timezone);
      const alertDate = localNow.date;
      const localMinutes = localNow.hour * 60 + localNow.minute;
      const scheduledMinutes = runAtHour * 60 + runAtMinute;

      if (!force && localMinutes < scheduledMinutes) continue;

      if (!force && cronSetting?.lastTriggeredAt) {
        const lastTriggeredDate = getZonedDateParts(cronSetting.lastTriggeredAt, timezone).date;
        if (lastTriggeredDate === alertDate) continue;
      }

      try {
        const cutoff = new Date(reference.getTime() - 4 * 60 * 60 * 1000);
        const requests = await this.prisma.maintenanceRequest.findMany({
          where: {
            hotelId: hotel.id,
            priority: { in: ['HIGH', 'URGENT'] },
            status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'PENDING_PARTS'] },
            createdAt: { lte: cutoff },
          },
          select: {
            id: true,
            requestNo: true,
            title: true,
            priority: true,
            status: true,
            createdAt: true,
            facility: { select: { name: true } },
            room: { select: { number: true } },
            assignedToStaff: { select: { firstName: true, lastName: true } },
          },
          orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
        });

        if (!requests.length) {
          await this.recordCronJobSuccess({
            hotelId: hotel.id,
            jobType: MAINTENANCE_ESCALATION_SCAN_JOB_TYPE,
            enabled,
            runAtHour,
            runAtMinute,
            triggeredAt: reference,
          });
          hotelsProcessed += 1;
          continue;
        }

        const requestRows = requests.map((request) => ({
          requestId: request.id,
          requestNo: request.requestNo,
          title: request.title,
          priority: request.priority,
          status: request.status,
          facilityName: request.facility?.name ?? null,
          roomNumber: request.room?.number ?? null,
          assignedToName:
            `${request.assignedToStaff?.firstName ?? ''} ${request.assignedToStaff?.lastName ?? ''}`.trim() ||
            null,
          hoursOpen: Math.max(
            1,
            Math.floor((reference.getTime() - request.createdAt.getTime()) / (60 * 60 * 1000)),
          ),
        }));

        await this.notifications.dispatch({
          hotelId: hotel.id,
          event: 'maintenanceEscalation',
          email: this.buildMaintenanceEscalationEmail({
            hotelName: hotel.name,
            alertDate,
            requests: requestRows,
          }),
          inApp: this.buildMaintenanceEscalationInAppNotification({
            alertDate,
            requests: requestRows,
          }),
        });

        await this.recordCronJobSuccess({
          hotelId: hotel.id,
          jobType: MAINTENANCE_ESCALATION_SCAN_JOB_TYPE,
          enabled,
          runAtHour,
          runAtMinute,
          triggeredAt: reference,
        });

        requestsFlagged += requestRows.length;
        hotelsProcessed += 1;
      } catch (error) {
        hotelsFailed += 1;
        this.logger.error(
          `Maintenance escalation scan failed for hotel ${hotel.id}: ${String(error)}`,
        );

        await this.recordCronJobFailure({
          hotelId: hotel.id,
          jobType: MAINTENANCE_ESCALATION_SCAN_JOB_TYPE,
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
      requestsFlagged,
    };
  }

  // ============ END MAINTENANCE =========== //

  // ============ COMPLAINTS =========== //

  async listComplaints(hotelId: string, filters: any) {
    const page = Number(filters.page ?? 1);
    const limit = Number(filters.limit ?? 30);
    const skip = (page - 1) * limit;

    const where: any = { hotelId };
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { complaintNo: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    if (filters.facilityId) where.facilityId = filters.facilityId;
    if (filters.status) where.status = filters.status;
    if (filters.reporterType) where.reporterType = filters.reporterType;
    if (filters.reporterStaffId) where.reporterStaffId = filters.reporterStaffId;
    if (filters.reporterGuestId) where.reporterGuestId = filters.reporterGuestId;
    if (filters.channel) where.channel = filters.channel;
    if (filters.priority) where.priority = filters.priority;
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.createdAt.lte = new Date(filters.dateTo);
    }

    const [complaints, total] = await Promise.all([
      this.prisma.facilityComplaint.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          facility: { select: { id: true, name: true } },
          reporterStaff: { select: { id: true, firstName: true, lastName: true } },
          reporterGuest: { select: { id: true, firstName: true, lastName: true } },
          maintenanceRequest: { select: { id: true, requestNo: true } },
        },
      }),
      this.prisma.facilityComplaint.count({ where }),
    ]);

    return {
      complaints: complaints.map((c) => {
        const staffName = c.reporterStaff
          ? `${c.reporterStaff.firstName} ${c.reporterStaff.lastName}`.trim()
          : null;
        const guestName = c.reporterGuest
          ? `${c.reporterGuest.firstName} ${c.reporterGuest.lastName}`.trim()
          : null;
        return {
          id: c.id,
          complaintNo: c.complaintNo,
          title: c.title,
          description: c.description,
          category: c.category,
          priority: c.priority,
          status: c.status,
          channel: c.channel,
          reporterType: c.reporterType,
          reporterStaffId: c.reporterStaffId,
          reporterGuestId: c.reporterGuestId,
          facilityId: c.facility?.id ?? null,
          reporter: staffName || guestName || null,
          facility: c.facility,
          maintenanceRequest: c.maintenanceRequest ?? null,
          createdAt: c.createdAt,
          resolvedAt: c.resolvedAt,
          updatedAt: c.updatedAt,
        };
      }),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      meta: {
        total,
        current_page: page,
        last_page: Math.ceil(total / limit),
        per_page: limit,
        from: skip + 1,
        to: Math.min(skip + limit, total),
      },
    };
  }

  async createComplaint(hotelId: string, staffId: string, dto: any) {
    const data = this.removeEmptyRelationIds(dto, [
      'reporterStaffId',
      'reporterGuestId',
      'facilityId',
      'roomId',
      'maintenanceRequestId',
    ]);
    const reporterStaffId =
      data.reporterStaffId ?? (data.reporterType === 'STAFF' ? staffId : undefined);
    await Promise.all([
      this.assertFacilityBelongsToHotel(hotelId, data.facilityId),
      this.assertRoomBelongsToHotel(hotelId, data.roomId),
      this.assertStaffBelongsToHotel(hotelId, reporterStaffId),
      this.assertGuestBelongsToHotel(hotelId, data.reporterGuestId),
      this.assertMaintenanceBelongsToHotel(hotelId, data.maintenanceRequestId),
    ]);

    return this.prisma.facilityComplaint.create({
      data: {
        ...data,
        hotelId,
        complaintNo: data.complaintNo ?? this.generateCode('CP'),
        status: data.status ?? 'NEW',
        reporterStaffId,
      },
    });
  }

  async updateComplaint(hotelId: string, id: string, dto: any) {
    const data = this.removeEmptyRelationIds(dto, [
      'reporterStaffId',
      'reporterGuestId',
      'facilityId',
      'roomId',
      'maintenanceRequestId',
    ]);
    const complaint = await this.prisma.facilityComplaint.findFirst({
      where: { id, hotelId },
    });
    if (!complaint) throw new NotFoundException('Complaint not found');
    await Promise.all([
      this.assertFacilityBelongsToHotel(hotelId, data.facilityId),
      this.assertRoomBelongsToHotel(hotelId, data.roomId),
      this.assertStaffBelongsToHotel(hotelId, data.reporterStaffId),
      this.assertGuestBelongsToHotel(hotelId, data.reporterGuestId),
      this.assertMaintenanceBelongsToHotel(hotelId, data.maintenanceRequestId),
    ]);

    return this.prisma.facilityComplaint.update({
      where: { id: complaint.id },
      data,
    });
  }

  // ============ END COMPLAINTS =========== //

  // ============ INSPECTIONS =========== //

  async listInspections(hotelId: string, filters: any) {
    const page = Number(filters.page ?? 1);
    const limit = Number(filters.limit ?? 30);
    const skip = (page - 1) * limit;

    const where: any = { hotelId };
    if (filters.search) {
      where.OR = [
        { inspectionNo: { contains: filters.search, mode: 'insensitive' } },
        { inspectionType: { contains: filters.search, mode: 'insensitive' } },
        { inspectorName: { contains: filters.search, mode: 'insensitive' } },
        { inspectorOrganization: { contains: filters.search, mode: 'insensitive' } },
        { area: { contains: filters.search, mode: 'insensitive' } },
        { findings: { contains: filters.search, mode: 'insensitive' } },
        { facility: { name: { contains: filters.search, mode: 'insensitive' } } },
        { scheduledByStaff: { firstName: { contains: filters.search, mode: 'insensitive' } } },
        { scheduledByStaff: { lastName: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }
    if (filters.facilityId) where.facilityId = filters.facilityId;
    if (filters.status) where.status = filters.status;
    if (filters.inspectionType) where.inspectionType = filters.inspectionType;
    if (filters.dateFrom || filters.dateTo) {
      where.scheduledAt = {};
      if (filters.dateFrom) where.scheduledAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.scheduledAt.lte = new Date(filters.dateTo);
    }

    const [inspections, total] = await Promise.all([
      this.prisma.facilityInspection.findMany({
        where,
        skip,
        take: limit,
        orderBy: { scheduledAt: 'desc' },
        include: {
          facility: true,
          scheduledByStaff: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.facilityInspection.count({ where }),
    ]);

    return {
      inspections,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      meta: {
        total,
        current_page: page,
        last_page: Math.ceil(total / limit),
        per_page: limit,
        from: skip + 1,
        to: Math.min(skip + limit, total),
      },
    };
  }

  async createInspection(hotelId: string, staffId: string, dto: any) {
    const data = this.removeEmptyRelationIds(dto, ['scheduledBy', 'facilityId']);
    const scheduledBy = data.scheduledBy ?? staffId;
    await Promise.all([
      this.assertFacilityBelongsToHotel(hotelId, data.facilityId),
      this.assertStaffBelongsToHotel(hotelId, scheduledBy),
    ]);

    return this.prisma.facilityInspection.create({
      data: {
        ...data,
        hotelId,
        inspectionNo: data.inspectionNo ?? this.generateCode('INSP'),
        scheduledBy,
        status: data.status ?? 'SCHEDULED',
      },
    });
  }

  async updateInspection(hotelId: string, id: string, dto: any) {
    const data = this.removeEmptyRelationIds(dto, ['scheduledBy', 'facilityId']);
    const insp = await this.prisma.facilityInspection.findFirst({
      where: { id, hotelId },
    });
    if (!insp) throw new NotFoundException('Inspection not found');
    await Promise.all([
      this.assertFacilityBelongsToHotel(hotelId, data.facilityId),
      this.assertStaffBelongsToHotel(hotelId, data.scheduledBy),
    ]);

    return this.prisma.facilityInspection.update({
      where: { id: insp.id },
      data,
    });
  }

  // ============ END INSPECTIONS =========== //

  // ============ TYPES =========== //

  async listTypes(hotelId: string, filters: FilterDto) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 30;
    const skip = (page - 1) * limit;

    const where: any = { hotelId };

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [types, total] = await Promise.all([
      this.prisma.facilityType.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          _count: { select: { facilities: true } },
        },
      }),
      this.prisma.facilityType.count({ where }),
    ]);

    return {
      types: types.map((t) => ({
        ...t,
        facilitiesCount: t._count.facilities,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      meta: {
        total,
        current_page: page,
        last_page: Math.ceil(total / limit),
        per_page: limit,
        from: skip + 1,
        to: Math.min(skip + limit, total),
      },
    };
  }

  async createType(hotelId: string, dto: any) {
    return this.prisma.facilityType.create({
      data: {
        ...dto,
        hotelId,
      },
    });
  }

  async updateType(hotelId: string, id: string, dto: any) {
    const type = await this.prisma.facilityType.findFirst({ where: { id, hotelId } });
    if (!type) throw new NotFoundException('Facility type not found');
    return this.prisma.facilityType.update({ where: { id: type.id }, data: dto });
  }

  async deleteType(hotelId: string, id: string) {
    const type = await this.prisma.facilityType.findFirst({ where: { id, hotelId } });
    if (!type) throw new NotFoundException('Facility type not found');
    const facilities = await this.prisma.facility.count({ where: { hotelId, typeId: id } });
    if (facilities > 0) {
      throw new BadRequestException('Cannot delete a type that is assigned to facilities.');
    }
    await this.prisma.facilityType.delete({ where: { id: type.id } });
    return { success: true };
  }

  // ============ END TYPES =========== //

  // ============ LOCATIONS =========== //

  async listLocations(hotelId: string, filters: FilterDto) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 30;
    const skip = (page - 1) * limit;

    const where: any = { hotelId };

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [locations, total] = await Promise.all([
      this.prisma.facilityLocation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          _count: { select: { facilities: true } },
        },
      }),
      this.prisma.facilityLocation.count({ where }),
    ]);

    return {
      locations: locations.map((l) => ({
        ...l,
        facilitiesCount: l._count.facilities,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      meta: {
        total,
        current_page: page,
        last_page: Math.ceil(total / limit),
        per_page: limit,
        from: skip + 1,
        to: Math.min(skip + limit, total),
      },
    };
  }

  async createLocation(hotelId: string, dto: any) {
    return this.prisma.facilityLocation.create({
      data: {
        ...dto,
        hotelId,
      },
    });
  }

  async updateLocation(hotelId: string, id: string, dto: any) {
    const location = await this.prisma.facilityLocation.findFirst({ where: { id, hotelId } });
    if (!location) throw new NotFoundException('Facility location not found');
    return this.prisma.facilityLocation.update({ where: { id: location.id }, data: dto });
  }

  async deleteLocation(hotelId: string, id: string) {
    const location = await this.prisma.facilityLocation.findFirst({ where: { id, hotelId } });
    if (!location) throw new NotFoundException('Facility location not found');
    const facilities = await this.prisma.facility.count({ where: { hotelId, locationId: id } });
    if (facilities > 0) {
      throw new BadRequestException('Cannot delete a location that is assigned to facilities.');
    }
    await this.prisma.facilityLocation.delete({ where: { id: location.id } });
    return { success: true };
  }

  // ============ DEPARTMENTS =========== //

  async listDepartments(hotelId: string, filters: FilterDto) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 30;
    const skip = (page - 1) * limit;

    const where: any = { hotelId };

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [departments, total] = await Promise.all([
      this.prisma.facilityDepartment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          head: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { facilities: true } },
        },
      }),
      this.prisma.facilityDepartment.count({ where }),
    ]);

    return {
      departments: departments.map((d) => ({
        ...d,
        head: d.head
          ? { id: d.head.id, name: `${d.head.firstName} ${d.head.lastName}`.trim() }
          : null,
        facilitiesCount: d._count.facilities,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      meta: {
        total,
        current_page: page,
        last_page: Math.ceil(total / limit),
        per_page: limit,
        from: skip + 1,
        to: Math.min(skip + limit, total),
      },
    };
  }

  async createDepartment(hotelId: string, dto: any) {
    const data = this.removeEmptyRelationIds(dto, ['headId']);
    await this.assertStaffBelongsToHotel(hotelId, data.headId);
    return this.prisma.facilityDepartment.create({
      data: {
        ...data,
        hotelId,
      },
    });
  }

  async updateDepartment(hotelId: string, id: string, dto: any) {
    const data = this.removeEmptyRelationIds(dto, ['headId']);
    const department = await this.prisma.facilityDepartment.findFirst({ where: { id, hotelId } });
    if (!department) throw new NotFoundException('Facility department not found');
    await this.assertStaffBelongsToHotel(hotelId, data.headId);
    return this.prisma.facilityDepartment.update({ where: { id: department.id }, data });
  }

  async deleteDepartment(hotelId: string, id: string) {
    const department = await this.prisma.facilityDepartment.findFirst({ where: { id, hotelId } });
    if (!department) throw new NotFoundException('Facility department not found');
    const facilities = await this.prisma.facility.count({ where: { hotelId, departmentId: id } });
    if (facilities > 0) {
      throw new BadRequestException('Cannot delete a department that is assigned to facilities.');
    }
    await this.prisma.facilityDepartment.delete({ where: { id: department.id } });
    return { success: true };
  }
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
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    date: `${map.year}-${map.month}-${map.day}`,
    hour: Number(map.hour),
    minute: Number(map.minute),
  };
}
