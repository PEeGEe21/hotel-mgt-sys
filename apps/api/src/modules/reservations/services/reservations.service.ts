import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { ReservationStatus, PaymentStatus, RoomStatus, BookingType, HotelCronJobType, Role, TaskPriority, TaskStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { genReservationNo, nightsBetween } from 'src/common/utils/reservation.utils';
import { buildCursor, buildCursorWhere, parseCursor } from 'src/common/utils/cursor.utils';
import { ReservationFilterDto } from '../dtos/reservation-filter.dto';
import { AvailabilityDto } from '../dtos/availability.dto';
import { CreateReservationDto } from '../dtos/create-reservation.dto';
import { UpdateReservationDto } from '../dtos/update-reservation.dto';
import { RecordPaymentDto } from '../dtos/record-payment.dto';
import * as path from 'path';
import { readFile } from 'fs/promises';
import * as handlebars from 'handlebars';
import { compileTemplate } from 'src/common/utils/compile-template.utils';
import { LedgerService } from '../../ledger/ledger.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { EmailService } from '../../../common/email/email.service';

// ─── Service ──────────────────────────────────────────────────────────────────

const HOUSEKEEPING_FOLLOW_UP_SCAN_JOB_TYPE =
  'HOUSEKEEPING_FOLLOW_UP_SCAN' as HotelCronJobType;
const UPCOMING_ARRIVAL_SCAN_JOB_TYPE =
  'UPCOMING_ARRIVAL_SCAN' as HotelCronJobType;
const OVERDUE_PAYMENT_SCAN_JOB_TYPE =
  'OVERDUE_PAYMENT_SCAN' as HotelCronJobType;
const NO_SHOW_FOLLOW_UP_SCAN_JOB_TYPE =
  'NO_SHOW_FOLLOW_UP_SCAN' as HotelCronJobType;
const DAILY_DIGEST_SCAN_JOB_TYPE = 'DAILY_DIGEST_SCAN' as HotelCronJobType;

const RESERVATION_INCLUDE = {
  guest: true,
  room: { include: { floor: { select: { name: true } } } },
  company: { select: { id: true, name: true, email: true, contactName: true } },
  groupBooking: { select: { id: true, groupNo: true, name: true } },
  guests: { include: { guest: true }, orderBy: { addedAt: 'asc' as const } },
  folioItems: { orderBy: { createdAt: 'asc' as const } },
  invoices: { include: { payments: true } },
};

@Injectable()
export class ReservationsService {
  private readonly logger = new Logger(ReservationsService.name);

  constructor(
    private prisma: PrismaService,
    private ledger: LedgerService,
    private notifications: NotificationsService,
    private email: EmailService,
  ) {}

  private applyDefaultCheckoutTime(value: Date, hour: number, minute: number) {
    const next = new Date(value);
    next.setHours(hour, minute, 0, 0);
    return next;
  }

  private async getManagementRecipientIds(hotelId: string) {
    const users = await this.prisma.user.findMany({
      where: {
        isActive: true,
        role: { in: [Role.ADMIN, Role.MANAGER] },
        staff: { hotelId },
      },
      select: { id: true },
    });

    return users.map((user) => user.id);
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

  private buildEmailMetricCard(args: { label: string; value: string; tone?: 'default' | 'success' }) {
    const toneStyles =
      args.tone === 'success'
        ? 'background: #ecfdf5; border: 1px solid #a7f3d0;'
        : 'background: #f8fafc; border: 1px solid #e2e8f0;';

    return `
      <td style="width: 50%; padding: 0 6px 12px 0; vertical-align: top;">
        <div style="${toneStyles} border-radius: 14px; padding: 14px 16px;">
          <div style="margin-bottom: 6px; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: #64748b;">
            ${escapeHtml(args.label)}
          </div>
          <div style="font-size: 20px; font-weight: 700; color: #0f172a;">${escapeHtml(args.value)}</div>
        </div>
      </td>
    `;
  }

  private buildEmailDetailRows(rows: Array<{ label: string; value: string | null | undefined }>) {
    return rows
      .filter((row) => row.value)
      .map(
        (row) => `
          <tr>
            <td style="padding: 10px 16px 10px 0; color: #64748b; font-weight: 600; white-space: nowrap;">${escapeHtml(row.label)}</td>
            <td style="padding: 10px 0; color: #0f172a;">${escapeHtml(row.value ?? '')}</td>
          </tr>
        `,
      )
      .join('');
  }

  private buildNewReservationNotificationEmail(args: {
    hotelName: string;
    reservationNo: string;
    guestName: string;
    roomNumber: string;
    checkIn: Date;
    checkOut: Date;
    totalAmount: number;
  }) {
    const hotelName = escapeHtml(args.hotelName);
    const reservationNo = escapeHtml(args.reservationNo);
    const guestName = escapeHtml(args.guestName);
    const roomNumber = escapeHtml(args.roomNumber);
    const checkIn = fmtDate(args.checkIn);
    const checkOut = fmtDate(args.checkOut);
    const totalAmount = fmtMoney(args.totalAmount);

    return {
      subject: `New reservation ${reservationNo} for ${guestName}`,
      text:
        `${args.hotelName}: a new reservation has been created.\n` +
        `Reservation: ${args.reservationNo}\n` +
        `Guest: ${args.guestName}\n` +
        `Room: ${args.roomNumber}\n` +
        `Check-in: ${checkIn}\n` +
        `Check-out: ${checkOut}\n` +
        `Total: ${totalAmount}`,
      html: `
        <div>
          <p style="margin: 0 0 12px;">A new reservation has just been created for <strong>${hotelName}</strong>.</p>
          <p style="margin: 0 0 18px; color: #475569;">
            Review the stay details below and confirm any operational follow-up needed before arrival.
          </p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse; margin: 0 0 8px;">
            <tr>
              ${this.buildEmailMetricCard({ label: 'Reservation', value: reservationNo })}
              ${this.buildEmailMetricCard({ label: 'Stay Total', value: totalAmount })}
            </tr>
            <tr>
              ${this.buildEmailMetricCard({ label: 'Check-in', value: checkIn })}
              ${this.buildEmailMetricCard({ label: 'Check-out', value: checkOut })}
            </tr>
          </table>
          <div style="margin-top: 16px; overflow: hidden; border: 1px solid #e2e8f0; border-radius: 16px;">
            <div style="padding: 14px 16px; background: #f8fafc; font-weight: 700; color: #0f172a;">Stay details</div>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
              ${this.buildEmailDetailRows([
                { label: 'Guest', value: guestName },
                { label: 'Room', value: roomNumber },
                { label: 'Hotel', value: hotelName },
              ])}
            </table>
          </div>
        </div>
      `,
    };
  }

  private buildNewReservationInAppNotification(args: {
    reservationId: string;
    reservationNo: string;
    guestName: string;
    roomNumber: string;
    checkIn: Date;
    checkOut: Date;
  }) {
    return {
      title: 'New reservation created',
      message:
        `${args.guestName} was booked into room ${args.roomNumber} ` +
        `from ${fmtDate(args.checkIn)} to ${fmtDate(args.checkOut)}.`,
      metadata: {
        reservationId: args.reservationId,
        reservationNo: args.reservationNo,
        guestName: args.guestName,
        roomNumber: args.roomNumber,
        checkIn: args.checkIn.toISOString(),
        checkOut: args.checkOut.toISOString(),
        href: `/reservations/${args.reservationId}`,
      },
    };
  }

  private buildPaymentReceivedNotificationEmail(args: {
    hotelName: string;
    reservationNo: string;
    guestName: string;
    roomNumber: string;
    amount: number;
    method: string;
    reference?: string | null;
    paidAt: Date;
    paidAmount: number;
    balance: number;
  }) {
    const hotelName = escapeHtml(args.hotelName);
    const reservationNo = escapeHtml(args.reservationNo);
    const guestName = escapeHtml(args.guestName);
    const roomNumber = escapeHtml(args.roomNumber);
    const method = escapeHtml(args.method);
    const reference = args.reference ? escapeHtml(args.reference) : null;
    const amount = fmtMoney(args.amount);
    const paidAmount = fmtMoney(args.paidAmount);
    const balance = fmtMoney(args.balance);
    const paidAt = fmtDate(args.paidAt);

    return {
      subject: `Payment received for reservation ${reservationNo}`,
      text:
        `${args.hotelName}: a payment has been recorded.\n` +
        `Reservation: ${args.reservationNo}\n` +
        `Guest: ${args.guestName}\n` +
        `Room: ${args.roomNumber}\n` +
        `Amount: ${amount}\n` +
        `Method: ${args.method}\n` +
        `Paid at: ${paidAt}\n` +
        `Total paid: ${paidAmount}\n` +
        `Balance: ${balance}` +
        (args.reference ? `\nReference: ${args.reference}` : ''),
      html: `
        <div>
          <p style="margin: 0 0 12px;">A payment has been posted for <strong>${hotelName}</strong>.</p>
          <p style="margin: 0 0 18px; color: #475569;">
            The folio has been updated. Review the payment summary and outstanding balance below.
          </p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse; margin: 0 0 8px;">
            <tr>
              ${this.buildEmailMetricCard({ label: 'Payment Received', value: amount, tone: 'success' })}
              ${this.buildEmailMetricCard({ label: 'Outstanding Balance', value: balance })}
            </tr>
            <tr>
              ${this.buildEmailMetricCard({ label: 'Reservation', value: reservationNo })}
              ${this.buildEmailMetricCard({ label: 'Total Paid', value: paidAmount })}
            </tr>
          </table>
          <div style="margin-top: 16px; overflow: hidden; border: 1px solid #e2e8f0; border-radius: 16px;">
            <div style="padding: 14px 16px; background: #f8fafc; font-weight: 700; color: #0f172a;">Payment details</div>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
              ${this.buildEmailDetailRows([
                { label: 'Guest', value: guestName },
                { label: 'Room', value: roomNumber },
                { label: 'Method', value: method },
                { label: 'Paid at', value: paidAt },
                { label: 'Reference', value: reference },
              ])}
            </table>
          </div>
          ${
            args.balance > 0
              ? `<p style="margin: 16px 0 0; padding: 12px 14px; border-radius: 14px; background: #fff7ed; border: 1px solid #fed7aa; color: #9a3412;">
                  Remaining balance is <strong>${balance}</strong>. Keep the folio under review until the stay is fully settled.
                </p>`
              : `<p style="margin: 16px 0 0; padding: 12px 14px; border-radius: 14px; background: #ecfdf5; border: 1px solid #a7f3d0; color: #166534;">
                  This reservation is now fully paid.
                </p>`
          }
        </div>
      `,
    };
  }

  private buildPaymentReceivedInAppNotification(args: {
    reservationId: string;
    reservationNo: string;
    guestName: string;
    amount: number;
    method: string;
    balance: number;
  }) {
    return {
      title: 'Payment posted',
      message:
        `${fmtMoney(args.amount)} was posted to reservation ${args.reservationNo} for ${args.guestName} via ${args.method}. ` +
        `Outstanding balance: ${fmtMoney(args.balance)}.`,
      metadata: {
        reservationId: args.reservationId,
        reservationNo: args.reservationNo,
        guestName: args.guestName,
        amount: args.amount,
        method: args.method,
        balance: args.balance,
        severity: args.balance > 0 ? 'info' : 'success',
        summary:
          args.balance > 0
            ? `Balance outstanding after payment: ${fmtMoney(args.balance)}`
            : 'Reservation is now fully paid',
        href: `/reservations/${args.reservationId}`,
      },
    };
  }

  private buildOverduePaymentSummaryEmail(args: {
    hotelName: string;
    alertDate: string;
    overdueCount: number;
    totalOutstanding: number;
    reservations: Array<{
      reservationNo: string;
      guestName: string;
      roomNumber: string;
      localCheckoutDate: string;
      paidAmount: number;
      totalAmount: number;
      balance: number;
      daysOverdue: number;
    }>;
  }) {
    const rows = args.reservations
      .map(
        (reservation) => `
          <tr>
            <td style="padding: 10px 16px 10px 0; color: #0f172a;">${escapeHtml(reservation.reservationNo)}</td>
            <td style="padding: 10px 16px 10px 0; color: #0f172a;">${escapeHtml(reservation.guestName)}</td>
            <td style="padding: 10px 16px 10px 0; color: #0f172a;">${escapeHtml(reservation.roomNumber)}</td>
            <td style="padding: 10px 16px 10px 0; color: #0f172a;">${escapeHtml(reservation.localCheckoutDate)}</td>
            <td style="padding: 10px 16px 10px 0; color: #0f172a;">${fmtMoney(reservation.balance)}</td>
            <td style="padding: 10px 0; color: #0f172a;">${reservation.daysOverdue}d</td>
          </tr>
        `,
      )
      .join('');

    return {
      subject: `Overdue payment summary for ${args.alertDate}`,
      text:
        `${args.hotelName}: ${args.overdueCount} reservation${args.overdueCount === 1 ? '' : 's'} have overdue balances as of ${args.alertDate}.\n` +
        `Total outstanding: ${fmtMoney(args.totalOutstanding)}\n` +
        args.reservations
          .map(
            (reservation) =>
              `- ${reservation.reservationNo}: ${reservation.guestName} in room ${reservation.roomNumber} owes ${fmtMoney(reservation.balance)} (${reservation.daysOverdue} day${reservation.daysOverdue === 1 ? '' : 's'} overdue)`,
          )
          .join('\n'),
      html: `
        <div>
          <p style="margin: 0 0 12px;">Overdue payment follow-up for <strong>${escapeHtml(args.hotelName)}</strong> on <strong>${escapeHtml(args.alertDate)}</strong>.</p>
          <p style="margin: 0 0 18px; color: #475569;">
            These reservations have passed checkout with an unpaid balance still remaining.
          </p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse; margin: 0 0 8px;">
            <tr>
              ${this.buildEmailMetricCard({ label: 'Overdue Folios', value: String(args.overdueCount) })}
              ${this.buildEmailMetricCard({ label: 'Total Outstanding', value: fmtMoney(args.totalOutstanding) })}
            </tr>
          </table>
          <div style="margin-top: 16px; overflow: hidden; border: 1px solid #e2e8f0; border-radius: 16px;">
            <div style="padding: 14px 16px; background: #f8fafc; font-weight: 700; color: #0f172a;">Reservations needing collection</div>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
              <thead>
                <tr>
                  <th align="left" style="padding: 12px 16px 10px 0; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em;">Reservation</th>
                  <th align="left" style="padding: 12px 16px 10px 0; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em;">Guest</th>
                  <th align="left" style="padding: 12px 16px 10px 0; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em;">Room</th>
                  <th align="left" style="padding: 12px 16px 10px 0; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em;">Checkout</th>
                  <th align="left" style="padding: 12px 16px 10px 0; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em;">Balance</th>
                  <th align="left" style="padding: 12px 0 10px; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em;">Age</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </div>
      `,
    };
  }

  private buildOverduePaymentInAppNotification(args: {
    alertDate: string;
    overdueCount: number;
    totalOutstanding: number;
    reservations: Array<{
      reservationId: string;
      reservationNo: string;
      guestName: string;
      roomNumber: string;
      localCheckoutDate: string;
      balance: number;
      daysOverdue: number;
    }>;
  }) {
    return {
      title: args.overdueCount === 1 ? 'Overdue folio needs follow-up' : 'Overdue folios need follow-up',
      message:
        `${args.overdueCount} reservation${args.overdueCount === 1 ? '' : 's'} still have outstanding balances after checkout. Total outstanding: ${fmtMoney(args.totalOutstanding)}.`,
      metadata: {
        alertDate: args.alertDate,
        overdueCount: args.overdueCount,
        totalOutstanding: args.totalOutstanding,
        severity: args.totalOutstanding > 0 ? 'warning' : 'info',
        summary: `${fmtMoney(args.totalOutstanding)} outstanding across ${args.overdueCount} overdue folio${args.overdueCount === 1 ? '' : 's'}`,
        href: '/reservations',
        reservations: args.reservations.map((reservation) => ({
          reservationId: reservation.reservationId,
          reservationNo: reservation.reservationNo,
          guestName: reservation.guestName,
          roomNumber: reservation.roomNumber,
          localCheckoutDate: reservation.localCheckoutDate,
          balance: reservation.balance,
          daysOverdue: reservation.daysOverdue,
        })),
      },
    };
  }

  private buildCheckInNotificationEmail(args: {
    hotelName: string;
    reservationNo: string;
    guestName: string;
    roomNumber: string;
    checkedInAt: Date;
  }) {
    const hotelName = escapeHtml(args.hotelName);
    const reservationNo = escapeHtml(args.reservationNo);
    const guestName = escapeHtml(args.guestName);
    const roomNumber = escapeHtml(args.roomNumber);
    const checkedInAt = fmtDateTime(args.checkedInAt);

    return {
      subject: `Guest checked in: ${reservationNo}`,
      text:
        `${args.hotelName}: a guest has checked in.\n` +
        `Reservation: ${args.reservationNo}\n` +
        `Guest: ${args.guestName}\n` +
        `Room: ${args.roomNumber}\n` +
        `Checked in at: ${checkedInAt}`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.6;">
          <p style="margin: 0 0 12px;">A guest has checked in at <strong>${hotelName}</strong>.</p>
          <table style="border-collapse: collapse;">
            <tr><td style="padding: 4px 12px 4px 0;"><strong>Reservation</strong></td><td style="padding: 4px 0;">${reservationNo}</td></tr>
            <tr><td style="padding: 4px 12px 4px 0;"><strong>Guest</strong></td><td style="padding: 4px 0;">${guestName}</td></tr>
            <tr><td style="padding: 4px 12px 4px 0;"><strong>Room</strong></td><td style="padding: 4px 0;">${roomNumber}</td></tr>
            <tr><td style="padding: 4px 12px 4px 0;"><strong>Checked in at</strong></td><td style="padding: 4px 0;">${checkedInAt}</td></tr>
          </table>
        </div>
      `,
    };
  }

  private buildCheckInInAppNotification(args: {
    reservationId: string;
    reservationNo: string;
    guestName: string;
    roomNumber: string;
    checkedInAt: Date;
  }) {
    return {
      title: 'Guest checked in',
      message: `${args.guestName} checked into room ${args.roomNumber} on reservation ${args.reservationNo}.`,
      metadata: {
        reservationId: args.reservationId,
        reservationNo: args.reservationNo,
        guestName: args.guestName,
        roomNumber: args.roomNumber,
        checkedInAt: args.checkedInAt.toISOString(),
        href: `/reservations/${args.reservationId}`,
      },
    };
  }

  private buildCheckOutNotificationEmail(args: {
    hotelName: string;
    reservationNo: string;
    guestName: string;
    roomNumber: string;
    checkedOutAt: Date;
  }) {
    const hotelName = escapeHtml(args.hotelName);
    const reservationNo = escapeHtml(args.reservationNo);
    const guestName = escapeHtml(args.guestName);
    const roomNumber = escapeHtml(args.roomNumber);
    const checkedOutAt = fmtDateTime(args.checkedOutAt);

    return {
      subject: `Guest checked out: ${reservationNo}`,
      text:
        `${args.hotelName}: a guest has checked out.\n` +
        `Reservation: ${args.reservationNo}\n` +
        `Guest: ${args.guestName}\n` +
        `Room: ${args.roomNumber}\n` +
        `Checked out at: ${checkedOutAt}`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.6;">
          <p style="margin: 0 0 12px;">A guest has checked out from <strong>${hotelName}</strong>.</p>
          <table style="border-collapse: collapse;">
            <tr><td style="padding: 4px 12px 4px 0;"><strong>Reservation</strong></td><td style="padding: 4px 0;">${reservationNo}</td></tr>
            <tr><td style="padding: 4px 12px 4px 0;"><strong>Guest</strong></td><td style="padding: 4px 0;">${guestName}</td></tr>
            <tr><td style="padding: 4px 12px 4px 0;"><strong>Room</strong></td><td style="padding: 4px 0;">${roomNumber}</td></tr>
            <tr><td style="padding: 4px 12px 4px 0;"><strong>Checked out at</strong></td><td style="padding: 4px 0;">${checkedOutAt}</td></tr>
          </table>
        </div>
      `,
    };
  }

  private buildUpcomingArrivalSummaryEmail(args: {
    hotelName: string;
    alertDate: string;
    arrivalDate: string;
    arrivalCount: number;
    reservations: Array<{
      reservationNo: string;
      guestName: string;
      roomNumber: string;
      checkIn: Date;
      totalAmount: number;
      adults: number;
      children: number;
    }>;
  }) {
    const rows = args.reservations
      .map(
        (reservation) => `
          <tr>
            <td style="padding: 10px 16px 10px 0; color: #0f172a;">${escapeHtml(reservation.reservationNo)}</td>
            <td style="padding: 10px 16px 10px 0; color: #0f172a;">${escapeHtml(reservation.guestName)}</td>
            <td style="padding: 10px 16px 10px 0; color: #0f172a;">${escapeHtml(reservation.roomNumber)}</td>
            <td style="padding: 10px 16px 10px 0; color: #0f172a;">${fmtDateTime(reservation.checkIn)}</td>
            <td style="padding: 10px 16px 10px 0; color: #0f172a;">${reservation.adults + reservation.children}</td>
            <td style="padding: 10px 0; color: #0f172a;">${fmtMoney(reservation.totalAmount)}</td>
          </tr>
        `,
      )
      .join('');

    return {
      subject: `Upcoming arrivals for ${args.arrivalDate}`,
      text:
        `${args.hotelName}: ${args.arrivalCount} reservation${args.arrivalCount === 1 ? '' : 's'} are due to arrive on ${args.arrivalDate}.\n` +
        args.reservations
          .map(
            (reservation) =>
              `- ${reservation.reservationNo}: ${reservation.guestName} to room ${reservation.roomNumber} at ${fmtDateTime(reservation.checkIn)}`,
          )
          .join('\n'),
      html: `
        <div>
          <p style="margin: 0 0 12px;">Arrival prep summary for <strong>${escapeHtml(args.hotelName)}</strong>.</p>
          <p style="margin: 0 0 18px; color: #475569;">
            ${args.arrivalCount} reservation${args.arrivalCount === 1 ? '' : 's'} are scheduled to arrive on <strong>${escapeHtml(args.arrivalDate)}</strong>. Use this list to prepare rooms, welcome flow, and staffing coverage.
          </p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse; margin: 0 0 8px;">
            <tr>
              ${this.buildEmailMetricCard({ label: 'Arrivals', value: String(args.arrivalCount) })}
              ${this.buildEmailMetricCard({ label: 'Arrival Date', value: args.arrivalDate })}
            </tr>
          </table>
          <div style="margin-top: 16px; overflow: hidden; border: 1px solid #e2e8f0; border-radius: 16px;">
            <div style="padding: 14px 16px; background: #f8fafc; font-weight: 700; color: #0f172a;">Reservations arriving next</div>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
              <thead>
                <tr>
                  <th align="left" style="padding: 12px 16px 10px 0; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em;">Reservation</th>
                  <th align="left" style="padding: 12px 16px 10px 0; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em;">Guest</th>
                  <th align="left" style="padding: 12px 16px 10px 0; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em;">Room</th>
                  <th align="left" style="padding: 12px 16px 10px 0; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em;">Arrival</th>
                  <th align="left" style="padding: 12px 16px 10px 0; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em;">Guests</th>
                  <th align="left" style="padding: 12px 0 10px; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em;">Value</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </div>
      `,
    };
  }

  private buildUpcomingArrivalInAppNotification(args: {
    alertDate: string;
    arrivalDate: string;
    arrivalCount: number;
    reservations: Array<{
      reservationId: string;
      reservationNo: string;
      guestName: string;
      roomNumber: string;
      checkIn: Date;
    }>;
  }) {
    return {
      title: args.arrivalCount === 1 ? 'Upcoming arrival tomorrow' : 'Upcoming arrivals tomorrow',
      message:
        `${args.arrivalCount} reservation${args.arrivalCount === 1 ? '' : 's'} are due to arrive on ${args.arrivalDate}. Review room readiness and front-desk coverage.`,
      metadata: {
        alertDate: args.alertDate,
        arrivalDate: args.arrivalDate,
        arrivalCount: args.arrivalCount,
        severity: 'info',
        summary: `${args.arrivalCount} upcoming arrival${args.arrivalCount === 1 ? '' : 's'} scheduled for ${args.arrivalDate}`,
        href: '/reservations',
        reservations: args.reservations.map((reservation) => ({
          reservationId: reservation.reservationId,
          reservationNo: reservation.reservationNo,
          guestName: reservation.guestName,
          roomNumber: reservation.roomNumber,
          checkIn: reservation.checkIn.toISOString(),
        })),
      },
    };
  }

  private buildCheckOutInAppNotification(args: {
    reservationId: string;
    reservationNo: string;
    guestName: string;
    roomNumber: string;
    checkedOutAt: Date;
  }) {
    return {
      title: 'Checkout completed',
      message: `${args.guestName} checked out of room ${args.roomNumber} under reservation ${args.reservationNo}. Room status should be reviewed for turnover.`,
      metadata: {
        reservationId: args.reservationId,
        reservationNo: args.reservationNo,
        guestName: args.guestName,
        roomNumber: args.roomNumber,
        checkedOutAt: args.checkedOutAt.toISOString(),
        severity: 'info',
        summary: `Room ${args.roomNumber} is now ready for post-checkout follow-up`,
        href: `/reservations/${args.reservationId}`,
      },
    };
  }

  private buildCheckoutDueSummaryEmail(args: {
    hotelName: string;
    alertDate: string;
    scheduledAt: string;
    dueTodayCount: number;
    overdueCount: number;
    reservations: Array<{
      reservationNo: string;
      guestName: string;
      roomNumber: string;
      checkOut: Date;
    }>;
  }) {
    const rows = args.reservations
      .map(
        (reservation) => `
          <tr>
            <td style="padding: 6px 12px 6px 0;">${escapeHtml(reservation.reservationNo)}</td>
            <td style="padding: 6px 12px 6px 0;">${escapeHtml(reservation.guestName)}</td>
            <td style="padding: 6px 12px 6px 0;">${escapeHtml(reservation.roomNumber)}</td>
            <td style="padding: 6px 0;">${fmtDate(reservation.checkOut)}</td>
          </tr>
        `,
      )
      .join('');

    return {
      subject: `Checkout due summary for ${args.alertDate}`,
      text:
        `${args.hotelName}: ${args.reservations.length} checked-in reservations are due out or overdue as of ${args.scheduledAt}.\n` +
        `Due today: ${args.dueTodayCount}\n` +
        `Overdue: ${args.overdueCount}\n` +
        args.reservations
          .map(
            (reservation) =>
              `- ${reservation.reservationNo}: ${reservation.guestName} in room ${reservation.roomNumber} (checkout ${fmtDate(reservation.checkOut)})`,
          )
          .join('\n'),
      html: `
        <div>
          <p style="margin: 0 0 12px;">
            Checkout review for <strong>${escapeHtml(args.hotelName)}</strong> on
            <strong>${escapeHtml(args.alertDate)}</strong> at <strong>${escapeHtml(args.scheduledAt)}</strong>.
          </p>
          <p style="margin: 0 0 18px; color: #475569;">
            ${args.reservations.length} active stay${args.reservations.length === 1 ? ' is' : 's are'} currently due out or already overdue and may need front-desk follow-up.
          </p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse; margin: 0 0 8px;">
            <tr>
              ${this.buildEmailMetricCard({ label: 'Due Today', value: String(args.dueTodayCount) })}
              ${this.buildEmailMetricCard({ label: 'Overdue', value: String(args.overdueCount), tone: args.overdueCount > 0 ? 'success' : 'default' })}
            </tr>
          </table>
          <div style="margin-top: 16px; overflow: hidden; border: 1px solid #e2e8f0; border-radius: 16px;">
            <div style="padding: 14px 16px; background: #f8fafc; font-weight: 700; color: #0f172a;">Reservations needing action</div>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
              <thead>
                <tr>
                  <th align="left" style="padding: 12px 16px 10px 0; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em;">Reservation</th>
                  <th align="left" style="padding: 12px 16px 10px 0; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em;">Guest</th>
                  <th align="left" style="padding: 12px 16px 10px 0; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em;">Room</th>
                  <th align="left" style="padding: 12px 0 10px; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em;">Checkout</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
          ${
            args.overdueCount > 0
              ? `<p style="margin: 16px 0 0; padding: 12px 14px; border-radius: 14px; background: #fff7ed; border: 1px solid #fed7aa; color: #9a3412;">
                  ${args.overdueCount} reservation${args.overdueCount === 1 ? '' : 's'} are already overdue and should be prioritised.
                </p>`
              : ''
          }
        </div>
      `,
    };
  }

  private buildCheckoutDueInAppNotification(args: {
    alertDate: string;
    dueTodayCount: number;
    overdueCount: number;
    reservations: Array<{
      reservationId: string;
      reservationNo: string;
      guestName: string;
      roomNumber: string;
      checkOut: Date;
    }>;
  }) {
    const severity = args.overdueCount > 0 ? 'warning' : 'info';
    const summary =
      args.overdueCount > 0
        ? `${args.overdueCount} overdue checkout${args.overdueCount === 1 ? '' : 's'} need attention`
        : `${args.dueTodayCount} checkout${args.dueTodayCount === 1 ? '' : 's'} due today`;

    return {
      title: args.overdueCount > 0 ? 'Overdue checkouts need attention' : 'Checkouts due today',
      message:
        `${args.reservations.length} active stay${args.reservations.length === 1 ? ' is' : 's are'} scheduled for follow-up on ${args.alertDate}. ` +
        `Due today: ${args.dueTodayCount}. Overdue: ${args.overdueCount}.`,
      metadata: {
        alertDate: args.alertDate,
        dueTodayCount: args.dueTodayCount,
        overdueCount: args.overdueCount,
        severity,
        summary,
        href:
          args.overdueCount > 0
            ? '/reservations?checkoutTiming=overdue'
            : '/reservations?checkoutTiming=dueToday',
        reservations: args.reservations.map((reservation) => ({
          reservationId: reservation.reservationId,
          reservationNo: reservation.reservationNo,
          guestName: reservation.guestName,
          roomNumber: reservation.roomNumber,
          checkOut: reservation.checkOut.toISOString(),
        })),
      },
    };
  }

  private buildGuestCheckoutReminderEmail(args: {
    hotelName: string;
    guestName: string;
    roomNumber: string;
    reservationNo: string;
    checkOut: Date;
    daysUntilCheckout: number;
  }) {
    const hotelName = escapeHtml(args.hotelName);
    const guestName = escapeHtml(args.guestName);
    const roomNumber = escapeHtml(args.roomNumber);
    const reservationNo = escapeHtml(args.reservationNo);
    const checkOut = fmtDateTime(args.checkOut);
    const leadLabel =
      args.daysUntilCheckout === 0
        ? 'today'
        : args.daysUntilCheckout === 1
          ? 'tomorrow'
          : `in ${args.daysUntilCheckout} days`;
    const intro =
      args.daysUntilCheckout === 0
        ? `This is a reminder from ${args.hotelName} that your checkout for room ${args.roomNumber} is scheduled for ${checkOut}.`
        : `This is a reminder from ${args.hotelName} that your checkout for room ${args.roomNumber} is ${leadLabel} at ${checkOut}.`;

    return {
      subject:
        args.daysUntilCheckout === 1
          ? `Checkout tomorrow for reservation ${args.reservationNo}`
          : args.daysUntilCheckout > 1
            ? `Checkout in ${args.daysUntilCheckout} days for reservation ${args.reservationNo}`
          : `Checkout reminder for reservation ${args.reservationNo}`,
      text:
        `Hello ${args.guestName},\n` +
        `${intro}\n` +
        `Please review your departure timing, settle any outstanding balance, and contact the front desk if you need luggage help or would like to request an extension.`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.6;">
          <p style="margin: 0 0 12px;">Hello <strong>${guestName}</strong>,</p>
          <p style="margin: 0 0 12px;">
            ${escapeHtml(intro)}
          </p>
          <p style="margin: 0 0 12px;">Reservation: <strong>${reservationNo}</strong></p>
          <ul style="margin: 0 0 12px; padding-left: 18px; color: #334155;">
            <li>Review your departure timing and travel arrangements.</li>
            <li>Settle any remaining balance before leaving if needed.</li>
            <li>Contact the front desk if you need luggage help or want to discuss an extension.</li>
          </ul>
          <p style="margin: 0;">
            If you need help or would like to discuss an extension, please contact the front desk.
          </p>
        </div>
      `,
    };
  }

  private buildGuestCheckoutReminderEvent(daysUntilCheckout: number) {
    if (daysUntilCheckout === 0) return 'checkOutDueGuestSameDay';
    if (daysUntilCheckout === 1) return 'checkOutDueGuestDayBefore';
    return `checkOutDueGuest${daysUntilCheckout}Days`;
  }

  private normalizeGuestCheckoutReminderLeadDays(days?: number[] | null) {
    const normalized = [...new Set((days ?? [1, 0]).filter((value) => Number.isInteger(value)))]
      .map((value) => Math.max(0, value))
      .filter((value) => value <= 30)
      .sort((a, b) => b - a);

    return normalized.length ? normalized : [1, 0];
  }

  private async hasSentGuestCheckoutReminder(args: {
    hotelId: string;
    recipient: string;
    event: string;
    subject: string;
  }) {
    const existing = await this.prisma.emailDeliveryLog.findFirst({
      where: {
        hotelId: args.hotelId,
        recipient: args.recipient,
        event: args.event,
        subject: args.subject,
        status: 'SENT',
      },
      select: { id: true },
    });

    return Boolean(existing);
  }

  private buildHousekeepingFollowUpEmail(args: {
    hotelName: string;
    alertDate: string;
    graceHours: number;
    tasks: Array<{
      taskId: string;
      roomNumber: string;
      status: TaskStatus;
      dueBy: Date | null;
      assignedToName: string | null;
      notes: string | null;
    }>;
  }) {
    const rows = args.tasks
      .map(
        (task) => `
          <tr>
            <td style="padding: 6px 12px 6px 0;">${escapeHtml(task.roomNumber)}</td>
            <td style="padding: 6px 12px 6px 0;">${escapeHtml(task.status)}</td>
            <td style="padding: 6px 12px 6px 0;">${task.dueBy ? fmtDateTime(task.dueBy) : '—'}</td>
            <td style="padding: 6px 0;">${escapeHtml(task.assignedToName ?? 'Unassigned')}</td>
          </tr>
        `,
      )
      .join('');

    return {
      subject: `Checkout housekeeping follow-up for ${args.hotelName}`,
      text:
        `${args.tasks.length} checkout housekeeping tasks are still open beyond ${args.graceHours} hours as of ${args.alertDate}.\n` +
        args.tasks
          .map(
            (task) =>
              `- Room ${task.roomNumber}: ${task.status} (${task.dueBy ? fmtDateTime(task.dueBy) : 'no due date'})`,
          )
          .join('\n'),
      html: `
        <div>
          <p style="margin: 0 0 12px;">
            <strong>${escapeHtml(args.hotelName)}</strong> still has checkout-prep tasks open beyond the ${args.graceHours}-hour follow-up window on ${escapeHtml(args.alertDate)}.
          </p>
          <p style="margin: 0 0 18px; color: #475569;">
            Review the task list below so rooms can be turned over quickly and escalations can be handled early.
          </p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse; margin: 0 0 8px;">
            <tr>
              ${this.buildEmailMetricCard({ label: 'Open Follow-ups', value: String(args.tasks.length) })}
              ${this.buildEmailMetricCard({ label: 'Grace Window', value: `${args.graceHours} hour${args.graceHours === 1 ? '' : 's'}` })}
            </tr>
          </table>
          <div style="margin-top: 16px; overflow: hidden; border: 1px solid #e2e8f0; border-radius: 16px;">
            <div style="padding: 14px 16px; background: #f8fafc; font-weight: 700; color: #0f172a;">Tasks still open</div>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
              <thead>
                <tr>
                  <th style="padding: 12px 16px 10px 0; text-align: left; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em;">Room</th>
                  <th style="padding: 12px 16px 10px 0; text-align: left; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em;">Status</th>
                  <th style="padding: 12px 16px 10px 0; text-align: left; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em;">Due By</th>
                  <th style="padding: 12px 0 10px; text-align: left; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em;">Assigned</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </div>
      `,
    };
  }

  private buildHousekeepingFollowUpInAppNotification(args: {
    alertDate: string;
    graceHours: number;
    tasks: Array<{
      taskId: string;
      roomId: string;
      roomNumber: string;
      status: TaskStatus;
      dueBy: Date | null;
      assignedTo: string | null;
      assignedToName: string | null;
      notes: string | null;
    }>;
  }) {
    const overdueInProgress = args.tasks.filter((task) => task.status === TaskStatus.IN_PROGRESS).length;

    return {
      title: 'Checkout prep tasks need follow-up',
      message: `${args.tasks.length} checkout prep task${args.tasks.length === 1 ? ' is' : 's are'} still open beyond the ${args.graceHours}-hour window as of ${args.alertDate}.`,
      metadata: {
        alertDate: args.alertDate,
        graceHours: args.graceHours,
        jobType: HOUSEKEEPING_FOLLOW_UP_SCAN_JOB_TYPE,
        severity: 'warning',
        summary:
          overdueInProgress > 0
            ? `${overdueInProgress} task${overdueInProgress === 1 ? '' : 's'} already in progress still need closure`
            : 'Pending checkout prep tasks need assignment or completion',
        href: args.tasks[0] ? `/housekeeping/tasks?taskId=${args.tasks[0].taskId}` : '/housekeeping/tasks',
        tasks: args.tasks.map((task) => ({
          taskId: task.taskId,
          roomId: task.roomId,
          roomNumber: task.roomNumber,
          status: task.status,
          dueBy: task.dueBy?.toISOString() ?? null,
          assignedTo: task.assignedTo,
          assignedToName: task.assignedToName,
          notes: task.notes,
        })),
      },
    };
  }

  private buildNoShowFollowUpEmail(args: {
    hotelName: string;
    alertDate: string;
    reservations: Array<{
      reservationId: string;
      reservationNo: string;
      guestName: string;
      roomNumber: string;
      localCheckInDate: string;
      status: ReservationStatus;
      nightsSinceArrival: number;
    }>;
  }) {
    const rows = args.reservations
      .map(
        (reservation) => `
          <tr>
            <td style="padding: 6px 12px 6px 0;">${escapeHtml(reservation.reservationNo)}</td>
            <td style="padding: 6px 12px 6px 0;">${escapeHtml(reservation.guestName)}</td>
            <td style="padding: 6px 12px 6px 0;">${escapeHtml(reservation.roomNumber)}</td>
            <td style="padding: 6px 12px 6px 0;">${escapeHtml(reservation.localCheckInDate)}</td>
            <td style="padding: 6px 0;">${reservation.nightsSinceArrival}</td>
          </tr>
        `,
      )
      .join('');

    return {
      subject: `No-show follow-up for ${args.hotelName}`,
      text:
        `${args.reservations.length} reservation${args.reservations.length === 1 ? '' : 's'} still need no-show review as of ${args.alertDate}.\n` +
        args.reservations
          .map(
            (reservation) =>
              `- ${reservation.reservationNo}: ${reservation.guestName}, room ${reservation.roomNumber}, arrival ${reservation.localCheckInDate}`,
          )
          .join('\n'),
      html: `
        <div>
          <p style="margin: 0 0 12px;">
            <strong>${escapeHtml(args.hotelName)}</strong> has reservations that were due to arrive on or before ${escapeHtml(args.alertDate)} but are still pending front-desk review.
          </p>
          <p style="margin: 0 0 18px; color: #475569;">
            Confirm whether each stay should be checked in, cancelled, or marked as no-show so room availability and guest history stay accurate.
          </p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse; margin: 0 0 8px;">
            <tr>
              ${this.buildEmailMetricCard({ label: 'Needs Review', value: String(args.reservations.length) })}
              ${this.buildEmailMetricCard({ label: 'Alert Date', value: args.alertDate })}
            </tr>
          </table>
          <div style="margin-top: 16px; overflow: hidden; border: 1px solid #e2e8f0; border-radius: 16px;">
            <div style="padding: 14px 16px; background: #f8fafc; font-weight: 700; color: #0f172a;">Reservations awaiting action</div>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
              <thead>
                <tr>
                  <th style="padding: 12px 16px 10px 0; text-align: left; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em;">Reservation</th>
                  <th style="padding: 12px 16px 10px 0; text-align: left; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em;">Guest</th>
                  <th style="padding: 12px 16px 10px 0; text-align: left; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em;">Room</th>
                  <th style="padding: 12px 16px 10px 0; text-align: left; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em;">Arrival Date</th>
                  <th style="padding: 12px 0 10px; text-align: left; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em;">Days Open</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </div>
      `,
    };
  }

  private buildNoShowFollowUpInAppNotification(args: {
    alertDate: string;
    reservations: Array<{
      reservationId: string;
      reservationNo: string;
      guestName: string;
      roomNumber: string;
      localCheckInDate: string;
      status: ReservationStatus;
      nightsSinceArrival: number;
    }>;
  }) {
    const longestWaiting = args.reservations.reduce(
      (max, reservation) => Math.max(max, reservation.nightsSinceArrival),
      0,
    );

    return {
      title: 'Reservations need no-show review',
      message: `${args.reservations.length} arrival${args.reservations.length === 1 ? '' : 's'} scheduled on or before ${args.alertDate} still need front-desk follow-up.`,
      metadata: {
        alertDate: args.alertDate,
        jobType: NO_SHOW_FOLLOW_UP_SCAN_JOB_TYPE,
        severity: 'warning',
        candidateCount: args.reservations.length,
        summary:
          longestWaiting > 0
            ? `Oldest pending arrival has been waiting ${longestWaiting} day${longestWaiting === 1 ? '' : 's'}`
            : 'Same-day arrivals still need check-in or no-show action',
        href: args.reservations[0]
          ? `/reservations/${args.reservations[0].reservationId}`
          : '/reservations',
        reservations: args.reservations,
      },
    };
  }

  private buildDailyDigestEmail(args: {
    hotelName: string;
    alertDate: string;
    nextArrivalDate: string;
    arrivalsTomorrow: number;
    departuresToday: number;
    overdueCheckouts: number;
    overduePayments: number;
    openCheckoutPrepTasks: number;
    urgentMaintenanceOpen: number;
  }) {
    return {
      subject: `Daily digest for ${args.hotelName} on ${args.alertDate}`,
      text:
        `${args.hotelName}: daily operations digest for ${args.alertDate}.\n` +
        `Tomorrow arrivals (${args.nextArrivalDate}): ${args.arrivalsTomorrow}\n` +
        `Due out today: ${args.departuresToday}\n` +
        `Overdue checkouts: ${args.overdueCheckouts}\n` +
        `Overdue payments: ${args.overduePayments}\n` +
        `Open checkout prep tasks: ${args.openCheckoutPrepTasks}\n` +
        `Open urgent maintenance requests: ${args.urgentMaintenanceOpen}`,
      html: `
        <div>
          <p style="margin: 0 0 12px;">Daily digest for <strong>${escapeHtml(args.hotelName)}</strong> on <strong>${escapeHtml(args.alertDate)}</strong>.</p>
          <p style="margin: 0 0 18px; color: #475569;">
            This summary highlights the next wave of guest movement plus the most important unresolved operational follow-ups.
          </p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse; margin: 0 0 12px;">
            <tr>
              ${this.buildEmailMetricCard({ label: 'Tomorrow Arrivals', value: String(args.arrivalsTomorrow) })}
              ${this.buildEmailMetricCard({ label: 'Due Out Today', value: String(args.departuresToday) })}
            </tr>
            <tr>
              ${this.buildEmailMetricCard({ label: 'Overdue Checkouts', value: String(args.overdueCheckouts) })}
              ${this.buildEmailMetricCard({ label: 'Overdue Payments', value: String(args.overduePayments) })}
            </tr>
            <tr>
              ${this.buildEmailMetricCard({ label: 'Open Checkout Prep', value: String(args.openCheckoutPrepTasks) })}
              ${this.buildEmailMetricCard({ label: 'Urgent Maintenance', value: String(args.urgentMaintenanceOpen) })}
            </tr>
          </table>
          <div style="margin-top: 12px; overflow: hidden; border: 1px solid #e2e8f0; border-radius: 16px;">
            <div style="padding: 14px 16px; background: #f8fafc; font-weight: 700; color: #0f172a;">Operational outlook</div>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
              ${this.buildEmailDetailRows([
                { label: 'Digest Date', value: args.alertDate },
                { label: 'Next Arrival Date', value: args.nextArrivalDate },
                { label: 'Tomorrow Arrivals', value: String(args.arrivalsTomorrow) },
                { label: 'Departures Due Today', value: String(args.departuresToday) },
                { label: 'Overdue Checkouts', value: String(args.overdueCheckouts) },
                { label: 'Overdue Payments', value: String(args.overduePayments) },
                { label: 'Checkout Prep Still Open', value: String(args.openCheckoutPrepTasks) },
                { label: 'Urgent Maintenance Still Open', value: String(args.urgentMaintenanceOpen) },
              ])}
            </table>
          </div>
        </div>
      `,
    };
  }

  private buildDailyDigestInAppNotification(args: {
    alertDate: string;
    nextArrivalDate: string;
    arrivalsTomorrow: number;
    departuresToday: number;
    overdueCheckouts: number;
    overduePayments: number;
    openCheckoutPrepTasks: number;
    urgentMaintenanceOpen: number;
  }) {
    return {
      title: 'Daily operations digest ready',
      message: `${args.arrivalsTomorrow} arrival${args.arrivalsTomorrow === 1 ? '' : 's'} are due on ${args.nextArrivalDate}, with ${args.overdueCheckouts} overdue checkout${args.overdueCheckouts === 1 ? '' : 's'} and ${args.overduePayments} overdue payment${args.overduePayments === 1 ? '' : 's'} to review.`,
      metadata: {
        alertDate: args.alertDate,
        nextArrivalDate: args.nextArrivalDate,
        jobType: DAILY_DIGEST_SCAN_JOB_TYPE,
        severity:
          args.overdueCheckouts > 0 || args.overduePayments > 0 || args.urgentMaintenanceOpen > 0
            ? 'warning'
            : 'info',
        summary: `${args.departuresToday} departures due today · ${args.openCheckoutPrepTasks} checkout prep task${args.openCheckoutPrepTasks === 1 ? '' : 's'} still open`,
        href: '/reports',
        arrivalsTomorrow: args.arrivalsTomorrow,
        departuresToday: args.departuresToday,
        overdueCheckouts: args.overdueCheckouts,
        overduePayments: args.overduePayments,
        openCheckoutPrepTasks: args.openCheckoutPrepTasks,
        urgentMaintenanceOpen: args.urgentMaintenanceOpen,
      },
    };
  }

  private buildCollectionsEscalationEmail(args: {
    hotelName: string;
    alertDate: string;
    severeCount: number;
    oldestDaysOverdue: number;
    totalOutstanding: number;
  }) {
    return {
      subject: `Collections escalation review for ${args.hotelName}`,
      text:
        `${args.hotelName}: ${args.severeCount} overdue folio` +
        `${args.severeCount === 1 ? ' is' : 's are'} now in severe collections territory as of ${args.alertDate}.\n` +
        `Oldest age: ${args.oldestDaysOverdue} days overdue\n` +
        `Total outstanding: ${fmtMoney(args.totalOutstanding)}`,
      html: `
        <div>
          <p style="margin: 0 0 12px;">Collections escalation review for <strong>${escapeHtml(args.hotelName)}</strong>.</p>
          <p style="margin: 0 0 12px; color: #475569;">
            ${args.severeCount} overdue folio${args.severeCount === 1 ? '' : 's'} now need management review.
          </p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
            <tr>
              ${this.buildEmailMetricCard({ label: 'Severe Cases', value: String(args.severeCount) })}
              ${this.buildEmailMetricCard({ label: 'Oldest Age', value: `${args.oldestDaysOverdue}d` })}
            </tr>
            <tr>
              ${this.buildEmailMetricCard({ label: 'Outstanding', value: fmtMoney(args.totalOutstanding) })}
              ${this.buildEmailMetricCard({ label: 'Alert Date', value: args.alertDate })}
            </tr>
          </table>
        </div>
      `,
    };
  }

  private buildCollectionsEscalationInAppNotification(args: {
    alertDate: string;
    severeCount: number;
    oldestDaysOverdue: number;
    totalOutstanding: number;
  }) {
    return {
      title: 'Collections escalation review needed',
      message:
        `${args.severeCount} overdue folio${args.severeCount === 1 ? '' : 's'} now need management attention. ` +
        `Oldest age: ${args.oldestDaysOverdue} day${args.oldestDaysOverdue === 1 ? '' : 's'}.`,
      metadata: {
        alertDate: args.alertDate,
        severeCount: args.severeCount,
        oldestDaysOverdue: args.oldestDaysOverdue,
        totalOutstanding: args.totalOutstanding,
        severity: 'critical',
        summary: `${fmtMoney(args.totalOutstanding)} now in severe collections review`,
        href: '/reservations?checkoutTiming=overdue',
      },
    };
  }

  private buildRoomAssignmentReviewEmail(args: {
    hotelName: string;
    arrivalDate: string;
    reservationCount: number;
  }) {
    return {
      subject: `Room assignment review for ${args.hotelName}`,
      text:
        `${args.hotelName}: ${args.reservationCount} arrival` +
        `${args.reservationCount === 1 ? ' is' : 's are'} due on ${args.arrivalDate} without a room assignment.`,
      html: `
        <div>
          <p style="margin: 0 0 12px;">Room assignment review for <strong>${escapeHtml(args.hotelName)}</strong>.</p>
          <p style="margin: 0; color: #475569;">
            ${args.reservationCount} upcoming arrival${args.reservationCount === 1 ? '' : 's'} still need room assignment before ${escapeHtml(args.arrivalDate)}.
          </p>
        </div>
      `,
    };
  }

  private buildRoomAssignmentReviewInAppNotification(args: {
    arrivalDate: string;
    reservationCount: number;
  }) {
    return {
      title: 'Upcoming arrivals need room assignment',
      message:
        `${args.reservationCount} arrival${args.reservationCount === 1 ? '' : 's'} due on ${args.arrivalDate} still ` +
        `need room assignment review.`,
      metadata: {
        arrivalDate: args.arrivalDate,
        reservationCount: args.reservationCount,
        severity: 'warning',
        summary: `${args.reservationCount} arrivals still unassigned`,
        href: '/reservations',
      },
    };
  }

  private async ensureCheckoutHousekeepingTask(args: {
    hotelId: string;
    roomId: string;
    reservationNo: string;
    guestName: string;
    dueBy: Date;
    overdue: boolean;
  }) {
    const type = 'CHECKOUT_PREP';
    const existing = await this.prisma.housekeepingTask.findFirst({
      where: {
        hotelId: args.hotelId,
        roomId: args.roomId,
        type,
        status: { in: [TaskStatus.PENDING, TaskStatus.IN_PROGRESS] },
        notes: { contains: args.reservationNo, mode: 'insensitive' },
      },
      select: { id: true },
    });

    if (existing) return;

    const label = args.overdue ? 'Overdue checkout follow-up' : 'Due checkout prep';
    await this.prisma.housekeepingTask.create({
      data: {
        hotelId: args.hotelId,
        roomId: args.roomId,
        type,
        priority: args.overdue ? TaskPriority.HIGH : TaskPriority.NORMAL,
        status: TaskStatus.PENDING,
        dueBy: args.dueBy,
        notes: `${label} for reservation ${args.reservationNo} (${args.guestName}). Created by checkout scheduler.`,
      },
    });
  }

  private async assertGuestBelongsToHotel(hotelId: string, guestId?: string | null) {
    if (!guestId) return;
    const guest = await this.prisma.guest.findFirst({
      where: { id: guestId, hotelId },
      select: { id: true },
    });
    if (!guest) throw new NotFoundException('Guest not found.');
  }

  private async assertCompanyBelongsToHotel(hotelId: string, companyId?: string | null) {
    if (!companyId) return;
    const company = await this.prisma.company.findFirst({
      where: { id: companyId, hotelId },
      select: { id: true },
    });
    if (!company) throw new NotFoundException('Company not found.');
  }

  private async assertGroupBookingBelongsToHotel(hotelId: string, groupBookingId?: string | null) {
    if (!groupBookingId) return;
    const groupBooking = await this.prisma.groupBooking.findFirst({
      where: { id: groupBookingId, hotelId },
      select: { id: true },
    });
    if (!groupBooking) throw new NotFoundException('Group booking not found.');
  }

  private async getAvailableRoomForReservation(
    hotelId: string,
    roomId: string,
    checkIn: Date,
    checkOut: Date,
    excludeReservationId?: string,
  ) {
    const room = await this.prisma.room.findFirst({
      where: { id: roomId, hotelId },
    });
    if (!room) throw new NotFoundException('Room not found.');
    if (room.status === RoomStatus.MAINTENANCE || room.status === RoomStatus.OUT_OF_ORDER) {
      throw new BadRequestException(`Room ${room.number} is not available.`);
    }

    const overlap = await this.prisma.reservation.findFirst({
      where: {
        hotelId,
        roomId,
        id: excludeReservationId ? { not: excludeReservationId } : undefined,
        status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] },
        checkIn: { lt: checkOut },
        checkOut: { gt: checkIn },
      },
    });
    if (overlap) {
      throw new ConflictException(
        `Room is already booked ${overlap.reservationNo} for those dates.`,
      );
    }

    return room;
  }

  private normalizeOptionalRelations<T extends Record<string, any>>(dto: T) {
    return {
      ...dto,
      companyId: dto.companyId === undefined ? undefined : dto.companyId?.trim() || null,
      groupBookingId:
        dto.groupBookingId === undefined ? undefined : dto.groupBookingId?.trim() || null,
    };
  }

  // ── List ────────────────────────────────────────────────────────────────────
  async findAll(hotelId: string, filters: ReservationFilterDto) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = { hotelId };
    if (filters.status) where.status = filters.status;
    if (filters.roomId) where.roomId = filters.roomId;
    if (filters.guestId) where.guestId = filters.guestId;
    if (filters.checkoutTiming && !filters.status) {
      where.status = ReservationStatus.CHECKED_IN;
    }

    if (filters.dateFrom || filters.dateTo) {
      where.AND = [
        filters.dateFrom ? { checkIn: { gte: new Date(filters.dateFrom) } } : {},
        filters.dateTo ? { checkOut: { lte: new Date(filters.dateTo) } } : {},
      ];
    }

    if (filters.search) {
      where.OR = [
        { reservationNo: { contains: filters.search, mode: 'insensitive' } },
        { guest: { firstName: { contains: filters.search, mode: 'insensitive' } } },
        { guest: { lastName: { contains: filters.search, mode: 'insensitive' } } },
        { room: { number: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

    const hotel = filters.checkoutTiming
      ? ((await this.prisma.hotel.findUnique({
          where: { id: hotelId },
          select: { timezone: true } as any,
        })) as { timezone?: string | null } | null)
      : null;

    const reservationQuery = {
      where,
      orderBy: { checkIn: 'desc' as const },
      include: {
        guest: {
          select: { id: true, firstName: true, lastName: true, isVip: true, phone: true },
        },
        room: {
          select: { id: true, number: true, type: true, floor: { select: { name: true } } },
        },
        company: { select: { id: true, name: true } },
        groupBooking: { select: { id: true, groupNo: true, name: true } },
        _count: { select: { folioItems: true } },
      },
    };

    const [reservations, total] = filters.checkoutTiming
      ? await (async () => {
          const timezone = hotel?.timezone || 'Africa/Lagos';
          const now = new Date();
          const today = getZonedDateParts(now, timezone).date;
          const tomorrowRef = new Date(now);
          tomorrowRef.setDate(tomorrowRef.getDate() + 1);
          const tomorrow = getZonedDateParts(tomorrowRef, timezone).date;

          const allReservations = await this.prisma.reservation.findMany(reservationQuery);
          const filtered = allReservations.filter((reservation) => {
            const localCheckoutDate = getZonedDateParts(reservation.checkOut, timezone).date;
            if (filters.checkoutTiming === 'dueTomorrow') return localCheckoutDate === tomorrow;
            if (filters.checkoutTiming === 'dueToday') return localCheckoutDate === today;
            if (filters.checkoutTiming === 'overdue') return localCheckoutDate < today;
            return true;
          });

          return [filtered.slice(skip, skip + limit), filtered.length] as const;
        })()
      : await Promise.all([
          this.prisma.reservation.findMany({
            ...reservationQuery,
            skip,
            take: limit,
          }),
          this.prisma.reservation.count({ where }),
        ]);

    // Today's stats (always hotel-wide)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [arrivals, departures, inHouse, pending] = await Promise.all([
      this.prisma.reservation.count({
        where: {
          hotelId,
          checkIn: { gte: today, lt: tomorrow },
          status: { in: ['CONFIRMED', 'PENDING'] },
        },
      }),
      this.prisma.reservation.count({
        where: { hotelId, checkOut: { gte: today, lt: tomorrow }, status: 'CHECKED_IN' },
      }),
      this.prisma.reservation.count({ where: { hotelId, status: 'CHECKED_IN' } }),
      this.prisma.reservation.count({ where: { hotelId, status: 'PENDING' } }),
    ]);

    return {
      reservations,
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
      stats: { arrivals, departures, inHouse, pending },
    };
  }

  // ── Single ──────────────────────────────────────────────────────────────────
  async findOne(hotelId: string, id: string) {
    const res = await this.prisma.reservation.findFirst({
      where: { id, hotelId },
      include: RESERVATION_INCLUDE as any,
    });
    if (!res) throw new NotFoundException('Reservation not found.');
    return res;
  }

  // ── Availability ────────────────────────────────────────────────────────────
  async getAvailableRooms(hotelId: string, dto: AvailabilityDto) {
    const hotel = await this.prisma.hotel.findUnique({
      where: { id: hotelId },
      select: { defaultCheckoutHour: true, defaultCheckoutMinute: true } as any,
    }) as
      | {
          defaultCheckoutHour?: number | null;
          defaultCheckoutMinute?: number | null;
        }
      | null;
    const checkIn = new Date(dto.checkIn);
    const checkOut = this.applyDefaultCheckoutTime(
      new Date(dto.checkOut),
      hotel?.defaultCheckoutHour ?? 12,
      hotel?.defaultCheckoutMinute ?? 0,
    );

    if (checkOut <= checkIn) throw new BadRequestException('Check-out must be after check-in.');

    // Rooms with overlapping active reservations
    const occupied = await this.prisma.reservation.findMany({
      where: {
        hotelId,
        status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] },
        checkIn: { lt: checkOut },
        checkOut: { gt: checkIn },
      },
      select: { roomId: true },
    });
    const occupiedIds = occupied.map((r) => r.roomId);

    const where: any = {
      hotelId,
      id: { notIn: occupiedIds },
      status: { notIn: [RoomStatus.MAINTENANCE, RoomStatus.OUT_OF_ORDER, RoomStatus.DIRTY] },
    };
    if (dto.type) where.type = dto.type;
    if (dto.minGuests) where.maxGuests = { gte: dto.minGuests };

    return this.prisma.room.findMany({
      where,
      orderBy: [{ floor: { level: 'asc' } }, { number: 'asc' }],
      include: { floor: { select: { name: true, level: true } } },
    });
  }

  // ── Create ──────────────────────────────────────────────────────────────────
  async create(hotelId: string, dto: CreateReservationDto, actorUserId?: string) {
    const data = this.normalizeOptionalRelations(dto);
    const hotelSettings = await this.prisma.hotel.findUnique({
      where: { id: hotelId },
      select: { defaultCheckoutHour: true, defaultCheckoutMinute: true } as any,
    }) as
      | {
          defaultCheckoutHour?: number | null;
          defaultCheckoutMinute?: number | null;
        }
      | null;
    const checkIn = new Date(dto.checkIn);
    const checkOut = this.applyDefaultCheckoutTime(
      new Date(dto.checkOut),
      hotelSettings?.defaultCheckoutHour ?? 12,
      hotelSettings?.defaultCheckoutMinute ?? 0,
    );

    if (checkOut <= checkIn) throw new BadRequestException('Check-out must be after check-in.');

    const room = await this.getAvailableRoomForReservation(hotelId, dto.roomId, checkIn, checkOut);
    await Promise.all([
      this.assertGuestBelongsToHotel(hotelId, data.guestId),
      this.assertCompanyBelongsToHotel(hotelId, data.companyId),
      this.assertGroupBookingBelongsToHotel(hotelId, data.groupBookingId),
    ]);

    const nights = nightsBetween(checkIn, checkOut);
    const totalAmount = dto.totalAmount ?? nights * Number(room.baseRate);

    // Unique reservation number
    let reservationNo: string;
    let attempts = 0;
    do {
      reservationNo = genReservationNo(hotelId);
      const exists = await this.prisma.reservation.findUnique({ where: { reservationNo } });
      if (!exists) break;
    } while (++attempts < 5);

    const reservation = await this.prisma.reservation.create({
      data: {
        hotelId,
        guestId: data.guestId,
        roomId: data.roomId,
        companyId: data.companyId,
        groupBookingId: data.groupBookingId,
        bookingType: dto.bookingType ?? BookingType.INDIVIDUAL,
        reservationNo: reservationNo!,
        checkIn,
        checkOut,
        adults: dto.adults ?? 1,
        children: dto.children ?? 0,
        status: ReservationStatus.CONFIRMED,
        paymentStatus: PaymentStatus.UNPAID,
        totalAmount,
        paidAmount: 0,
        source: dto.source ?? 'DIRECT',
        specialRequests: dto.specialRequests,
        notes: dto.notes,
      },
      include: RESERVATION_INCLUDE as any,
    });

    // Add primary guest to ReservationGuest
    await this.prisma.reservationGuest.create({
      data: { reservationId: reservation.id, guestId: data.guestId, role: 'PRIMARY' },
    });

    // Mark room as RESERVED
    await this.prisma.room.update({
      where: { id: dto.roomId },
      data: { status: RoomStatus.RESERVED },
    });

    const hotel = await this.prisma.hotel.findUnique({
      where: { id: hotelId },
      select: { name: true },
    });

    const reservationDetails = reservation as any;
    const guestName =
      `${reservationDetails.guest?.firstName ?? ''} ${reservationDetails.guest?.lastName ?? ''}`.trim() ||
      'Guest';

    try {
      await this.notifications.dispatch({
        hotelId,
        event: 'newReservation',
        excludeEmailUserIds: actorUserId ? [actorUserId] : undefined,
        email: this.buildNewReservationNotificationEmail({
          hotelName: hotel?.name ?? 'HotelOS',
          reservationNo: reservation.reservationNo,
          guestName,
          roomNumber: reservationDetails.room?.number ?? 'Unassigned',
          checkIn: reservation.checkIn,
          checkOut: reservation.checkOut,
          totalAmount: Number(reservation.totalAmount),
        }),
        inApp: this.buildNewReservationInAppNotification({
          reservationId: reservation.id,
          reservationNo: reservation.reservationNo,
          guestName,
          roomNumber: reservationDetails.room?.number ?? 'Unassigned',
          checkIn: reservation.checkIn,
          checkOut: reservation.checkOut,
        }),
      });
    } catch (error) {
      this.logger.warn(
        `Failed to dispatch newReservation notification for ${reservation.reservationNo}: ${String(error)}`,
      );
    }

    return reservation;
  }

  // ── Update ──────────────────────────────────────────────────────────────────
  async update(hotelId: string, id: string, dto: UpdateReservationDto) {
    const data = this.normalizeOptionalRelations(dto);
    const current = await this.findOne(hotelId, id);
    const hotelSettings = await this.prisma.hotel.findUnique({
      where: { id: hotelId },
      select: { defaultCheckoutHour: true, defaultCheckoutMinute: true } as any,
    }) as
      | {
          defaultCheckoutHour?: number | null;
          defaultCheckoutMinute?: number | null;
        }
      | null;
    const nextRoomId = data.roomId ?? current.roomId;
    const nextCheckIn = data.checkIn ? new Date(data.checkIn) : current.checkIn;
    const nextCheckOut = data.checkOut
      ? this.applyDefaultCheckoutTime(
          new Date(data.checkOut),
          hotelSettings?.defaultCheckoutHour ?? 12,
          hotelSettings?.defaultCheckoutMinute ?? 0,
        )
      : current.checkOut;
    const roomOrDateChanged =
      nextRoomId !== current.roomId ||
      nextCheckIn.getTime() !== current.checkIn.getTime() ||
      nextCheckOut.getTime() !== current.checkOut.getTime();

    if (nextCheckOut <= nextCheckIn) {
      throw new BadRequestException('Check-out must be after check-in.');
    }

    if (roomOrDateChanged && !['PENDING', 'CONFIRMED'].includes(current.status)) {
      throw new BadRequestException(`Cannot change room or dates for status ${current.status}.`);
    }

    await Promise.all([
      this.assertGuestBelongsToHotel(hotelId, data.guestId),
      this.assertCompanyBelongsToHotel(hotelId, data.companyId),
      this.assertGroupBookingBelongsToHotel(hotelId, data.groupBookingId),
      roomOrDateChanged
        ? this.getAvailableRoomForReservation(hotelId, nextRoomId, nextCheckIn, nextCheckOut, id)
        : Promise.resolve(null),
    ]);

    const updated = await this.prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.update({
        where: { id: current.id },
        data: {
          ...data,
          checkIn: data.checkIn ? nextCheckIn : undefined,
          checkOut: data.checkOut ? nextCheckOut : undefined,
        },
        include: RESERVATION_INCLUDE as any,
      });

      if (data.roomId && data.roomId !== current.roomId && ['PENDING', 'CONFIRMED'].includes(reservation.status)) {
        await tx.room.update({ where: { id: current.roomId }, data: { status: RoomStatus.AVAILABLE } });
        await tx.room.update({ where: { id: data.roomId }, data: { status: RoomStatus.RESERVED } });
      }

      return reservation;
    });

    return updated;
  }

  // ── Check In ────────────────────────────────────────────────────────────────
  async checkIn(hotelId: string, id: string, actorUserId?: string) {
    const res = await this.findOne(hotelId, id);
    if (!['CONFIRMED', 'PENDING'].includes(res.status)) {
      throw new BadRequestException(`Cannot check in a reservation with status ${res.status}.`);
    }

    const [updated] = await Promise.all([
      this.prisma.reservation.update({
        where: { id },
        data: { status: ReservationStatus.CHECKED_IN },
        include: RESERVATION_INCLUDE as any,
      }),
      this.prisma.room.update({
        where: { id: res.roomId },
        data: { status: RoomStatus.OCCUPIED },
      }),
    ]);

    // Seed first room-night folio item
    const description = `Room charge — ${(res as any).room.number} (${(res as any).room.type})`;
    const folioItem = await this.prisma.folioItem.create({
      data: {
        hotelId,
        reservationId: id,
        description,
        amount: (res as any).room.baseRate,
        quantity: 1,
        category: 'ROOM',
      },
    });

    await this.ledger.postFolioCharge(hotelId, {
      amount: Number(folioItem.amount),
      category: folioItem.category,
      description: folioItem.description,
      reservationId: folioItem.reservationId,
      folioItemId: folioItem.id,
    });

    const hotel = await this.prisma.hotel.findUnique({
      where: { id: hotelId },
      select: { name: true },
    });

    const reservationDetails = updated as any;
    const guestName =
      `${reservationDetails.guest?.firstName ?? ''} ${reservationDetails.guest?.lastName ?? ''}`.trim() ||
      'Guest';

    try {
      await this.notifications.dispatch({
        hotelId,
        event: 'checkIn',
        excludeEmailUserIds: actorUserId ? [actorUserId] : undefined,
        email: this.buildCheckInNotificationEmail({
          hotelName: hotel?.name ?? 'HotelOS',
          reservationNo: updated.reservationNo,
          guestName,
          roomNumber: reservationDetails.room?.number ?? 'Unassigned',
          checkedInAt: new Date(),
        }),
        inApp: this.buildCheckInInAppNotification({
          reservationId: updated.id,
          reservationNo: updated.reservationNo,
          guestName,
          roomNumber: reservationDetails.room?.number ?? 'Unassigned',
          checkedInAt: new Date(),
        }),
      });
    } catch (error) {
      this.logger.warn(
        `Failed to dispatch checkIn notification for ${updated.reservationNo}: ${String(error)}`,
      );
    }

    return updated;
  }

  // ── Check Out ───────────────────────────────────────────────────────────────
  async checkOut(hotelId: string, id: string, actorUserId?: string) {
    const res = await this.findOne(hotelId, id);
    if (res.status !== 'CHECKED_IN') {
      throw new BadRequestException(`Cannot check out a reservation with status ${res.status}.`);
    }

    const [updated] = await Promise.all([
      this.prisma.reservation.update({
        where: { id },
        data: { status: ReservationStatus.CHECKED_OUT },
        include: RESERVATION_INCLUDE as any,
      }),
      this.prisma.room.update({
        where: { id: res.roomId },
        data: { status: RoomStatus.DIRTY },
      }),
    ]);

    const hotel = await this.prisma.hotel.findUnique({
      where: { id: hotelId },
      select: { name: true },
    });

    const reservationDetails = updated as any;
    const guestName =
      `${reservationDetails.guest?.firstName ?? ''} ${reservationDetails.guest?.lastName ?? ''}`.trim() ||
      'Guest';

    try {
      await this.notifications.dispatch({
        hotelId,
        event: 'checkOut',
        excludeEmailUserIds: actorUserId ? [actorUserId] : undefined,
        email: this.buildCheckOutNotificationEmail({
          hotelName: hotel?.name ?? 'HotelOS',
          reservationNo: updated.reservationNo,
          guestName,
          roomNumber: reservationDetails.room?.number ?? 'Unassigned',
          checkedOutAt: new Date(),
        }),
        inApp: this.buildCheckOutInAppNotification({
          reservationId: updated.id,
          reservationNo: updated.reservationNo,
          guestName,
          roomNumber: reservationDetails.room?.number ?? 'Unassigned',
          checkedOutAt: new Date(),
        }),
      });
    } catch (error) {
      this.logger.warn(
        `Failed to dispatch checkOut notification for ${updated.reservationNo}: ${String(error)}`,
      );
    }

    return updated;
  }

  // ── Cancel ──────────────────────────────────────────────────────────────────
  async cancel(hotelId: string, id: string) {
    const res = await this.findOne(hotelId, id);
    if (['CHECKED_IN', 'CHECKED_OUT'].includes(res.status)) {
      throw new BadRequestException(`Cannot cancel a reservation with status ${res.status}.`);
    }

    const [updated] = await Promise.all([
      this.prisma.reservation.update({
        where: { id },
        data: { status: ReservationStatus.CANCELLED },
        include: RESERVATION_INCLUDE as any,
      }),
      this.prisma.room.update({
        where: { id: res.roomId },
        data: { status: RoomStatus.AVAILABLE },
      }),
    ]);

    return updated;
  }

  // ── No Show ─────────────────────────────────────────────────────────────────
  async noShow(hotelId: string, id: string) {
    const res = await this.findOne(hotelId, id);
    if (!['CONFIRMED', 'PENDING'].includes(res.status)) {
      throw new BadRequestException(`Cannot mark no-show for status ${res.status}.`);
    }

    const [updated] = await Promise.all([
      this.prisma.reservation.update({
        where: { id },
        data: { status: ReservationStatus.NO_SHOW },
        include: RESERVATION_INCLUDE as any,
      }),
      this.prisma.room.update({
        where: { id: res.roomId },
        data: { status: RoomStatus.AVAILABLE },
      }),
    ]);

    return updated;
  }

  async runCheckoutDueScanForDate(
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
        guestCheckoutReminderEnabled: true,
        guestCheckoutReminderLeadDays: true,
        autoCreateCheckoutHousekeepingTasks: true,
        cronSettings: {
          where: { jobType: HotelCronJobType.CHECKOUT_DUE_SCAN },
          take: 1,
        },
      } as any,
      orderBy: { createdAt: 'asc' },
    })) as unknown as Array<{
      id: string;
      name: string;
      timezone: string | null;
      guestCheckoutReminderEnabled?: boolean;
      guestCheckoutReminderLeadDays?: number[] | null;
      autoCreateCheckoutHousekeepingTasks?: boolean;
      cronSettings: Array<{
        enabled: boolean;
        runAtHour: number;
        runAtMinute: number;
        lastTriggeredAt?: Date | null;
      }>;
    }>;

    let reservationsFlagged = 0;
    let hotelsProcessed = 0;
    let hotelsFailed = 0;

    for (const hotel of hotels) {
      const cronSetting = hotel.cronSettings[0];
      const enabled = cronSetting?.enabled ?? true;
      const runAtHour = cronSetting?.runAtHour ?? 11;
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
        const checkedInReservations = await this.prisma.reservation.findMany({
          where: {
            hotelId: hotel.id,
            status: ReservationStatus.CHECKED_IN,
          },
          select: {
            id: true,
            reservationNo: true,
            checkOut: true,
            roomId: true,
            guest: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            room: {
              select: {
                number: true,
              },
            },
          },
          orderBy: [{ checkOut: 'asc' }, { createdAt: 'asc' }],
        });

        const reservations = checkedInReservations
          .map((reservation) => {
            const guestName =
              `${reservation.guest?.firstName ?? ''} ${reservation.guest?.lastName ?? ''}`.trim() ||
              'Guest';
            return {
              reservationId: reservation.id,
              reservationNo: reservation.reservationNo,
              guestName,
              guestEmail: reservation.guest?.email ?? null,
              roomId: reservation.roomId,
              roomNumber: reservation.room?.number ?? 'Unassigned',
              checkOut: reservation.checkOut,
              localCheckoutDate: getZonedDateParts(reservation.checkOut, timezone).date,
            };
          })
          .filter((reservation) => reservation.localCheckoutDate <= alertDate);

        if (!reservations.length) {
          await this.recordCronJobSuccess({
            hotelId: hotel.id,
            jobType: HotelCronJobType.CHECKOUT_DUE_SCAN,
            enabled,
            runAtHour,
            runAtMinute,
            triggeredAt: reference,
          });
          hotelsProcessed += 1;
          continue;
        }

        const dueTodayCount = reservations.filter(
          (reservation) => reservation.localCheckoutDate === alertDate,
        ).length;
        const overdueCount = reservations.filter(
          (reservation) => reservation.localCheckoutDate < alertDate,
        ).length;
        const scheduledAt = `${String(runAtHour).padStart(2, '0')}:${String(runAtMinute).padStart(2, '0')}`;

        await this.notifications.dispatch({
          hotelId: hotel.id,
          event: 'checkOutDue',
          email: this.buildCheckoutDueSummaryEmail({
            hotelName: hotel.name,
            alertDate,
            scheduledAt,
            dueTodayCount,
            overdueCount,
            reservations,
          }),
          inApp: this.buildCheckoutDueInAppNotification({
            alertDate,
            dueTodayCount,
            overdueCount,
            reservations,
          }),
        });

        if (hotel.guestCheckoutReminderEnabled) {
          const reminderLeadDays = this.normalizeGuestCheckoutReminderLeadDays(
            hotel.guestCheckoutReminderLeadDays,
          );
          for (const reservation of checkedInReservations
            .map((item) => ({
              reservationId: item.id,
              reservationNo: item.reservationNo,
              guestName:
                `${item.guest?.firstName ?? ''} ${item.guest?.lastName ?? ''}`.trim() || 'Guest',
              guestEmail: item.guest?.email ?? null,
              roomNumber: item.room?.number ?? 'Unassigned',
              checkOut: item.checkOut,
              localCheckoutDate: getZonedDateParts(item.checkOut, timezone).date,
            }))
            .map((item) => ({
              ...item,
              daysUntilCheckout: diffDaysBetweenLocalDates(alertDate, item.localCheckoutDate),
            }))
            .filter(
              (item) =>
                item.guestEmail &&
                item.daysUntilCheckout >= 0 &&
                reminderLeadDays.includes(item.daysUntilCheckout),
            )) {
            const event = this.buildGuestCheckoutReminderEvent(reservation.daysUntilCheckout);
            const emailContent = this.buildGuestCheckoutReminderEmail({
              hotelName: hotel.name,
              guestName: reservation.guestName,
              roomNumber: reservation.roomNumber,
              reservationNo: reservation.reservationNo,
              checkOut: reservation.checkOut,
              daysUntilCheckout: reservation.daysUntilCheckout,
            });

            const alreadySent = await this.hasSentGuestCheckoutReminder({
              hotelId: hotel.id,
              recipient: reservation.guestEmail as string,
              event,
              subject: emailContent.subject,
            });

            if (alreadySent) continue;

            await this.email.sendEmail({
              to: reservation.guestEmail as string,
              subject: emailContent.subject,
              html: emailContent.html,
              text: emailContent.text,
              hotelId: hotel.id,
              event,
              metadata: {
                reservationId: reservation.reservationId,
                reservationNo: reservation.reservationNo,
                daysUntilCheckout: reservation.daysUntilCheckout,
                localCheckoutDate: reservation.localCheckoutDate,
              },
            });
          }
        }

        if (hotel.autoCreateCheckoutHousekeepingTasks) {
          for (const reservation of reservations) {
            await this.ensureCheckoutHousekeepingTask({
              hotelId: hotel.id,
              roomId: reservation.roomId,
              reservationNo: reservation.reservationNo,
              guestName: reservation.guestName,
              dueBy: reservation.checkOut,
              overdue: reservation.localCheckoutDate < alertDate,
            });
          }
        }

        await this.recordCronJobSuccess({
          hotelId: hotel.id,
          jobType: HotelCronJobType.CHECKOUT_DUE_SCAN,
          enabled,
          runAtHour,
          runAtMinute,
          triggeredAt: reference,
        });

        reservationsFlagged += reservations.length;
        hotelsProcessed += 1;
      } catch (error) {
        hotelsFailed += 1;
        this.logger.error(`Checkout due scan failed for hotel ${hotel.id}: ${String(error)}`);

        await this.recordCronJobFailure({
          hotelId: hotel.id,
          jobType: HotelCronJobType.CHECKOUT_DUE_SCAN,
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
      reservationsFlagged,
    };
  }

  async runHousekeepingFollowUpScanForDate(
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
          housekeepingFollowUpEnabled: true,
          housekeepingFollowUpGraceHours: true,
          cronSettings: {
            where: { jobType: HOUSEKEEPING_FOLLOW_UP_SCAN_JOB_TYPE },
            take: 1,
          },
      } as any,
      orderBy: { createdAt: 'asc' },
    })) as unknown as Array<{
      id: string;
      name: string;
      timezone: string | null;
      housekeepingFollowUpEnabled?: boolean;
      housekeepingFollowUpGraceHours?: number | null;
      cronSettings: Array<{
        enabled: boolean;
        runAtHour: number;
        runAtMinute: number;
        lastTriggeredAt?: Date | null;
      }>;
    }>;

    let tasksFlagged = 0;
    let hotelsProcessed = 0;
    let hotelsFailed = 0;

    for (const hotel of hotels) {
      const cronSetting = hotel.cronSettings[0];
      const enabled = cronSetting?.enabled ?? false;
      const runAtHour = cronSetting?.runAtHour ?? 15;
      const runAtMinute = cronSetting?.runAtMinute ?? 0;
      const timezone = hotel.timezone || 'Africa/Lagos';
      const graceHours = Math.max(1, hotel.housekeepingFollowUpGraceHours ?? 2);

      if ((!enabled || !hotel.housekeepingFollowUpEnabled) && !force) continue;

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
        const cutoff = new Date(reference.getTime() - graceHours * 60 * 60 * 1000);
        const tasks = await this.prisma.housekeepingTask.findMany({
          where: {
            hotelId: hotel.id,
            type: 'CHECKOUT_PREP',
            status: { in: [TaskStatus.PENDING, TaskStatus.IN_PROGRESS] },
            dueBy: { lte: cutoff },
          },
          select: {
            id: true,
            roomId: true,
            status: true,
            dueBy: true,
            notes: true,
            assignedTo: true,
            room: { select: { number: true } },
            staff: { select: { firstName: true, lastName: true } },
          },
          orderBy: [{ dueBy: 'asc' }, { createdAt: 'asc' }],
        });

        if (!tasks.length) {
          await this.recordCronJobSuccess({
            hotelId: hotel.id,
            jobType: HOUSEKEEPING_FOLLOW_UP_SCAN_JOB_TYPE,
            enabled,
            runAtHour,
            runAtMinute,
            triggeredAt: reference,
          });
          hotelsProcessed += 1;
          continue;
        }

        const taskRows = tasks.map((task) => ({
          taskId: task.id,
          roomId: task.roomId,
          roomNumber: task.room.number,
          status: task.status,
          dueBy: task.dueBy,
          assignedTo: task.assignedTo,
          assignedToName:
            `${task.staff?.firstName ?? ''} ${task.staff?.lastName ?? ''}`.trim() || null,
          notes: task.notes ?? null,
        }));

        await this.notifications.dispatch({
          hotelId: hotel.id,
          event: 'housekeepingAlert',
          email: this.buildHousekeepingFollowUpEmail({
            hotelName: hotel.name,
            alertDate,
            graceHours,
            tasks: taskRows,
          }),
          inApp: this.buildHousekeepingFollowUpInAppNotification({
            alertDate,
            graceHours,
            tasks: taskRows,
          }),
        });

        await this.recordCronJobSuccess({
          hotelId: hotel.id,
          jobType: HOUSEKEEPING_FOLLOW_UP_SCAN_JOB_TYPE,
          enabled,
          runAtHour,
          runAtMinute,
          triggeredAt: reference,
        });

        tasksFlagged += taskRows.length;
        hotelsProcessed += 1;
      } catch (error) {
        hotelsFailed += 1;
        this.logger.error(`Housekeeping follow-up scan failed for hotel ${hotel.id}: ${String(error)}`);

        await this.recordCronJobFailure({
          hotelId: hotel.id,
          jobType: HOUSEKEEPING_FOLLOW_UP_SCAN_JOB_TYPE,
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
      tasksFlagged,
    };
  }

  async runNoShowFollowUpScanForDate(
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
          where: { jobType: NO_SHOW_FOLLOW_UP_SCAN_JOB_TYPE },
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

    let reservationsFlagged = 0;
    let hotelsProcessed = 0;
    let hotelsFailed = 0;

    for (const hotel of hotels) {
      const cronSetting = hotel.cronSettings[0];
      const enabled = cronSetting?.enabled ?? true;
      const runAtHour = cronSetting?.runAtHour ?? 20;
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
        const candidates = await this.prisma.reservation.findMany({
          where: {
            hotelId: hotel.id,
            status: { in: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED] },
          },
          select: {
            id: true,
            reservationNo: true,
            checkIn: true,
            status: true,
            guest: { select: { firstName: true, lastName: true } },
            room: { select: { number: true } },
          },
          orderBy: [{ checkIn: 'asc' }, { createdAt: 'asc' }],
        });

        const reservations = candidates
          .map((reservation) => {
            const localCheckInDate = getZonedDateParts(reservation.checkIn, timezone).date;
            const guestName =
              `${reservation.guest?.firstName ?? ''} ${reservation.guest?.lastName ?? ''}`.trim() ||
              'Guest';

            return {
              reservationId: reservation.id,
              reservationNo: reservation.reservationNo,
              guestName,
              roomNumber: reservation.room?.number ?? 'Unassigned',
              localCheckInDate,
              status: reservation.status,
              nightsSinceArrival: diffDaysBetweenLocalDates(localCheckInDate, alertDate),
            };
          })
          .filter(
            (reservation) =>
              reservation.localCheckInDate <= alertDate && reservation.nightsSinceArrival >= 0,
          );

        if (!reservations.length) {
          await this.recordCronJobSuccess({
            hotelId: hotel.id,
            jobType: NO_SHOW_FOLLOW_UP_SCAN_JOB_TYPE,
            enabled,
            runAtHour,
            runAtMinute,
            triggeredAt: reference,
          });
          hotelsProcessed += 1;
          continue;
        }

        await this.notifications.dispatch({
          hotelId: hotel.id,
          event: 'noShowFollowUp',
          email: this.buildNoShowFollowUpEmail({
            hotelName: hotel.name,
            alertDate,
            reservations,
          }),
          inApp: this.buildNoShowFollowUpInAppNotification({
            alertDate,
            reservations,
          }),
        });

        await this.recordCronJobSuccess({
          hotelId: hotel.id,
          jobType: NO_SHOW_FOLLOW_UP_SCAN_JOB_TYPE,
          enabled,
          runAtHour,
          runAtMinute,
          triggeredAt: reference,
        });

        reservationsFlagged += reservations.length;
        hotelsProcessed += 1;
      } catch (error) {
        hotelsFailed += 1;
        this.logger.error(`No-show follow-up scan failed for hotel ${hotel.id}: ${String(error)}`);

        await this.recordCronJobFailure({
          hotelId: hotel.id,
          jobType: NO_SHOW_FOLLOW_UP_SCAN_JOB_TYPE,
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
      reservationsFlagged,
    };
  }

  async runOverduePaymentScanForDate(
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
          where: { jobType: OVERDUE_PAYMENT_SCAN_JOB_TYPE },
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

    let reservationsFlagged = 0;
    let hotelsProcessed = 0;
    let hotelsFailed = 0;

    for (const hotel of hotels) {
      const cronSetting = hotel.cronSettings[0];
      const enabled = cronSetting?.enabled ?? true;
      const runAtHour = cronSetting?.runAtHour ?? 13;
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
        const candidates = await this.prisma.reservation.findMany({
          where: {
            hotelId: hotel.id,
            status: { in: [ReservationStatus.CHECKED_IN, ReservationStatus.CHECKED_OUT] },
            paymentStatus: { in: [PaymentStatus.UNPAID, PaymentStatus.PARTIAL] },
          },
          select: {
            id: true,
            reservationNo: true,
            checkOut: true,
            totalAmount: true,
            paidAmount: true,
            guest: { select: { firstName: true, lastName: true } },
            room: { select: { number: true } },
          },
          orderBy: [{ checkOut: 'asc' }, { createdAt: 'asc' }],
        });

        const reservations = candidates
          .map((reservation) => {
            const localCheckoutDate = getZonedDateParts(reservation.checkOut, timezone).date;
            const balance = Math.max(
              0,
              Number(reservation.totalAmount) - Number(reservation.paidAmount),
            );
            const guestName =
              `${reservation.guest?.firstName ?? ''} ${reservation.guest?.lastName ?? ''}`.trim() ||
              'Guest';

            return {
              reservationId: reservation.id,
              reservationNo: reservation.reservationNo,
              guestName,
              roomNumber: reservation.room?.number ?? 'Unassigned',
              localCheckoutDate,
              paidAmount: Number(reservation.paidAmount),
              totalAmount: Number(reservation.totalAmount),
              balance,
              daysOverdue: diffDaysBetweenLocalDates(localCheckoutDate, alertDate),
            };
          })
          .filter((reservation) => reservation.localCheckoutDate < alertDate && reservation.balance > 0);

        if (!reservations.length) {
          await this.recordCronJobSuccess({
            hotelId: hotel.id,
            jobType: OVERDUE_PAYMENT_SCAN_JOB_TYPE,
            enabled,
            runAtHour,
            runAtMinute,
            triggeredAt: reference,
          });
          hotelsProcessed += 1;
          continue;
        }

        const totalOutstanding = reservations.reduce((sum, reservation) => sum + reservation.balance, 0);

        await this.notifications.dispatch({
          hotelId: hotel.id,
          event: 'paymentOverdue',
          email: this.buildOverduePaymentSummaryEmail({
            hotelName: hotel.name,
            alertDate,
            overdueCount: reservations.length,
            totalOutstanding,
            reservations,
          }),
          inApp: this.buildOverduePaymentInAppNotification({
            alertDate,
            overdueCount: reservations.length,
            totalOutstanding,
            reservations,
          }),
        });

        const severeReservations = reservations.filter((reservation) => reservation.daysOverdue >= 7);
        if (severeReservations.length) {
          const managementRecipientIds = await this.getManagementRecipientIds(hotel.id);
          if (managementRecipientIds.length) {
            const oldestDaysOverdue = severeReservations.reduce(
              (max, reservation) => Math.max(max, reservation.daysOverdue),
              0,
            );
            const severeOutstanding = severeReservations.reduce(
              (sum, reservation) => sum + reservation.balance,
              0,
            );
            await this.notifications.dispatch({
              hotelId: hotel.id,
              event: 'systemAlerts',
              recipientUserIds: managementRecipientIds,
              email: this.buildCollectionsEscalationEmail({
                hotelName: hotel.name,
                alertDate,
                severeCount: severeReservations.length,
                oldestDaysOverdue,
                totalOutstanding: severeOutstanding,
              }),
              inApp: this.buildCollectionsEscalationInAppNotification({
                alertDate,
                severeCount: severeReservations.length,
                oldestDaysOverdue,
                totalOutstanding: severeOutstanding,
              }),
            });
          }
        }

        await this.recordCronJobSuccess({
          hotelId: hotel.id,
          jobType: OVERDUE_PAYMENT_SCAN_JOB_TYPE,
          enabled,
          runAtHour,
          runAtMinute,
          triggeredAt: reference,
        });

        reservationsFlagged += reservations.length;
        hotelsProcessed += 1;
      } catch (error) {
        hotelsFailed += 1;
        this.logger.error(`Overdue payment scan failed for hotel ${hotel.id}: ${String(error)}`);

        await this.recordCronJobFailure({
          hotelId: hotel.id,
          jobType: OVERDUE_PAYMENT_SCAN_JOB_TYPE,
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
      reservationsFlagged,
    };
  }

  async runUpcomingArrivalScanForDate(
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
          where: { jobType: UPCOMING_ARRIVAL_SCAN_JOB_TYPE },
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

    let reservationsFlagged = 0;
    let hotelsProcessed = 0;
    let hotelsFailed = 0;

    for (const hotel of hotels) {
      const cronSetting = hotel.cronSettings[0];
      const enabled = cronSetting?.enabled ?? true;
      const runAtHour = cronSetting?.runAtHour ?? 18;
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
        const tomorrowRef = new Date(reference);
        tomorrowRef.setDate(tomorrowRef.getDate() + 1);
        const arrivalDate = getZonedDateParts(tomorrowRef, timezone).date;

        const candidates = await this.prisma.reservation.findMany({
          where: {
            hotelId: hotel.id,
            status: { in: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED] },
          },
          select: {
            id: true,
            reservationNo: true,
            checkIn: true,
            totalAmount: true,
            adults: true,
            children: true,
            guest: { select: { firstName: true, lastName: true } },
            room: { select: { number: true } },
          },
          orderBy: [{ checkIn: 'asc' }, { createdAt: 'asc' }],
        });

        const reservations = candidates
          .map((reservation) => {
            const localCheckInDate = getZonedDateParts(reservation.checkIn, timezone).date;
            const guestName =
              `${reservation.guest?.firstName ?? ''} ${reservation.guest?.lastName ?? ''}`.trim() ||
              'Guest';

            return {
              reservationId: reservation.id,
              reservationNo: reservation.reservationNo,
              guestName,
              roomNumber: reservation.room?.number ?? 'Unassigned',
              checkIn: reservation.checkIn,
              localCheckInDate,
              totalAmount: Number(reservation.totalAmount),
              adults: reservation.adults,
              children: reservation.children,
            };
          })
          .filter((reservation) => reservation.localCheckInDate === arrivalDate);

        if (!reservations.length) {
          await this.recordCronJobSuccess({
            hotelId: hotel.id,
            jobType: UPCOMING_ARRIVAL_SCAN_JOB_TYPE,
            enabled,
            runAtHour,
            runAtMinute,
            triggeredAt: reference,
          });
          hotelsProcessed += 1;
          continue;
        }

        await this.notifications.dispatch({
          hotelId: hotel.id,
          event: 'upcomingArrival',
          email: this.buildUpcomingArrivalSummaryEmail({
            hotelName: hotel.name,
            alertDate,
            arrivalDate,
            arrivalCount: reservations.length,
            reservations,
          }),
          inApp: this.buildUpcomingArrivalInAppNotification({
            alertDate,
            arrivalDate,
            arrivalCount: reservations.length,
            reservations,
          }),
        });

        const unassignedReservations = reservations.filter(
          (reservation) => reservation.roomNumber === 'Unassigned',
        );
        if (unassignedReservations.length) {
          const managementRecipientIds = await this.getManagementRecipientIds(hotel.id);
          if (managementRecipientIds.length) {
            await this.notifications.dispatch({
              hotelId: hotel.id,
              event: 'systemAlerts',
              recipientUserIds: managementRecipientIds,
              email: this.buildRoomAssignmentReviewEmail({
                hotelName: hotel.name,
                arrivalDate,
                reservationCount: unassignedReservations.length,
              }),
              inApp: this.buildRoomAssignmentReviewInAppNotification({
                arrivalDate,
                reservationCount: unassignedReservations.length,
              }),
            });
          }
        }

        await this.recordCronJobSuccess({
          hotelId: hotel.id,
          jobType: UPCOMING_ARRIVAL_SCAN_JOB_TYPE,
          enabled,
          runAtHour,
          runAtMinute,
          triggeredAt: reference,
        });

        reservationsFlagged += reservations.length;
        hotelsProcessed += 1;
      } catch (error) {
        hotelsFailed += 1;
        this.logger.error(`Upcoming arrival scan failed for hotel ${hotel.id}: ${String(error)}`);

        await this.recordCronJobFailure({
          hotelId: hotel.id,
          jobType: UPCOMING_ARRIVAL_SCAN_JOB_TYPE,
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
      reservationsFlagged,
    };
  }

  async runDailyDigestScanForDate(
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
          where: { jobType: DAILY_DIGEST_SCAN_JOB_TYPE },
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

    let hotelsProcessed = 0;
    let hotelsFailed = 0;

    for (const hotel of hotels) {
      const cronSetting = hotel.cronSettings[0];
      const enabled = cronSetting?.enabled ?? true;
      const runAtHour = cronSetting?.runAtHour ?? 19;
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
        const tomorrowRef = new Date(reference);
        tomorrowRef.setDate(tomorrowRef.getDate() + 1);
        const nextArrivalDate = getZonedDateParts(tomorrowRef, timezone).date;

        const [
          arrivalCandidates,
          checkedInReservations,
          overduePaymentCandidates,
          openCheckoutPrepTasks,
          urgentMaintenanceOpen,
        ] = await Promise.all([
          this.prisma.reservation.findMany({
            where: {
              hotelId: hotel.id,
              status: { in: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED] },
            },
            select: { checkIn: true },
          }),
          this.prisma.reservation.findMany({
            where: {
              hotelId: hotel.id,
              status: ReservationStatus.CHECKED_IN,
            },
            select: { checkOut: true },
          }),
          this.prisma.reservation.findMany({
            where: {
              hotelId: hotel.id,
              status: { in: [ReservationStatus.CHECKED_IN, ReservationStatus.CHECKED_OUT] },
              paymentStatus: { in: [PaymentStatus.UNPAID, PaymentStatus.PARTIAL] },
            },
            select: { checkOut: true, totalAmount: true, paidAmount: true },
          }),
          this.prisma.housekeepingTask.count({
            where: {
              hotelId: hotel.id,
              type: 'CHECKOUT_PREP',
              status: { in: [TaskStatus.PENDING, TaskStatus.IN_PROGRESS] },
            },
          }),
          this.prisma.maintenanceRequest.count({
            where: {
              hotelId: hotel.id,
              priority: { in: ['HIGH', 'URGENT'] },
              status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'PENDING_PARTS'] },
            },
          }),
        ]);

        const arrivalsTomorrow = arrivalCandidates.filter(
          (reservation) => getZonedDateParts(reservation.checkIn, timezone).date === nextArrivalDate,
        ).length;
        const departuresToday = checkedInReservations.filter(
          (reservation) => getZonedDateParts(reservation.checkOut, timezone).date === alertDate,
        ).length;
        const overdueCheckouts = checkedInReservations.filter(
          (reservation) => getZonedDateParts(reservation.checkOut, timezone).date < alertDate,
        ).length;
        const overduePayments = overduePaymentCandidates.filter((reservation) => {
          const localCheckoutDate = getZonedDateParts(reservation.checkOut, timezone).date;
          const balance =
            Math.max(0, Number(reservation.totalAmount) - Number(reservation.paidAmount));
          return localCheckoutDate < alertDate && balance > 0;
        }).length;

        await this.notifications.dispatch({
          hotelId: hotel.id,
          event: 'dailyDigest',
          email: this.buildDailyDigestEmail({
            hotelName: hotel.name,
            alertDate,
            nextArrivalDate,
            arrivalsTomorrow,
            departuresToday,
            overdueCheckouts,
            overduePayments,
            openCheckoutPrepTasks,
            urgentMaintenanceOpen,
          }),
          inApp: this.buildDailyDigestInAppNotification({
            alertDate,
            nextArrivalDate,
            arrivalsTomorrow,
            departuresToday,
            overdueCheckouts,
            overduePayments,
            openCheckoutPrepTasks,
            urgentMaintenanceOpen,
          }),
        });

        await this.recordCronJobSuccess({
          hotelId: hotel.id,
          jobType: DAILY_DIGEST_SCAN_JOB_TYPE,
          enabled,
          runAtHour,
          runAtMinute,
          triggeredAt: reference,
        });
        hotelsProcessed += 1;
      } catch (error) {
        hotelsFailed += 1;
        this.logger.error(`Daily digest scan failed for hotel ${hotel.id}: ${String(error)}`);

        await this.recordCronJobFailure({
          hotelId: hotel.id,
          jobType: DAILY_DIGEST_SCAN_JOB_TYPE,
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
    };
  }

  // ── Add Folio Item ──────────────────────────────────────────────────────────
  async addFolioItem(
    hotelId: string,
    id: string,
    dto: { description: string; amount: number; category: string; quantity?: number },
  ) {
    await this.findOne(hotelId, id);
    const folioItem = await this.prisma.folioItem.create({
      data: {
        hotelId,
        reservationId: id,
        description: dto.description,
        amount: dto.amount,
        quantity: dto.quantity ?? 1,
        category: dto.category,
      },
    });

    await this.ledger.postFolioCharge(hotelId, {
      amount: Number(folioItem.amount),
      category: folioItem.category,
      description: folioItem.description,
      reservationId: folioItem.reservationId,
      folioItemId: folioItem.id,
    });

    return folioItem;
  }

  async getFolioItems(
    hotelId: string,
    reservationId: string,
    options: { limit?: number; cursor?: string } = {},
  ) {
    const reservation = await this.prisma.reservation.findFirst({
      where: { id: reservationId, hotelId },
      select: { id: true },
    });
    if (!reservation) throw new NotFoundException('Reservation not found.');

    const limit = Math.min(Math.max(options.limit ?? 20, 1), 100);
    const cursor = parseCursor(options.cursor);

    const items = await this.prisma.folioItem.findMany({
      where: {
        hotelId,
        reservationId,
        ...(cursor ? buildCursorWhere(cursor) : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit,
    });

    const nextCursor = items.length === limit ? buildCursor(items[items.length - 1]) : null;

    return { items, nextCursor };
  }

  // ── Payments ───────────────────────────────────────────────────────────────
  private async ensureReservationInvoice(tx: any, hotelId: string, reservation: any) {
    let invoice = await tx.invoice.findFirst({
      where: { hotelId, reservationId: reservation.id },
      orderBy: { issuedAt: 'desc' },
    });
    if (invoice) return invoice;

    const base = `INV-${reservation.reservationNo}`;
    let invoiceNo = base;
    let attempt = 1;
    while (await tx.invoice.findUnique({ where: { invoiceNo } })) {
      attempt += 1;
      if (attempt > 50) throw new ConflictException('Could not generate a unique invoice number.');
      invoiceNo = `${base}-${attempt}`;
    }

    invoice = await tx.invoice.create({
      data: {
        hotelId,
        reservationId: reservation.id,
        invoiceNo,
        issuedAt: new Date(),
        subtotal: reservation.totalAmount,
        tax: 0,
        discount: 0,
        total: reservation.totalAmount,
        paymentStatus: PaymentStatus.UNPAID,
        notes: reservation.notes ?? undefined,
      },
    });
    return invoice;
  }

  async recordPayment(
    hotelId: string,
    reservationId: string,
    dto: RecordPaymentDto,
    actorUserId?: string,
  ) {
    const result = await this.prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.findFirst({
        where: { id: reservationId, hotelId },
        include: { guest: true, room: true },
      });
      if (!reservation) throw new NotFoundException('Reservation not found.');

      const paidAgg = await tx.payment.aggregate({
        where: { invoice: { reservationId, hotelId } },
        _sum: { amount: true },
      });
      const alreadyPaid = Number(paidAgg._sum.amount ?? 0);
      const balance = Number(reservation.totalAmount) - alreadyPaid;
      if (dto.amount > balance)
        throw new BadRequestException('Amount exceeds outstanding balance.');

      const invoice = await this.ensureReservationInvoice(tx, hotelId, reservation);
      const payment = await tx.payment.create({
        data: {
          hotelId,
          invoiceId: invoice.id,
          amount: dto.amount,
          method: dto.method,
          reference: dto.reference,
          note: dto.note,
          paidAt: dto.paidAt ? new Date(dto.paidAt) : new Date(),
        },
      });

      const invoicePaidAgg = await tx.payment.aggregate({
        where: { invoiceId: invoice.id },
        _sum: { amount: true },
      });
      const invoicePaid = Number(invoicePaidAgg._sum.amount ?? 0);
      const invoiceStatus =
        invoicePaid >= Number(invoice.total)
          ? PaymentStatus.PAID
          : invoicePaid > 0
            ? PaymentStatus.PARTIAL
            : PaymentStatus.UNPAID;
      await tx.invoice.update({
        where: { id: invoice.id },
        data: { paymentStatus: invoiceStatus },
      });

      const totalPaidAgg = await tx.payment.aggregate({
        where: { invoice: { reservationId, hotelId } },
        _sum: { amount: true },
      });
      const totalPaid = Number(totalPaidAgg._sum.amount ?? 0);
      const resPaymentStatus =
        totalPaid >= Number(reservation.totalAmount)
          ? PaymentStatus.PAID
          : totalPaid > 0
            ? PaymentStatus.PARTIAL
            : PaymentStatus.UNPAID;

      const updatedReservation = await tx.reservation.update({
        where: { id: reservation.id },
        data: { paidAmount: totalPaid, paymentStatus: resPaymentStatus },
        include: RESERVATION_INCLUDE as any,
      });

      return { payment, reservation: updatedReservation };
    });

    await this.ledger.postPayment(hotelId, {
      amount: Number(result.payment.amount),
      method: result.payment.method,
      description: `Reservation payment — ${result.reservation.reservationNo}`,
      invoiceId: result.payment.invoiceId,
      paymentId: result.payment.id,
    });

    const hotel = await this.prisma.hotel.findUnique({
      where: { id: hotelId },
      select: { name: true },
    });

    const reservationDetails = result.reservation as any;
    const guestName =
      `${reservationDetails.guest?.firstName ?? ''} ${reservationDetails.guest?.lastName ?? ''}`.trim() ||
      'Guest';

    try {
      const balance = Math.max(
        0,
        Number(result.reservation.totalAmount) - Number(result.reservation.paidAmount),
      );

      await this.notifications.dispatch({
        hotelId,
        event: 'paymentReceived',
        excludeEmailUserIds: actorUserId ? [actorUserId] : undefined,
        email: this.buildPaymentReceivedNotificationEmail({
          hotelName: hotel?.name ?? 'HotelOS',
          reservationNo: result.reservation.reservationNo,
          guestName,
          roomNumber: reservationDetails.room?.number ?? 'Unassigned',
          amount: Number(result.payment.amount),
          method: result.payment.method,
          reference: result.payment.reference,
          paidAt: result.payment.paidAt,
          paidAmount: Number(result.reservation.paidAmount),
          balance,
        }),
        inApp: this.buildPaymentReceivedInAppNotification({
          reservationId: result.reservation.id,
          reservationNo: result.reservation.reservationNo,
          guestName,
          amount: Number(result.payment.amount),
          method: result.payment.method,
          balance,
        }),
      });
    } catch (error) {
      this.logger.warn(
        `Failed to dispatch paymentReceived notification for ${result.reservation.reservationNo}: ${String(error)}`,
      );
    }

    return result;
  }

  async getPaymentReceiptHtml(hotelId: string, reservationId: string, paymentId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, invoice: { reservationId, hotelId } },
      include: {
        invoice: {
          include: {
            reservation: {
              include: { guest: true, room: true },
            },
          },
        },
      },
    });
    if (!payment) throw new NotFoundException('Payment not found.');

    const reservation = payment.invoice.reservation;
    const guestName =
      `${reservation?.guest?.firstName ?? ''} ${reservation?.guest?.lastName ?? ''}`.trim();
    const paidAt = payment.paidAt.toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const printedAt = new Date().toLocaleString('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const html = await compileTemplate('payment-receipt', {
      reservationNo: reservation?.reservationNo ?? '—',
      receiptId: payment.id ?? '—',
      guestName,
      roomNumber: reservation?.room?.number ?? '—',
      stayRange: `${reservation?.checkIn ? fmtDate(reservation.checkIn) : '—'} → ${
        reservation?.checkOut ? fmtDate(reservation.checkOut) : '—'
      }`,
      paidAt,
      paymentMethod: payment.method ?? '—',
      paymentReference: payment.reference ?? '',
      paymentNote: payment.note ?? '',
      amount: fmtMoney(Number(payment.amount)),
      printedAt,
    });

    return html;
  }
}

function fmtMoney(n: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtDate(value: Date) {
  return new Date(value).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
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
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(new Date(value));
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    date: `${map.year}-${map.month}-${map.day}`,
    hour: Number(map.hour ?? 0),
    minute: Number(map.minute ?? 0),
    second: Number(map.second ?? 0),
  };
}

function diffDaysBetweenLocalDates(fromDate: string, toDate: string) {
  const [fromYear, fromMonth, fromDay] = fromDate.split('-').map(Number);
  const [toYear, toMonth, toDay] = toDate.split('-').map(Number);
  const fromMs = Date.UTC(fromYear, fromMonth - 1, fromDay);
  const toMs = Date.UTC(toYear, toMonth - 1, toDay);
  return Math.round((toMs - fromMs) / 86_400_000);
}
