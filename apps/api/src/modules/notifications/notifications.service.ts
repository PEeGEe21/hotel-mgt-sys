import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DEFAULT_ROLE_PERMISSIONS } from '../../common/constants/role-permissions';
import { Role } from '@prisma/client';
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

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

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
}
