import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../../prisma/prisma.service';
import { buildCursor, buildCursorWhere, parseCursor } from 'src/common/utils/cursor.utils';
import { IssueKeycardDto } from '../dtos/issue-keycard.dto';
import { RevokeKeycardDto } from '../dtos/revoke-keycard.dto';
import { IngestKeycardAccessEventDto } from '../dtos/ingest-keycard-access-event.dto';
import {
  KEYCARD_ACCESS_METHODS,
  KEYCARD_ACTIVE_RESERVATION_STATUSES,
} from '../constants/keycard.constants';
import { LockProviderFactory } from '../providers/lock-provider.factory';

type AuditMeta = {
  ipAddress?: string | null;
  userAgent?: string | null;
};

@Injectable()
export class KeycardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lockProviderFactory: LockProviderFactory,
  ) {}

  private async assertFeatureEnabled(hotelId: string) {
    const [hotel, feature] = await Promise.all([
      (this.prisma.hotel as any).findUnique({
        where: { id: hotelId },
        select: {
          id: true,
          keycardAuthEnabled: true,
          lockVendor: true,
          lockApiKey: true,
          lockApiConfig: true,
        },
      }),
      this.prisma.featureFlag.findUnique({
        where: { key: 'keycard_auth' },
        select: { key: true, enabled: true },
      }),
    ]);

    if (!hotel) {
      throw new NotFoundException('Hotel not found.');
    }

    if (feature && feature.enabled === false) {
      throw new ForbiddenException('Keycard auth is not enabled.');
    }

    if (hotel.keycardAuthEnabled !== true) {
      throw new ForbiddenException('Keycard auth is not enabled for this hotel.');
    }

    return hotel;
  }

  private async getReservationContext(hotelId: string, reservationId: string) {
    const reservation = await this.prisma.reservation.findFirst({
      where: { id: reservationId, hotelId },
      include: {
        room: true,
        guest: true,
        guests: {
          include: {
            guest: true,
          },
        },
      },
    });

    if (!reservation) {
      throw new NotFoundException('Reservation not found.');
    }

    return reservation;
  }

  private async runDbTransaction<T>(work: (tx: any) => Promise<T>) {
    const prismaWithTransaction = this.prisma as any;
    if (typeof prismaWithTransaction.$transaction === 'function') {
      return prismaWithTransaction.$transaction(work);
    }

    return work(prismaWithTransaction);
  }

  private deriveAccessResultForKnownKeycard(keycard: any, occurredAt: Date) {
    if (keycard.status === 'PENDING' || keycard.status === 'FAILED') {
      return 'UNKNOWN';
    }

    if (keycard.status === 'REVOKED' || keycard.status === 'LOST') {
      return keycard.status;
    }

    if (occurredAt.getTime() > new Date(keycard.validUntil).getTime()) {
      return 'EXPIRED';
    }

    return 'GRANTED';
  }

  async listByReservation(hotelId: string, reservationId: string) {
    await this.assertFeatureEnabled(hotelId);
    await this.getReservationContext(hotelId, reservationId);

    const keycards = await (this.prisma as any).keycard.findMany({
      where: { hotelId, reservationId },
      orderBy: [{ createdAt: 'desc' }],
      include: {
        guest: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        room: {
          select: {
            id: true,
            number: true,
            lockDeviceId: true,
            lockVendor: true,
          },
        },
      },
    });

    return { keycards };
  }

  async getLogs(
    hotelId: string,
    keycardId: string,
    options: { limit?: number; cursor?: string } = {},
  ) {
    await this.assertFeatureEnabled(hotelId);

    const keycard = await (this.prisma as any).keycard.findFirst({
      where: { id: keycardId, hotelId },
      select: { id: true, accessToken: true },
    });
    if (!keycard) {
      throw new NotFoundException('Keycard not found.');
    }

    const limit = Math.min(Math.max(options.limit ?? 20, 1), 100);
    const cursor = parseCursor(options.cursor);

    const logs = await (this.prisma as any).keycardAccessLog.findMany({
      where: {
        OR: [{ keycardId }, { hotelId, accessToken: keycard.accessToken }],
        ...(cursor ? buildCursorWhere(cursor) : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit,
    });

    const nextCursor = logs.length === limit ? buildCursor(logs[logs.length - 1]) : null;

    return { logs, nextCursor };
  }

  async issue(hotelId: string, actorUserId: string, issuedByStaffId: string | null, dto: IssueKeycardDto, meta: AuditMeta) {
    const hotel = await this.assertFeatureEnabled(hotelId);
    const reservation = await this.getReservationContext(hotelId, dto.reservationId);

    if (!KEYCARD_ACTIVE_RESERVATION_STATUSES.includes(reservation.status as any)) {
      throw new BadRequestException(
        'Keycards can only be prepared for confirmed stays or issued to checked-in stays.',
      );
    }

    if (reservation.roomId !== dto.roomId) {
      throw new BadRequestException('Room does not match reservation.');
    }

    const room = reservation.room;
    if (!room.lockDeviceId) {
      throw new BadRequestException('Room lock mapping is missing for this room.');
    }

    if (dto.guestId) {
      const guestAllowed =
        reservation.guestId === dto.guestId ||
        reservation.guests.some((entry: any) => entry.guestId === dto.guestId);
      if (!guestAllowed) {
        throw new BadRequestException('Guest is not attached to this reservation.');
      }
    }

    const scheduledCheckIn = new Date(reservation.checkIn);
    const reservationCheckOut = new Date(reservation.checkOut);
    const requestedValidFrom = dto.validFrom ? new Date(dto.validFrom) : null;
    const validFrom =
      requestedValidFrom ??
      (reservation.status === 'CHECKED_IN' ? new Date() : scheduledCheckIn);
    const validUntil = dto.validUntil ? new Date(dto.validUntil) : reservationCheckOut;

    if (Number.isNaN(validFrom.getTime()) || Number.isNaN(validUntil.getTime())) {
      throw new BadRequestException('Invalid keycard validity window.');
    }

    if (validFrom.getTime() < scheduledCheckIn.getTime()) {
      throw new BadRequestException(
        'Keycard validFrom cannot be earlier than the reservation check-in time.',
      );
    }

    if (validUntil.getTime() <= validFrom.getTime()) {
      throw new BadRequestException('Keycard validUntil must be after validFrom.');
    }

    if (validUntil.getTime() > reservationCheckOut.getTime()) {
      throw new BadRequestException(
        'Keycard validUntil cannot exceed the reservation checkout time.',
      );
    }

    const existingActiveKeycard = await (this.prisma as any).keycard.findFirst({
      where: {
        hotelId,
        reservationId: reservation.id,
        guestId: dto.guestId ?? null,
        status: {
          in: ['PENDING', 'ACTIVE'],
        },
      },
      select: { id: true },
    });

    if (existingActiveKeycard) {
      throw new ConflictException('An active keycard already exists for this guest.');
    }

    const accessToken = randomBytes(32).toString('hex');
    const assignedGuest = dto.guestId
      ? dto.guestId === reservation.guestId
        ? reservation.guest
        : reservation.guests.find((entry: any) => entry.guestId === dto.guestId)?.guest
      : undefined;
    const provider = this.lockProviderFactory.resolve(room.lockVendor ?? hotel.lockVendor ?? 'MOCK');
    const guestName = assignedGuest
      ? `${assignedGuest.firstName} ${assignedGuest.lastName}`.trim()
      : `${reservation.guest.firstName} ${reservation.guest.lastName}`.trim();

    const pendingKeycard = await (this.prisma as any).keycard.create({
      data: {
        hotelId,
        reservationId: reservation.id,
        roomId: reservation.roomId,
        guestId: dto.guestId ?? null,
        cardUid: dto.cardUid ?? null,
        accessToken,
        type: dto.type ?? 'PHYSICAL',
        status: 'PENDING',
        validFrom,
        validUntil,
        issuedByStaffId,
      },
    });

    try {
      await provider.issueKey({
        hotelId,
        reservationId: reservation.id,
        roomId: reservation.roomId,
        accessToken,
        lockDeviceId: room.lockDeviceId,
        validFrom,
        validUntil,
        guestName,
      });
    } catch (error) {
      await (this.prisma as any).keycard.update({
        where: { id: pendingKeycard.id },
        data: {
          status: 'FAILED',
        },
      });

      await this.prisma.auditLog.create({
        data: {
          hotelId,
          actorUserId,
          action: 'keycard.issue_failed',
          targetType: 'KEYCARD',
          targetId: pendingKeycard.id,
          ipAddress: meta.ipAddress ?? null,
          userAgent: meta.userAgent ?? null,
          metadata: {
            reservationId: reservation.id,
            reservationNo: reservation.reservationNo,
            roomId: reservation.roomId,
            roomNumber: reservation.room.number,
            guestId: dto.guestId ?? null,
            type: dto.type ?? 'PHYSICAL',
            stage: 'provider_issue',
            error: error instanceof Error ? error.message : 'Unknown provider error',
          },
        },
      });

      throw error;
    }

    try {
      const keycard = await this.runDbTransaction(async (tx) => {
        const activatedKeycard = await tx.keycard.update({
          where: { id: pendingKeycard.id },
          data: {
            status: 'ACTIVE',
          },
        });

        await tx.auditLog.create({
          data: {
            hotelId,
            actorUserId,
            action: 'keycard.issue',
            targetType: 'KEYCARD',
            targetId: activatedKeycard.id,
            ipAddress: meta.ipAddress ?? null,
            userAgent: meta.userAgent ?? null,
            metadata: {
              reservationId: reservation.id,
              reservationNo: reservation.reservationNo,
              roomId: reservation.roomId,
              roomNumber: reservation.room.number,
              guestId: dto.guestId ?? null,
              type: dto.type ?? 'PHYSICAL',
              validFrom: validFrom.toISOString(),
              validUntil: validUntil.toISOString(),
            },
          },
        });

        return activatedKeycard;
      });

      return keycard;
    } catch (error) {
      try {
        await provider.revokeKey(accessToken, room.lockDeviceId);
      } catch {
        // Best-effort rollback of external access if persistence after provisioning fails.
      }

      await (this.prisma as any).keycard.update({
        where: { id: pendingKeycard.id },
        data: {
          status: 'FAILED',
        },
      });

      await this.prisma.auditLog.create({
        data: {
          hotelId,
          actorUserId,
          action: 'keycard.issue_failed',
          targetType: 'KEYCARD',
          targetId: pendingKeycard.id,
          ipAddress: meta.ipAddress ?? null,
          userAgent: meta.userAgent ?? null,
          metadata: {
            reservationId: reservation.id,
            reservationNo: reservation.reservationNo,
            roomId: reservation.roomId,
            roomNumber: reservation.room.number,
            guestId: dto.guestId ?? null,
            type: dto.type ?? 'PHYSICAL',
            stage: 'activate_record',
            error: error instanceof Error ? error.message : 'Unknown persistence error',
          },
        },
      });

      throw error;
    }
  }

  async revoke(
    hotelId: string,
    actorUserId: string,
    keycardId: string,
    dto: RevokeKeycardDto,
    meta: AuditMeta,
  ) {
    const hotel = await this.assertFeatureEnabled(hotelId);
    const keycard = await (this.prisma as any).keycard.findFirst({
      where: { id: keycardId, hotelId },
      include: {
        room: {
          select: {
            number: true,
            lockDeviceId: true,
            lockVendor: true,
          },
        },
        reservation: {
          select: {
            id: true,
            reservationNo: true,
          },
        },
      },
    });

    if (!keycard) {
      throw new NotFoundException('Keycard not found.');
    }

    if (keycard.status === 'FAILED' || keycard.status === 'REVOKED' || keycard.status === 'LOST') {
      throw new BadRequestException('Keycard is already inactive.');
    }

    if (keycard.status === 'ACTIVE' && keycard.room?.lockDeviceId) {
      const provider = this.lockProviderFactory.resolve(
        keycard.room.lockVendor ?? hotel.lockVendor ?? 'MOCK',
      );
      await provider.revokeKey(keycard.accessToken, keycard.room.lockDeviceId);
    }

    const revoked = await (this.prisma as any).keycard.update({
      where: { id: keycardId },
      data: {
        status: 'REVOKED',
        revokedAt: new Date(),
        revokedReason: dto.reason?.trim() || 'manual_revoke',
      },
    });

    await this.prisma.auditLog.create({
      data: {
        hotelId,
        actorUserId,
        action: 'keycard.revoke',
        targetType: 'KEYCARD',
        targetId: revoked.id,
        ipAddress: meta.ipAddress ?? null,
        userAgent: meta.userAgent ?? null,
        metadata: {
          reservationId: keycard.reservation.id,
          reservationNo: keycard.reservation.reservationNo,
          roomNumber: keycard.room?.number ?? null,
          reason: dto.reason?.trim() || 'manual_revoke',
        },
      },
    });

    return revoked;
  }

  async reportLost(
    hotelId: string,
    actorUserId: string,
    keycardId: string,
    dto: RevokeKeycardDto,
    meta: AuditMeta,
  ) {
    const hotel = await this.assertFeatureEnabled(hotelId);
    const keycard = await (this.prisma as any).keycard.findFirst({
      where: { id: keycardId, hotelId },
      include: {
        room: {
          select: {
            number: true,
            lockDeviceId: true,
            lockVendor: true,
          },
        },
        reservation: {
          select: {
            id: true,
            reservationNo: true,
          },
        },
      },
    });

    if (!keycard) {
      throw new NotFoundException('Keycard not found.');
    }

    if (keycard.status === 'LOST') {
      throw new BadRequestException('Keycard is already marked as lost.');
    }

    if (keycard.status === 'FAILED') {
      throw new BadRequestException('Failed keycards cannot be marked as lost.');
    }

    if (keycard.status === 'REVOKED') {
      throw new BadRequestException('Revoked keycards cannot be marked as lost.');
    }

    if (keycard.status === 'ACTIVE' && keycard.room?.lockDeviceId) {
      const provider = this.lockProviderFactory.resolve(
        keycard.room.lockVendor ?? hotel.lockVendor ?? 'MOCK',
      );
      await provider.revokeKey(keycard.accessToken, keycard.room.lockDeviceId);
    }

    const reason = dto.reason?.trim() || 'reported_lost';
    const lost = await (this.prisma as any).keycard.update({
      where: { id: keycardId },
      data: {
        status: 'LOST',
        revokedAt: new Date(),
        revokedReason: reason,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        hotelId,
        actorUserId,
        action: 'keycard.report_lost',
        targetType: 'KEYCARD',
        targetId: lost.id,
        ipAddress: meta.ipAddress ?? null,
        userAgent: meta.userAgent ?? null,
        metadata: {
          reservationId: keycard.reservation.id,
          reservationNo: keycard.reservation.reservationNo,
          roomNumber: keycard.room?.number ?? null,
          reason,
        },
      },
    });

    return lost;
  }

  async revokeAllForReservation(
    hotelId: string,
    actorUserId: string,
    reservationId: string,
    dto: RevokeKeycardDto,
    meta: AuditMeta,
  ) {
    const hotel = await this.assertFeatureEnabled(hotelId);
    const reservation = await this.getReservationContext(hotelId, reservationId);
    const keycards = await (this.prisma as any).keycard.findMany({
      where: {
        hotelId,
        reservationId,
        status: {
          notIn: ['FAILED', 'REVOKED', 'LOST'],
        },
      },
      include: {
        room: {
          select: {
            lockDeviceId: true,
            lockVendor: true,
          },
        },
      },
    });

    const reason = dto.reason?.trim() || 'reservation_revoke_all';

    for (const keycard of keycards) {
      if (keycard.status !== 'ACTIVE') continue;
      if (!keycard.room?.lockDeviceId) continue;
      const provider = this.lockProviderFactory.resolve(
        keycard.room.lockVendor ?? hotel.lockVendor ?? 'MOCK',
      );
      await provider.revokeKey(keycard.accessToken, keycard.room.lockDeviceId);
    }

    await (this.prisma as any).keycard.updateMany({
      where: {
        hotelId,
        reservationId,
        status: {
          notIn: ['FAILED', 'REVOKED', 'LOST'],
        },
      },
      data: {
        status: 'REVOKED',
        revokedAt: new Date(),
        revokedReason: reason,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        hotelId,
        actorUserId,
        action: 'keycard.revoke_all',
        targetType: 'RESERVATION',
        targetId: reservation.id,
        ipAddress: meta.ipAddress ?? null,
        userAgent: meta.userAgent ?? null,
        metadata: {
          reservationNo: reservation.reservationNo,
          keycardCount: keycards.length,
          reason,
        },
      },
    });

    return this.listByReservation(hotelId, reservationId);
  }

  async ingestAccessEvent(
    hotelId: string,
    actorUserId: string,
    dto: IngestKeycardAccessEventDto,
    meta: AuditMeta,
  ) {
    await this.assertFeatureEnabled(hotelId);

    const occurredAt = dto.occurredAt ? new Date(dto.occurredAt) : new Date();
    if (Number.isNaN(occurredAt.getTime())) {
      throw new BadRequestException('Invalid occurredAt timestamp.');
    }

    const keycard = await (this.prisma as any).keycard.findFirst({
      where: {
        accessToken: dto.accessToken,
      },
      include: {
        room: {
          select: {
            id: true,
          },
        },
      },
    });

    if (keycard && keycard.hotelId !== hotelId) {
      throw new ForbiddenException('Keycard access token does not belong to this hotel.');
    }

    const inferredResult = keycard
      ? this.deriveAccessResultForKnownKeycard(keycard, occurredAt)
      : 'UNKNOWN';
    const result = dto.result ?? inferredResult;
    const log = await (this.prisma as any).keycardAccessLog.create({
      data: {
        hotelId: keycard?.hotelId ?? hotelId ?? null,
        keycardId: keycard?.id ?? null,
        roomId: keycard?.roomId ?? null,
        accessToken: dto.accessToken,
        result,
        reason: dto.reason ?? null,
        method: dto.method ?? KEYCARD_ACCESS_METHODS[4],
        deviceId: dto.deviceId ?? null,
        vendorEventId: dto.vendorEventId ?? null,
        ipAddress: meta.ipAddress ?? null,
        createdAt: occurredAt,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        hotelId: keycard?.hotelId ?? hotelId,
        actorUserId,
        action: 'keycard.access_event_ingest',
        targetType: 'KEYCARD_ACCESS_LOG',
        targetId: log.id,
        ipAddress: meta.ipAddress ?? null,
        userAgent: meta.userAgent ?? null,
        metadata: {
          keycardId: keycard?.id ?? null,
          roomId: keycard?.roomId ?? null,
          result,
          method: dto.method ?? KEYCARD_ACCESS_METHODS[4],
          vendorEventId: dto.vendorEventId ?? null,
        },
      },
    });

    return log;
  }
}
