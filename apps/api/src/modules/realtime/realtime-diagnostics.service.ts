import {
  forwardRef,
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

export type RealtimeDiagnosticModuleKey =
  | 'notifications'
  | 'posOrders'
  | 'prep'
  | 'housekeeping'
  | 'facilities'
  | 'presence';

export type RealtimeDiagnosticsSettings = {
  alertsEnabled: boolean;
  alertCooldownMinutes: number;
  retentionDays: number;
  staleThresholds: Record<RealtimeDiagnosticModuleKey, number>;
};

type RecordRealtimeEventArgs = {
  hotelId: string | null | undefined;
  moduleKey: RealtimeDiagnosticModuleKey;
  eventName: string;
  eventType: string;
  summary: string;
  payload?: unknown;
  timestamp?: string | Date;
};

type UpdateRealtimeSettingsInput = {
  alertsEnabled?: boolean;
  alertCooldownMinutes?: number;
  retentionDays?: number;
  staleThresholds?: Partial<Record<RealtimeDiagnosticModuleKey, number>>;
};

const MODULES: Array<{
  key: RealtimeDiagnosticModuleKey;
  label: string;
  eventName: string;
  description: string;
  staleAfterSeconds: number;
}> = [
  {
    key: 'notifications',
    label: 'Notifications',
    eventName: 'notifications.sync',
    description: 'Inbox refresh and delivery fanout',
    staleAfterSeconds: 120,
  },
  {
    key: 'posOrders',
    label: 'POS Orders',
    eventName: 'pos.orders.sync',
    description: 'Sales order lifecycle updates',
    staleAfterSeconds: 120,
  },
  {
    key: 'prep',
    label: 'Prep Board',
    eventName: 'pos.prep.sync',
    description: 'Kitchen and bar item prep flow',
    staleAfterSeconds: 120,
  },
  {
    key: 'housekeeping',
    label: 'Housekeeping',
    eventName: 'housekeeping.tasks.sync',
    description: 'Task board and room-prep changes',
    staleAfterSeconds: 120,
  },
  {
    key: 'facilities',
    label: 'Facilities Maintenance',
    eventName: 'facilities.maintenance.sync',
    description: 'Maintenance request status changes',
    staleAfterSeconds: 120,
  },
  {
    key: 'presence',
    label: 'Presence',
    eventName: 'presence.sync',
    description: 'Staff/account presence invalidation',
    staleAfterSeconds: 180,
  },
];

const DEGRADATION_SCAN_INTERVAL_MS = 60_000;
const DEGRADED_EVENT_TYPE = 'degraded';
const RECOVERED_EVENT_TYPE = 'recovered';
const SETTINGS_EVENT_NAME = 'realtime.settings';
const SETTINGS_EVENT_TYPE = 'settings_updated';

const DEFAULT_SETTINGS: RealtimeDiagnosticsSettings = {
  alertsEnabled: true,
  alertCooldownMinutes: 180,
  retentionDays: 14,
  staleThresholds: {
    notifications: 120,
    posOrders: 120,
    prep: 120,
    housekeeping: 120,
    facilities: 120,
    presence: 180,
  },
};

function toDate(value?: string | Date) {
  if (!value) return new Date();
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

@Injectable()
export class RealtimeDiagnosticsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RealtimeDiagnosticsService.name);
  private scanTimer: NodeJS.Timeout | null = null;

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => NotificationsService))
    private notificationsService: NotificationsService,
  ) {}

  onModuleInit() {
    this.scanTimer = setInterval(() => {
      void this.scanForDegradedModules();
    }, DEGRADATION_SCAN_INTERVAL_MS);
  }

  onModuleDestroy() {
    if (this.scanTimer) {
      clearInterval(this.scanTimer);
      this.scanTimer = null;
    }
  }

  private async getManagementRecipientIds(hotelId: string) {
    const rows = await this.prisma.user.findMany({
      where: {
        isActive: true,
        role: { in: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
        staff: { hotelId },
      },
      select: { id: true },
    });

    return rows.map((row) => row.id);
  }

  private coerceSettings(value: unknown): RealtimeDiagnosticsSettings {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return DEFAULT_SETTINGS;
    }

    const raw = value as Record<string, unknown>;
    const rawThresholds =
      raw.staleThresholds && typeof raw.staleThresholds === 'object' && !Array.isArray(raw.staleThresholds)
        ? (raw.staleThresholds as Record<string, unknown>)
        : {};

    const staleThresholds = Object.fromEntries(
      (Object.keys(DEFAULT_SETTINGS.staleThresholds) as RealtimeDiagnosticModuleKey[]).map((key) => [
        key,
        typeof rawThresholds[key] === 'number' && Number.isFinite(rawThresholds[key])
          ? Math.max(30, Math.min(3600, Math.round(rawThresholds[key] as number)))
          : DEFAULT_SETTINGS.staleThresholds[key],
      ]),
    ) as Record<RealtimeDiagnosticModuleKey, number>;

    return {
      alertsEnabled:
        typeof raw.alertsEnabled === 'boolean'
          ? raw.alertsEnabled
          : DEFAULT_SETTINGS.alertsEnabled,
      alertCooldownMinutes:
        typeof raw.alertCooldownMinutes === 'number' && Number.isFinite(raw.alertCooldownMinutes)
          ? Math.max(5, Math.min(1440, Math.round(raw.alertCooldownMinutes)))
          : DEFAULT_SETTINGS.alertCooldownMinutes,
      retentionDays:
        typeof raw.retentionDays === 'number' && Number.isFinite(raw.retentionDays)
          ? Math.max(1, Math.min(365, Math.round(raw.retentionDays)))
          : DEFAULT_SETTINGS.retentionDays,
      staleThresholds,
    };
  }

  async getRealtimeSettings(hotelId: string) {
    const latest = await this.prisma.realtimeEventLog.findFirst({
      where: {
        hotelId,
        eventName: SETTINGS_EVENT_NAME,
        eventType: SETTINGS_EVENT_TYPE,
      },
      orderBy: { createdAt: 'desc' },
    });

    return this.coerceSettings(latest?.payload);
  }

  async updateRealtimeSettings(hotelId: string, input: UpdateRealtimeSettingsInput) {
    const current = await this.getRealtimeSettings(hotelId);
    const next = this.coerceSettings({
      ...current,
      ...input,
      staleThresholds: {
        ...current.staleThresholds,
        ...(input.staleThresholds ?? {}),
      },
    });

    await this.prisma.realtimeEventLog.create({
      data: {
        hotelId,
        moduleKey: 'system',
        eventName: SETTINGS_EVENT_NAME,
        eventType: SETTINGS_EVENT_TYPE,
        summary: 'Realtime diagnostics settings updated',
        payload: next as Prisma.InputJsonValue,
      },
    });

    return next;
  }

  private buildDegradationInAppNotification(args: {
    moduleLabel: string;
    eventName: string;
    staleMinutes: number;
    lastEventAt: Date;
  }) {
    return {
      title: `${args.moduleLabel} realtime degraded`,
      message: `${args.moduleLabel} has not received ${args.eventName} updates for about ${args.staleMinutes} minutes.`,
      metadata: {
        severity: 'critical',
        summary: `${args.moduleLabel} realtime stream appears degraded`,
        href: '/settings/realtime',
        moduleLabel: args.moduleLabel,
        eventName: args.eventName,
        staleMinutes: args.staleMinutes,
        lastEventAt: args.lastEventAt.toISOString(),
      },
    };
  }

  private buildDegradationEmail(args: {
    hotelName: string;
    moduleLabel: string;
    eventName: string;
    staleMinutes: number;
    lastEventAt: Date;
  }) {
    const lastEventAt = args.lastEventAt.toLocaleString();
    return {
      subject: `Realtime degradation detected: ${args.moduleLabel}`,
      text:
        `${args.hotelName}: realtime degradation detected.\n` +
        `Module: ${args.moduleLabel}\n` +
        `Event stream: ${args.eventName}\n` +
        `Last event seen: ${lastEventAt}\n` +
        `Estimated stale duration: ${args.staleMinutes} minutes\n` +
        `Open Settings > Realtime Diagnostics for details.`,
      html: `
        <div>
          <p><strong>${args.hotelName}</strong> detected degraded realtime delivery.</p>
          <p>Module: <strong>${args.moduleLabel}</strong></p>
          <p>Event stream: <strong>${args.eventName}</strong></p>
          <p>Last event seen: <strong>${lastEventAt}</strong></p>
          <p>Estimated stale duration: <strong>${args.staleMinutes} minutes</strong></p>
          <p>Review Settings &gt; Realtime Diagnostics for current status and recent event history.</p>
        </div>
      `,
    };
  }

  private buildRecoverySummary(moduleLabel: string, eventName: string) {
    return `${moduleLabel} resumed receiving ${eventName} updates`;
  }

  private async logDiagnosticStateEvent(args: {
    hotelId: string;
    moduleKey: RealtimeDiagnosticModuleKey;
    eventName: string;
    eventType: typeof DEGRADED_EVENT_TYPE | typeof RECOVERED_EVENT_TYPE;
    summary: string;
    payload: Record<string, unknown>;
  }) {
    const payload = JSON.parse(JSON.stringify(args.payload)) as Prisma.InputJsonValue;
    await this.prisma.realtimeEventLog.create({
      data: {
        hotelId: args.hotelId,
        moduleKey: args.moduleKey,
        eventName: args.eventName,
        eventType: args.eventType,
        summary: args.summary,
        payload,
      },
    });
  }

  private async scanForDegradedModules() {
    try {
      await this.cleanupExpiredEventLogs();

      const rows = await this.prisma.realtimeModuleHealth.findMany({
        where: {
          eventCount: { gt: 0 },
        },
        include: {
          hotel: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      const now = Date.now();

      for (const row of rows) {
        const module = MODULES.find((item) => item.key === row.moduleKey);
        if (!module) continue;
        const settings = await this.getRealtimeSettings(row.hotelId);
        const staleAfterSeconds = settings.staleThresholds[module.key] ?? module.staleAfterSeconds;

        const ageMs = now - row.lastEventAt.getTime();
        const isStale = ageMs > staleAfterSeconds * 1000;
        const stateEvents = await this.prisma.realtimeEventLog.findMany({
          where: {
            hotelId: row.hotelId,
            moduleKey: row.moduleKey,
            eventType: {
              in: [DEGRADED_EVENT_TYPE, RECOVERED_EVENT_TYPE],
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        });
        const lastDegraded = stateEvents.find((event) => event.eventType === DEGRADED_EVENT_TYPE);
        const lastRecovered = stateEvents.find((event) => event.eventType === RECOVERED_EVENT_TYPE);
        const hasActiveDegradation =
          !!lastDegraded && (!lastRecovered || lastDegraded.createdAt > lastRecovered.createdAt);

        if (!isStale) {
          if (hasActiveDegradation) {
            await this.logDiagnosticStateEvent({
              hotelId: row.hotelId,
              moduleKey: row.moduleKey as RealtimeDiagnosticModuleKey,
              eventName: row.eventName,
              eventType: RECOVERED_EVENT_TYPE,
              summary: this.buildRecoverySummary(module.label, row.eventName),
              payload: {
                moduleLabel: module.label,
                eventName: row.eventName,
                lastEventAt: row.lastEventAt.toISOString(),
              },
            });
          }
          continue;
        }

        const shouldAlert =
          settings.alertsEnabled &&
          (!lastDegraded ||
            (!!lastRecovered && lastRecovered.createdAt > lastDegraded.createdAt) ||
            now - lastDegraded.createdAt.getTime() >
              settings.alertCooldownMinutes * 60_000);

        if (!shouldAlert) continue;

        const recipientUserIds = await this.getManagementRecipientIds(row.hotelId);
        const staleMinutes = Math.max(1, Math.round(ageMs / 60_000));

        if (recipientUserIds.length) {
          await this.notificationsService.dispatch({
            hotelId: row.hotelId,
            event: 'systemAlerts',
            recipientUserIds,
            email: this.buildDegradationEmail({
              hotelName: row.hotel.name,
              moduleLabel: module.label,
              eventName: row.eventName,
              staleMinutes,
              lastEventAt: row.lastEventAt,
            }),
            inApp: this.buildDegradationInAppNotification({
              moduleLabel: module.label,
              eventName: row.eventName,
              staleMinutes,
              lastEventAt: row.lastEventAt,
            }),
          });
        }

        await this.logDiagnosticStateEvent({
          hotelId: row.hotelId,
          moduleKey: row.moduleKey as RealtimeDiagnosticModuleKey,
          eventName: row.eventName,
          eventType: DEGRADED_EVENT_TYPE,
          summary: `${module.label} has not received ${row.eventName} updates for about ${staleMinutes} minutes`,
          payload: {
            moduleLabel: module.label,
            eventName: row.eventName,
            staleMinutes,
            lastEventAt: row.lastEventAt.toISOString(),
            lastSummary: row.lastSummary,
          },
        });
      }
    } catch (error) {
      this.logger.warn(`Realtime degradation scan failed: ${String(error)}`);
    }
  }

  private async cleanupExpiredEventLogs() {
    const hotelRows = await this.prisma.realtimeEventLog.findMany({
      orderBy: { createdAt: 'desc' },
      distinct: ['hotelId'],
      select: {
        hotelId: true,
      },
    });

    for (const row of hotelRows) {
      const settings = await this.getRealtimeSettings(row.hotelId);
      const cutoff = new Date(Date.now() - settings.retentionDays * 24 * 60 * 60 * 1000);
      await this.prisma.realtimeEventLog.deleteMany({
        where: {
          hotelId: row.hotelId,
          createdAt: { lt: cutoff },
          NOT: {
            eventName: SETTINGS_EVENT_NAME,
          },
        },
      });
    }
  }

  async recordEvent(args: RecordRealtimeEventArgs) {
    if (!args.hotelId) return;

    const createdAt = toDate(args.timestamp);
    const payload =
      args.payload === undefined ? Prisma.JsonNull : JSON.parse(JSON.stringify(args.payload));

    await this.prisma.$transaction([
      this.prisma.realtimeEventLog.create({
        data: {
          hotelId: args.hotelId,
          moduleKey: args.moduleKey,
          eventName: args.eventName,
          eventType: args.eventType,
          summary: args.summary,
          payload,
          createdAt,
        },
      }),
      this.prisma.realtimeModuleHealth.upsert({
        where: {
          hotelId_moduleKey: {
            hotelId: args.hotelId,
            moduleKey: args.moduleKey,
          },
        },
        update: {
          eventName: args.eventName,
          lastEventAt: createdAt,
          lastEventType: args.eventType,
          lastSummary: args.summary,
          eventCount: {
            increment: 1,
          },
        },
        create: {
          hotelId: args.hotelId,
          moduleKey: args.moduleKey,
          eventName: args.eventName,
          lastEventAt: createdAt,
          lastEventType: args.eventType,
          lastSummary: args.summary,
          eventCount: 1,
        },
      }),
    ]);
  }

  async getHotelDiagnostics(hotelId: string, limit = 50) {
    const safeLimit = Math.min(Math.max(limit, 10), 100);
    const settings = await this.getRealtimeSettings(hotelId);
    const nowDate = new Date();
    const last24Hours = new Date(nowDate.getTime() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(nowDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    const [healthRows, eventRows, stateRows] = await Promise.all([
      this.prisma.realtimeModuleHealth.findMany({
        where: { hotelId },
        orderBy: [{ lastEventAt: 'desc' }, { moduleKey: 'asc' }],
      }),
      this.prisma.realtimeEventLog.findMany({
        where: { hotelId },
        orderBy: { createdAt: 'desc' },
        take: safeLimit,
      }),
      this.prisma.realtimeEventLog.findMany({
        where: {
          hotelId,
          createdAt: { gte: last7Days },
        },
        orderBy: { createdAt: 'desc' },
        take: 1000,
      }),
    ]);

    const now = Date.now();
    const healthByKey = new Map(healthRows.map((row) => [row.moduleKey, row] as const));
    const stateByModule = new Map<
      string,
      {
        lastDegradedAt: Date | null;
        lastRecoveredAt: Date | null;
      }
    >();

    for (const row of stateRows) {
      const existing = stateByModule.get(row.moduleKey) ?? {
        lastDegradedAt: null,
        lastRecoveredAt: null,
      };

      if (row.eventType === DEGRADED_EVENT_TYPE && !existing.lastDegradedAt) {
        existing.lastDegradedAt = row.createdAt;
      }
      if (row.eventType === RECOVERED_EVENT_TYPE && !existing.lastRecoveredAt) {
        existing.lastRecoveredAt = row.createdAt;
      }

      stateByModule.set(row.moduleKey, existing);
    }

    const trendBuckets = new Map<
      string,
      { date: string; totalEvents: number; degradedEvents: number; recoveredEvents: number }
    >();
    for (let index = 6; index >= 0; index -= 1) {
      const day = new Date(nowDate);
      day.setHours(0, 0, 0, 0);
      day.setDate(day.getDate() - index);
      const key = day.toISOString().slice(0, 10);
      trendBuckets.set(key, {
        date: key,
        totalEvents: 0,
        degradedEvents: 0,
        recoveredEvents: 0,
      });
    }

    const moduleSummarySeed = new Map(
      MODULES.map((module) => [
        module.key,
        {
          key: module.key,
          label: module.label,
          totalEvents7d: 0,
          totalEvents24h: 0,
          degradedEvents7d: 0,
          recoveredEvents7d: 0,
          lastDegradedAt: null as Date | null,
          lastRecoveredAt: null as Date | null,
        },
      ]),
    );

    for (const row of stateRows) {
      const dayKey = row.createdAt.toISOString().slice(0, 10);
      const bucket = trendBuckets.get(dayKey);
      if (bucket) {
        bucket.totalEvents += 1;
        if (row.eventType === DEGRADED_EVENT_TYPE) bucket.degradedEvents += 1;
        if (row.eventType === RECOVERED_EVENT_TYPE) bucket.recoveredEvents += 1;
      }

      const summary = moduleSummarySeed.get(row.moduleKey as RealtimeDiagnosticModuleKey);
      if (!summary) continue;

      summary.totalEvents7d += 1;
      if (row.createdAt >= last24Hours) {
        summary.totalEvents24h += 1;
      }
      if (row.eventType === DEGRADED_EVENT_TYPE) {
        summary.degradedEvents7d += 1;
        if (!summary.lastDegradedAt) summary.lastDegradedAt = row.createdAt;
      }
      if (row.eventType === RECOVERED_EVENT_TYPE) {
        summary.recoveredEvents7d += 1;
        if (!summary.lastRecoveredAt) summary.lastRecoveredAt = row.createdAt;
      }
    }

    const modules = MODULES.map((module) => {
      const row = healthByKey.get(module.key);
      const state = stateByModule.get(module.key);
      const lastEventAt = row?.lastEventAt ?? null;
      const isStale =
        !!lastEventAt &&
        now - lastEventAt.getTime() > settings.staleThresholds[module.key] * 1000;
      const activeDegradation =
        !!state?.lastDegradedAt &&
        (!state.lastRecoveredAt || state.lastDegradedAt > state.lastRecoveredAt) &&
        isStale;

      return {
        key: module.key,
        label: module.label,
        eventName: module.eventName,
        description: module.description,
        staleAfterSeconds: settings.staleThresholds[module.key],
        eventCount: row?.eventCount ?? 0,
        lastEventAt,
        lastEventType: row?.lastEventType ?? null,
        lastSummary: row?.lastSummary ?? null,
        isStale,
        activeDegradation,
        degradedSince: state?.lastDegradedAt ?? null,
        lastAlertedAt: state?.lastDegradedAt ?? null,
        lastRecoveredAt: state?.lastRecoveredAt ?? null,
      };
    });

    const moduleHealthSummaries = modules.map((module) => {
      const summary = moduleSummarySeed.get(module.key)!;
      return {
        key: module.key,
        label: module.label,
        totalEvents24h: summary.totalEvents24h,
        totalEvents7d: summary.totalEvents7d,
        degradedEvents7d: summary.degradedEvents7d,
        recoveredEvents7d: summary.recoveredEvents7d,
        lastDegradedAt: summary.lastDegradedAt,
        lastRecoveredAt: summary.lastRecoveredAt,
        health:
          module.activeDegradation
            ? 'alerting'
            : module.isStale
              ? 'stale'
              : module.eventCount > 0
                ? 'healthy'
                : 'waiting',
      };
    });

    const trend = [...trendBuckets.values()];

    return {
      generatedAt: new Date().toISOString(),
      settings,
      overview: {
        totalEvents24h: moduleHealthSummaries.reduce((sum, module) => sum + module.totalEvents24h, 0),
        totalEvents7d: moduleHealthSummaries.reduce((sum, module) => sum + module.totalEvents7d, 0),
        degradedEvents7d: moduleHealthSummaries.reduce(
          (sum, module) => sum + module.degradedEvents7d,
          0,
        ),
        recoveredEvents7d: moduleHealthSummaries.reduce(
          (sum, module) => sum + module.recoveredEvents7d,
          0,
        ),
      },
      trend,
      moduleHealthSummaries,
      modules,
      recentEvents: eventRows.map((row) => ({
        id: row.id,
        module: row.moduleKey,
        eventName: row.eventName,
        type: row.eventType,
        summary: row.summary,
        payload: row.payload,
        timestamp: row.createdAt,
      })),
    };
  }
}
