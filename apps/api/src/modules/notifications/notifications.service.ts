import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { DEFAULT_ROLE_PERMISSIONS } from '../../common/constants/role-permissions';
import { Role } from '@prisma/client';
import { EmailService } from '../../common/email/email.service';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  NOTIFICATION_EVENT_PERMISSIONS,
  type NotificationEvent,
} from './notifications.constants';

type PreferenceDto = {
  event: NotificationEvent;
  channelEmail: boolean;
  channelInApp: boolean;
  channelPush: boolean;
};

type NotificationEmailContent = {
  subject: string;
  html: string;
  text?: string;
};

type NotificationInAppContent = {
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
};

type DispatchNotificationOptions = {
  hotelId: string;
  event: NotificationEvent;
  recipientUserIds?: string[];
  excludeUserIds?: string[];
  excludeEmailUserIds?: string[];
  excludeInAppUserIds?: string[];
  excludePushUserIds?: string[];
  email?: NotificationEmailContent;
  inApp?: NotificationInAppContent;
};

type ResolvedPreference = {
  channelEmail: boolean;
  channelInApp: boolean;
  channelPush: boolean;
};

type DispatchNotificationResult = {
  event: NotificationEvent;
  hotelId: string;
  totalCandidates: number;
  totalRecipients: number;
  email: {
    eligible: number;
    sent: number;
    failed: number;
    skipped: number;
  };
  inApp: {
    eligible: number;
    dispatched: number;
    skipped: number;
  };
  push: {
    eligible: number;
    dispatched: number;
    skipped: number;
  };
};

type NotificationRow = {
  id: string;
  userId: string;
  hotelId: string;
  event: string;
  title: string;
  message: string;
  metadata: Record<string, unknown> | null;
  readAt: Date | null;
  createdAt: Date;
};

type NotificationCountRow = {
  count: bigint;
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  private async getRolePermissions(hotelId: string | null, role: Role): Promise<string[]> {
    if (!hotelId) return DEFAULT_ROLE_PERMISSIONS[role] ?? [];
    const existing = await this.prisma.rolePermission.findUnique({
      where: { hotelId_role: { hotelId, role } },
    });
    if (existing) return existing.permissions ?? [];

    const defaults = DEFAULT_ROLE_PERMISSIONS[role] ?? [];
    await this.prisma.rolePermission.create({
      data: { hotelId, role, permissions: defaults },
    });
    return defaults;
  }

  private async getAllowedEvents(userId: string, hotelId: string | null) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, permissionGrants: true, permissionDenies: true },
    });
    if (!user) return [] as NotificationEvent[];

    const base = new Set(await this.getRolePermissions(hotelId, user.role));
    (user.permissionGrants ?? []).forEach((p) => base.add(p));
    (user.permissionDenies ?? []).forEach((p) => base.delete(p));

    return (Object.keys(NOTIFICATION_EVENT_PERMISSIONS) as NotificationEvent[]).filter((evt) =>
      base.has(NOTIFICATION_EVENT_PERMISSIONS[evt]),
    );
  }

  private async getRolePermissionsMap(hotelId: string) {
    const existing = await this.prisma.rolePermission.findMany({
      where: { hotelId },
      select: { role: true, permissions: true },
    });

    const byRole = new Map<Role, string[]>();
    for (const row of existing) {
      byRole.set(row.role, row.permissions ?? []);
    }

    return byRole;
  }

  private getAllowedEventsForUser(
    user: { role: Role; permissionGrants: string[]; permissionDenies: string[] },
    rolePermissionsByRole: Map<Role, string[]>,
  ) {
    const base = new Set(
      rolePermissionsByRole.get(user.role) ?? DEFAULT_ROLE_PERMISSIONS[user.role] ?? [],
    );
    (user.permissionGrants ?? []).forEach((permission) => base.add(permission));
    (user.permissionDenies ?? []).forEach((permission) => base.delete(permission));

    return (Object.keys(NOTIFICATION_EVENT_PERMISSIONS) as NotificationEvent[]).filter((evt) =>
      base.has(NOTIFICATION_EVENT_PERMISSIONS[evt]),
    );
  }

  private resolvePreference(
    event: NotificationEvent,
    row?: {
      channelEmail: boolean;
      channelInApp: boolean;
      channelPush: boolean;
    } | null,
  ): ResolvedPreference {
    const defaults = DEFAULT_NOTIFICATION_PREFERENCES[event];
    return {
      channelEmail: row?.channelEmail ?? defaults.channelEmail,
      channelInApp: row?.channelInApp ?? defaults.channelInApp,
      channelPush: row?.channelPush ?? defaults.channelPush,
    };
  }

  private mapNotificationRow(row: NotificationRow) {
    return {
      id: row.id,
      userId: row.userId,
      hotelId: row.hotelId,
      event: row.event,
      title: row.title,
      message: row.message,
      metadata: row.metadata,
      readAt: row.readAt,
      createdAt: row.createdAt,
    };
  }

  async dispatch(options: DispatchNotificationOptions): Promise<DispatchNotificationResult> {
    const eventPermission = NOTIFICATION_EVENT_PERMISSIONS[options.event];
    const candidateUsers = await this.prisma.user.findMany({
      where: {
        isActive: true,
        staff: {
          hotelId: options.hotelId,
        },
        ...(options.recipientUserIds?.length
          ? { id: { in: options.recipientUserIds } }
          : {}),
        ...(options.excludeUserIds?.length
          ? { id: { notIn: options.excludeUserIds } }
          : {}),
      },
      select: {
        id: true,
        email: true,
        role: true,
        permissionGrants: true,
        permissionDenies: true,
        staff: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!candidateUsers.length) {
      return {
        event: options.event,
        hotelId: options.hotelId,
        totalCandidates: 0,
        totalRecipients: 0,
        email: { eligible: 0, sent: 0, failed: 0, skipped: 0 },
        inApp: { eligible: 0, dispatched: 0, skipped: 0 },
        push: { eligible: 0, dispatched: 0, skipped: 0 },
      };
    }

    const rolePermissionsByRole = await this.getRolePermissionsMap(options.hotelId);
    const recipients = candidateUsers.filter((user) => {
      const allowedEvents = this.getAllowedEventsForUser(user, rolePermissionsByRole);
      return allowedEvents.includes(options.event) && Boolean(eventPermission);
    });

    if (!recipients.length) {
      return {
        event: options.event,
        hotelId: options.hotelId,
        totalCandidates: candidateUsers.length,
        totalRecipients: 0,
        email: { eligible: 0, sent: 0, failed: 0, skipped: 0 },
        inApp: { eligible: 0, dispatched: 0, skipped: 0 },
        push: { eligible: 0, dispatched: 0, skipped: 0 },
      };
    }

    const preferenceRows = await this.prisma.notificationPreference.findMany({
      where: {
        userId: { in: recipients.map((user) => user.id) },
        event: options.event,
      },
      select: {
        userId: true,
        channelEmail: true,
        channelInApp: true,
        channelPush: true,
      },
    });

    const preferencesByUserId = new Map(preferenceRows.map((row) => [row.userId, row]));
    const resolvedRecipients = recipients.map((user) => ({
      ...user,
      preferences: this.resolvePreference(options.event, preferencesByUserId.get(user.id)),
    }));

    const emailEligibleRecipients = options.email
      ? resolvedRecipients.filter(
          (user) =>
            user.preferences.channelEmail &&
            !(options.excludeEmailUserIds ?? []).includes(user.id),
        )
      : [];
    const inAppEligibleRecipients = options.inApp
      ? resolvedRecipients.filter(
          (user) =>
            user.preferences.channelInApp &&
            !(options.excludeInAppUserIds ?? []).includes(user.id),
        )
      : [];

    let emailSent = 0;
    let emailFailed = 0;
    let inAppDispatched = 0;

    if (options.email && emailEligibleRecipients.length) {
      const emailResults = await Promise.allSettled(
        emailEligibleRecipients.map((user) =>
          this.emailService.sendEmail({
            to: user.email,
            subject: options.email!.subject,
            html: options.email!.html,
            text: options.email!.text,
            hotelId: options.hotelId,
            event: options.event,
            metadata: options.inApp?.metadata,
          }),
        ),
      );

      for (const [index, result] of emailResults.entries()) {
        if (result.status === 'fulfilled' && result.value.sent) {
          emailSent += 1;
          continue;
        }

        emailFailed += 1;
        const failedUser = emailEligibleRecipients[index];
        const reason =
          result.status === 'rejected'
            ? result.reason
            : `provider returned sent=${String(result.value.sent)}`;
        this.logger.warn(
          `Notification email failed for event ${options.event} to ${failedUser.email}: ${String(reason)}`,
        );
      }
    }

    if (options.inApp && inAppEligibleRecipients.length) {
      await this.prisma.$transaction(
        inAppEligibleRecipients.map((user) =>
          this.prisma.$executeRaw`
            INSERT INTO "Notification" ("id", "userId", "hotelId", "event", "title", "message", "metadata")
            VALUES (
              ${randomUUID()},
              ${user.id},
              ${options.hotelId},
              ${options.event},
              ${options.inApp!.title},
              ${options.inApp!.message},
              ${options.inApp!.metadata ? JSON.stringify(options.inApp!.metadata) : null}::jsonb
            )
          `,
        ),
      );
      inAppDispatched = inAppEligibleRecipients.length;
    }

    const inAppEligible = inAppEligibleRecipients.length;
    const pushEligible = resolvedRecipients.filter(
      (user) =>
        user.preferences.channelPush && !(options.excludePushUserIds ?? []).includes(user.id),
    ).length;

    return {
      event: options.event,
      hotelId: options.hotelId,
      totalCandidates: candidateUsers.length,
      totalRecipients: resolvedRecipients.length,
      email: {
        eligible: emailEligibleRecipients.length,
        sent: emailSent,
        failed: emailFailed,
        skipped: resolvedRecipients.length - emailEligibleRecipients.length,
      },
      inApp: {
        eligible: inAppEligible,
        dispatched: inAppDispatched,
        skipped: inAppEligible - inAppDispatched,
      },
      push: {
        eligible: pushEligible,
        dispatched: 0,
        skipped: pushEligible,
      },
    };
  }

  async listPreferences(userId: string, hotelId: string | null) {
    const allowed = await this.getAllowedEvents(userId, hotelId);
    if (!allowed.length) return [];

    const rows = await this.prisma.notificationPreference.findMany({
      where: { userId, event: { in: allowed } },
    });

    const byEvent = new Map(rows.map((r) => [r.event, r]));

    return allowed.map((event) => {
      const defaults = DEFAULT_NOTIFICATION_PREFERENCES[event];
      const row = byEvent.get(event);
      return {
        event,
        channelEmail: row?.channelEmail ?? defaults.channelEmail,
        channelInApp: row?.channelInApp ?? defaults.channelInApp,
        channelPush: row?.channelPush ?? defaults.channelPush,
      };
    });
  }

  async updatePreferences(
    userId: string,
    hotelId: string | null,
    preferences: PreferenceDto[],
  ) {
    if (!hotelId) return this.listPreferences(userId, hotelId);
    const allowed = new Set(await this.getAllowedEvents(userId, hotelId));
    if (!allowed.size) return [];

    const filtered = preferences.filter((p) => allowed.has(p.event));
    if (!filtered.length) return this.listPreferences(userId, hotelId);

    await this.prisma.$transaction(async (tx) => {
      for (const pref of filtered) {
        await tx.notificationPreference.upsert({
          where: { userId_event: { userId, event: pref.event } },
          update: {
            channelEmail: pref.channelEmail,
            channelInApp: pref.channelInApp,
            channelPush: pref.channelPush,
          },
          create: {
            userId,
            hotelId,
            event: pref.event,
            channelEmail: pref.channelEmail,
            channelInApp: pref.channelInApp,
            channelPush: pref.channelPush,
          },
        });
      }
    });

    return this.listPreferences(userId, hotelId);
  }

  async listInbox(
    userId: string,
    hotelId: string | null,
    options: { limit?: number; page?: number; unreadOnly?: boolean } = {},
  ) {
    if (!hotelId) {
      return {
        items: [],
        unreadCount: 0,
        meta: {
          total: 0,
          current_page: 1,
          per_page: 20,
          last_page: 1,
          from: 0,
          to: 0,
        },
      };
    }

    const limit = Math.min(Math.max(options.limit ?? 20, 1), 100);
    const page = Math.max(options.page ?? 1, 1);
    const offset = (page - 1) * limit;
    const unreadOnlyClause = options.unreadOnly
      ? this.prisma.$queryRaw<NotificationRow[]>`
          SELECT "id", "userId", "hotelId", "event", "title", "message", "metadata", "readAt", "createdAt"
          FROM "Notification"
          WHERE "userId" = ${userId} AND "hotelId" = ${hotelId} AND "readAt" IS NULL
          ORDER BY "createdAt" DESC
          OFFSET ${offset}
          LIMIT ${limit}
        `
      : this.prisma.$queryRaw<NotificationRow[]>`
          SELECT "id", "userId", "hotelId", "event", "title", "message", "metadata", "readAt", "createdAt"
          FROM "Notification"
          WHERE "userId" = ${userId} AND "hotelId" = ${hotelId}
          ORDER BY "createdAt" DESC
          OFFSET ${offset}
          LIMIT ${limit}
        `;

    const [items, unreadCountRows, totalRows] = await Promise.all([
      unreadOnlyClause,
      this.prisma.$queryRaw<NotificationCountRow[]>`
        SELECT COUNT(*)::bigint AS count
        FROM "Notification"
        WHERE "userId" = ${userId} AND "hotelId" = ${hotelId} AND "readAt" IS NULL
      `,
      options.unreadOnly
        ? this.prisma.$queryRaw<NotificationCountRow[]>`
            SELECT COUNT(*)::bigint AS count
            FROM "Notification"
            WHERE "userId" = ${userId} AND "hotelId" = ${hotelId} AND "readAt" IS NULL
          `
        : this.prisma.$queryRaw<NotificationCountRow[]>`
            SELECT COUNT(*)::bigint AS count
            FROM "Notification"
            WHERE "userId" = ${userId} AND "hotelId" = ${hotelId}
          `,
    ]);

    const total = Number(totalRows[0]?.count ?? 0);
    const lastPage = Math.max(1, Math.ceil(total / limit));
    const from = total === 0 ? 0 : offset + 1;
    const to = Math.min(total, offset + items.length);

    console.log(items, 'items')
    return {
      items: items.map((item) => this.mapNotificationRow(item)),
      unreadCount: Number(unreadCountRows[0]?.count ?? 0),
      meta: {
        total,
        current_page: page,
        per_page: limit,
        last_page: lastPage,
        from,
        to,
      },
    };
  }

  async markAsRead(userId: string, hotelId: string | null, notificationId: string) {
    if (!hotelId) {
      throw new NotFoundException('Notification not found.');
    }

    const existing = await this.prisma.$queryRaw<NotificationRow[]>`
      SELECT "id", "userId", "hotelId", "event", "title", "message", "metadata", "readAt", "createdAt"
      FROM "Notification"
      WHERE "id" = ${notificationId} AND "userId" = ${userId} AND "hotelId" = ${hotelId}
      LIMIT 1
    `;
    if (!existing[0]) {
      throw new NotFoundException('Notification not found.');
    }

    const updated = await this.prisma.$queryRaw<NotificationRow[]>`
      UPDATE "Notification"
      SET "readAt" = COALESCE("readAt", ${new Date()})
      WHERE "id" = ${notificationId}
      RETURNING "id", "userId", "hotelId", "event", "title", "message", "metadata", "readAt", "createdAt"
    `;

    return this.mapNotificationRow(updated[0]);
  }

  async markAllAsRead(userId: string, hotelId: string | null) {
    if (!hotelId) {
      return { updated: 0 };
    }

    const result = await this.prisma.$executeRaw`
      UPDATE "Notification"
      SET "readAt" = ${new Date()}
      WHERE "userId" = ${userId} AND "hotelId" = ${hotelId} AND "readAt" IS NULL
    `;

    return { updated: Number(result) };
  }
}
