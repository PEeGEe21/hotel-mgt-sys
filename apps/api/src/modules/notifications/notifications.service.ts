import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { DEFAULT_ROLE_PERMISSIONS } from '../../common/constants/role-permissions';
import { Prisma, Role } from '@prisma/client';
import { EmailService } from '../../common/email/email.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { randomUUID } from 'crypto';
import * as webpush from 'web-push';
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
    subscriptions: number;
    dispatched: number;
    failed: number;
    skipped: number;
  };
};

type PushDeliveryStatus = 'healthy' | 'failing' | 'never_tested';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private vapidConfigured = false;

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private realtimeGateway: RealtimeGateway,
    private configService: ConfigService,
  ) {}

  private publishNotificationsSync(
    userIds: string[],
    hotelId: string | null,
    reason: 'created' | 'read' | 'read-all',
    event?: NotificationEvent,
  ) {
    const uniqueUserIds = [...new Set(userIds.filter(Boolean))];
    this.realtimeGateway.emitNotificationSync(uniqueUserIds, {
      hotelId,
      reason,
      event,
      timestamp: new Date().toISOString(),
    });
  }

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

  private buildDispatchMetadata(options: DispatchNotificationOptions) {
    const existingMetadata = options.inApp?.metadata ?? {};
    const existingCorrelationId =
      typeof existingMetadata.correlationId === 'string' ? existingMetadata.correlationId : null;
    const correlationId = existingCorrelationId ?? randomUUID();
    const hasEmailDelivery = Boolean(options.email);

    return {
      ...existingMetadata,
      correlationId,
      ...(hasEmailDelivery
        ? {
            hasEmailDelivery: true,
            mailingHref: `/mailing?correlationId=${encodeURIComponent(correlationId)}`,
          }
        : {}),
    } as Record<string, unknown>;
  }

  private getPushConfig() {
    const publicKey = this.configService.get<string>('push.publicKey');
    const privateKey = this.configService.get<string>('push.privateKey');
    const subject = this.configService.get<string>('push.subject');

    if (!publicKey || !privateKey || !subject) return null;

    if (!this.vapidConfigured) {
      webpush.setVapidDetails(subject, publicKey, privateKey);
      this.vapidConfigured = true;
    }

    return { publicKey, privateKey, subject };
  }

  private getPushFailureReason(error: unknown) {
    if (error instanceof Error && error.message) return error.message;
    return String(error);
  }

  private getPushHealth(subscription: {
    lastSuccessAt: Date | null;
    lastFailureAt: Date | null;
  }): PushDeliveryStatus {
    if (subscription.lastFailureAt && !subscription.lastSuccessAt) return 'failing';
    if (
      subscription.lastFailureAt &&
      subscription.lastSuccessAt &&
      subscription.lastFailureAt > subscription.lastSuccessAt
    ) {
      return 'failing';
    }
    if (subscription.lastSuccessAt) return 'healthy';
    return 'never_tested';
  }

  private maskPushEndpoint(endpoint: string) {
    try {
      const url = new URL(endpoint);
      const tail = url.pathname.length > 24 ? url.pathname.slice(-24) : url.pathname;
      return `${url.origin}${tail}`;
    } catch {
      return endpoint.length > 48 ? endpoint.slice(-48) : endpoint;
    }
  }

  async getPushSettings() {
    const config = this.getPushConfig();
    return {
      enabled: Boolean(config),
      publicKey: config?.publicKey ?? null,
    };
  }

  async getPushStatus(userId: string, hotelId: string | null) {
    const [subscriptions, recentDeliveries] = await Promise.all([
      this.prisma.pushSubscription.findMany({
        where: {
          userId,
          ...(hotelId ? { hotelId } : {}),
        },
        orderBy: [{ updatedAt: 'desc' }],
      }),
      this.prisma.pushDeliveryLog.findMany({
        where: {
          userId,
          ...(hotelId ? { hotelId } : {}),
        },
        orderBy: [{ createdAt: 'desc' }],
        take: 10,
      }),
    ]);

    const mappedSubscriptions = subscriptions.map((subscription) => ({
      id: subscription.id,
      endpointPreview: this.maskPushEndpoint(subscription.endpoint),
      userAgent: subscription.userAgent,
      createdAt: subscription.createdAt,
      updatedAt: subscription.updatedAt,
      lastAttemptAt: subscription.lastAttemptAt,
      lastSuccessAt: subscription.lastSuccessAt,
      lastFailureAt: subscription.lastFailureAt,
      lastFailureReason: subscription.lastFailureReason,
      lastFailureStatusCode: subscription.lastFailureStatusCode,
      lastDeliveredEvent: subscription.lastDeliveredEvent,
      health: this.getPushHealth(subscription),
    }));

    const healthCounts = mappedSubscriptions.reduce(
      (acc: Record<PushDeliveryStatus, number>, subscription) => {
        acc[subscription.health] += 1;
        return acc;
      },
      { healthy: 0, failing: 0, never_tested: 0 } as Record<PushDeliveryStatus, number>,
    );

    const mappedDeliveries = recentDeliveries.map((delivery) => ({
      id: delivery.id,
      event: delivery.event,
      title: delivery.title,
      status: delivery.status,
      failureReason: delivery.failureReason,
      failureStatusCode: delivery.failureStatusCode,
      endpointPreview: this.maskPushEndpoint(delivery.endpoint),
      correlationId: delivery.correlationId,
      isTest: delivery.isTest,
      deliveredAt: delivery.deliveredAt,
      createdAt: delivery.createdAt,
    }));

    return {
      subscriptions: mappedSubscriptions,
      recentDeliveries: mappedDeliveries,
      summary: {
        totalSubscriptions: mappedSubscriptions.length,
        healthySubscriptions: healthCounts.healthy,
        failingSubscriptions: healthCounts.failing,
        neverTestedSubscriptions: healthCounts.never_tested,
      },
      lastTestResult: mappedDeliveries.find((delivery) => delivery.isTest) ?? null,
    };
  }

  async upsertPushSubscription(
    userId: string,
    hotelId: string | null,
    dto: { endpoint: string; p256dh: string; auth: string },
    userAgent?: string | null,
  ) {
    await this.prisma.pushSubscription.upsert({
      where: { endpoint: dto.endpoint },
      update: {
        userId,
        hotelId,
        p256dh: dto.p256dh,
        auth: dto.auth,
        userAgent: userAgent ?? null,
      },
      create: {
        userId,
        hotelId,
        endpoint: dto.endpoint,
        p256dh: dto.p256dh,
        auth: dto.auth,
        userAgent: userAgent ?? null,
      },
    });

    return { saved: true };
  }

  async removePushSubscription(userId: string, endpoint: string) {
    const result = await this.prisma.pushSubscription.deleteMany({
      where: { userId, endpoint },
    });

    return { removed: result.count };
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
        push: { eligible: 0, subscriptions: 0, dispatched: 0, failed: 0, skipped: 0 },
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
        push: { eligible: 0, subscriptions: 0, dispatched: 0, failed: 0, skipped: 0 },
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
    const dispatchMetadata = this.buildDispatchMetadata(options);
    const correlationId =
      typeof dispatchMetadata.correlationId === 'string' ? dispatchMetadata.correlationId : null;
    const isTestDispatch = dispatchMetadata.source === 'profile-test-trigger';

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
    let pushDispatched = 0;
    let pushFailed = 0;

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
            metadata: dispatchMetadata,
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
      const created = await this.prisma.notification.createMany({
        data: inAppEligibleRecipients.map((user) => ({
          userId: user.id,
          hotelId: options.hotelId,
          event: options.event,
          title: options.inApp!.title,
          message: options.inApp!.message,
          metadata: dispatchMetadata
            ? (dispatchMetadata as Prisma.InputJsonValue)
            : Prisma.JsonNull,
        })),
      });
      inAppDispatched = created.count;
      if (created.count > 0) {
        this.publishNotificationsSync(
          inAppEligibleRecipients.map((user) => user.id),
          options.hotelId,
          'created',
          options.event,
        );
      }
    }

    const inAppEligible = inAppEligibleRecipients.length;
    const pushEligibleRecipients = options.inApp
      ? resolvedRecipients.filter(
          (user) =>
            user.preferences.channelPush && !(options.excludePushUserIds ?? []).includes(user.id),
        )
      : [];
    let pushSubscriptionCount = 0;

    if (options.inApp && pushEligibleRecipients.length) {
      const pushTitle = options.inApp.title;
      const pushConfig = this.getPushConfig();
      if (!pushConfig) {
        this.logger.warn(
          `Push delivery skipped for event ${options.event}: WEB_PUSH_* env vars are not configured.`,
        );
      } else {
        const subscriptions = await this.prisma.pushSubscription.findMany({
          where: {
            userId: { in: pushEligibleRecipients.map((user) => user.id) },
          },
          select: {
            id: true,
            endpoint: true,
            p256dh: true,
            auth: true,
            userId: true,
            hotelId: true,
          },
        });
        pushSubscriptionCount = subscriptions.length;

        const payload = JSON.stringify({
          title: options.inApp.title,
          body: options.inApp.message,
          href:
            typeof dispatchMetadata.href === 'string' && dispatchMetadata.href
              ? dispatchMetadata.href
              : undefined,
          event: options.event,
          timestamp: new Date().toISOString(),
        });

        const results = await Promise.allSettled(
          subscriptions.map(async (subscription) => {
            try {
              await webpush.sendNotification(
                {
                  endpoint: subscription.endpoint,
                  keys: {
                    p256dh: subscription.p256dh,
                    auth: subscription.auth,
                  },
                },
                payload,
              );
              const deliveredAt = new Date();
              await this.prisma.$transaction([
                this.prisma.pushDeliveryLog.create({
                  data: {
                    pushSubscriptionId: subscription.id,
                    userId: subscription.userId,
                    hotelId: subscription.hotelId,
                    event: options.event,
                    title: pushTitle,
                    status: 'delivered',
                    endpoint: subscription.endpoint,
                    correlationId,
                    isTest: isTestDispatch,
                    metadata: dispatchMetadata as Prisma.InputJsonValue,
                    deliveredAt,
                  },
                }),
                this.prisma.pushSubscription.update({
                  where: { id: subscription.id },
                  data: {
                    lastAttemptAt: deliveredAt,
                    lastSuccessAt: deliveredAt,
                    lastFailureAt: null,
                    lastFailureReason: null,
                    lastFailureStatusCode: null,
                    lastDeliveredEvent: options.event,
                  },
                }),
              ]);
              return true;
            } catch (error: any) {
              const statusCode = Number(error?.statusCode ?? 0);
              const attemptedAt = new Date();
              const failureReason = this.getPushFailureReason(error);
              await this.prisma.pushDeliveryLog.create({
                data: {
                  pushSubscriptionId: subscription.id,
                  userId: subscription.userId,
                  hotelId: subscription.hotelId,
                  event: options.event,
                    title: pushTitle,
                  status: 'failed',
                  failureReason,
                  failureStatusCode: Number.isFinite(statusCode) && statusCode > 0 ? statusCode : null,
                  endpoint: subscription.endpoint,
                  correlationId,
                  isTest: isTestDispatch,
                  metadata: dispatchMetadata as Prisma.InputJsonValue,
                },
              });
              await this.prisma.pushSubscription.update({
                where: { id: subscription.id },
                data: {
                  lastAttemptAt: attemptedAt,
                  lastFailureAt: attemptedAt,
                  lastFailureReason: failureReason,
                  lastFailureStatusCode: Number.isFinite(statusCode) && statusCode > 0 ? statusCode : null,
                },
              });
              if (statusCode === 404 || statusCode === 410) {
                await this.prisma.pushSubscription.deleteMany({
                  where: { id: subscription.id },
                });
              }
              throw error;
            }
          }),
        );

        for (const result of results) {
          if (result.status === 'fulfilled' && result.value) {
            pushDispatched += 1;
            continue;
          }

          pushFailed += 1;
          const reason = result.status === 'rejected' ? result.reason : 'unknown push failure';
          this.logger.warn(
            `Push delivery failed for event ${options.event}: ${String(reason)}`,
          );
        }
      }
    }

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
        eligible: pushEligibleRecipients.length,
        subscriptions: pushSubscriptionCount,
        dispatched: pushDispatched,
        failed: pushFailed,
        skipped: Math.max(pushEligibleRecipients.length - pushDispatched, 0),
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

  async sendTestNotification(
    userId: string,
    hotelId: string | null,
    event: NotificationEvent,
  ) {
    if (!hotelId) {
      throw new ForbiddenException('Test notifications require a hotel-scoped account.');
    }

    const allowedEvents = await this.getAllowedEvents(userId, hotelId);
    if (!allowedEvents.includes(event)) {
      throw new ForbiddenException('You are not allowed to receive this notification event.');
    }

    const eventLabel = event.replace(/([a-z])([A-Z])/g, '$1 $2');
    const title = `Test ${eventLabel}`;
    const message = `This is a test ${eventLabel.toLowerCase()} notification from your HotelOS profile settings.`;

    return this.dispatch({
      hotelId,
      event,
      recipientUserIds: [userId],
      email: {
        subject: title,
        html: `<div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.6;">
          <p style="margin: 0 0 12px;">This is a test <strong>${eventLabel}</strong> notification from HotelOS.</p>
          <p style="margin: 0;">Use this to verify your email, in-app, and browser push notification setup.</p>
        </div>`,
        text: `This is a test ${eventLabel} notification from HotelOS. Use this to verify your email, in-app, and browser push notification setup.`,
      },
      inApp: {
        title,
        message,
        metadata: {
          href: '/notifications',
          source: 'profile-test-trigger',
          testEvent: event,
        },
      },
    });
  }

  async listInbox(
    userId: string,
    hotelId: string | null,
    options: {
      limit?: number;
      page?: number;
      unreadOnly?: boolean;
      event?: NotificationEvent;
    } = {},
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
    const skip = (page - 1) * limit;
    const allowedEvents = await this.getAllowedEvents(userId, hotelId);
    if (options.event && !allowedEvents.includes(options.event)) {
      return {
        items: [],
        unreadCount: 0,
        meta: {
          total: 0,
          current_page: page,
          per_page: limit,
          last_page: 1,
          from: 0,
          to: 0,
        },
      };
    }
    const where = {
      userId,
      hotelId,
      ...(options.event ? { event: options.event } : {}),
      ...(options.unreadOnly ? { readAt: null } : {}),
    };

    const [items, unreadCount, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({
        where: { userId, hotelId, readAt: null },
      }),
      this.prisma.notification.count({ where }),
    ]);

    const lastPage = Math.max(1, Math.ceil(total / limit));
    const from = total === 0 ? 0 : skip + 1;
    const to = Math.min(total, skip + items.length);
    return {
      items,
      unreadCount,
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

    const existing = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId, hotelId },
    });
    if (!existing) {
      throw new NotFoundException('Notification not found.');
    }

    const updated = await this.prisma.notification.update({
      where: { id: notificationId },
      data: { readAt: existing.readAt ?? new Date() },
    });

    if (!existing.readAt) {
      this.publishNotificationsSync([userId], hotelId, 'read', existing.event as NotificationEvent);
    }

    return updated;
  }

  async markAllAsRead(userId: string, hotelId: string | null) {
    if (!hotelId) {
      return { updated: 0 };
    }

    const result = await this.prisma.notification.updateMany({
      where: { userId, hotelId, readAt: null },
      data: { readAt: new Date() },
    });

    if (result.count > 0) {
      this.publishNotificationsSync([userId], hotelId, 'read-all');
    }

    return { updated: result.count };
  }
}
