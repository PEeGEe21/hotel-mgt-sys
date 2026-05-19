'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export type PersistedRealtimeModule = {
  key: string;
  label: string;
  eventName: string;
  description: string;
  staleAfterSeconds: number;
  eventCount: number;
  lastEventAt: string | null;
  lastEventType: string | null;
  lastSummary: string | null;
  isStale: boolean;
  activeDegradation: boolean;
  degradedSince: string | null;
  lastAlertedAt: string | null;
  lastRecoveredAt: string | null;
};

export type PersistedRealtimeEvent = {
  id: string;
  module: string;
  eventName: string;
  type: string;
  summary: string;
  payload: unknown;
  timestamp: string;
};

export type RealtimeDiagnosticsHistory = {
  generatedAt: string;
  settings: {
    alertsEnabled: boolean;
    alertCooldownMinutes: number;
    retentionDays: number;
    staleThresholds: Record<string, number>;
  };
  overview: {
    totalEvents24h: number;
    totalEvents7d: number;
    degradedEvents7d: number;
    recoveredEvents7d: number;
  };
  trend: Array<{
    date: string;
    totalEvents: number;
    degradedEvents: number;
    recoveredEvents: number;
  }>;
  moduleHealthSummaries: Array<{
    key: string;
    label: string;
    totalEvents24h: number;
    totalEvents7d: number;
    degradedEvents7d: number;
    recoveredEvents7d: number;
    lastDegradedAt: string | null;
    lastRecoveredAt: string | null;
    health: 'alerting' | 'stale' | 'healthy' | 'waiting';
  }>;
  modules: PersistedRealtimeModule[];
  recentEvents: PersistedRealtimeEvent[];
};

export function useRealtimeDiagnosticsHistory(limit = 50) {
  return useQuery<RealtimeDiagnosticsHistory>({
    queryKey: ['realtime-diagnostics', limit],
    queryFn: async () => {
      const { data } = await api.get(`/realtime/diagnostics?limit=${limit}`);
      return {
        generatedAt: data?.generatedAt ?? '',
        settings: {
          alertsEnabled: data?.settings?.alertsEnabled === true,
          alertCooldownMinutes:
            typeof data?.settings?.alertCooldownMinutes === 'number'
              ? data.settings.alertCooldownMinutes
              : 180,
          retentionDays:
            typeof data?.settings?.retentionDays === 'number' ? data.settings.retentionDays : 14,
          staleThresholds:
            data?.settings?.staleThresholds && typeof data.settings.staleThresholds === 'object'
              ? data.settings.staleThresholds
              : {},
        },
        overview: {
          totalEvents24h:
            typeof data?.overview?.totalEvents24h === 'number' ? data.overview.totalEvents24h : 0,
          totalEvents7d:
            typeof data?.overview?.totalEvents7d === 'number' ? data.overview.totalEvents7d : 0,
          degradedEvents7d:
            typeof data?.overview?.degradedEvents7d === 'number'
              ? data.overview.degradedEvents7d
              : 0,
          recoveredEvents7d:
            typeof data?.overview?.recoveredEvents7d === 'number'
              ? data.overview.recoveredEvents7d
              : 0,
        },
        trend: Array.isArray(data?.trend) ? data.trend : [],
        moduleHealthSummaries: Array.isArray(data?.moduleHealthSummaries)
          ? data.moduleHealthSummaries
          : [],
        modules: Array.isArray(data?.modules) ? data.modules : [],
        recentEvents: Array.isArray(data?.recentEvents) ? data.recentEvents : [],
      };
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}
