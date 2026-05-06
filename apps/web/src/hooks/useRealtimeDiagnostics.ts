'use client';

import { useEffect, useMemo, useState } from 'react';
import { getRealtimeSocket } from '@/lib/realtime';
import { useAuthStore } from '@/store/auth.store';

type ConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

type ModuleKey =
  | 'notifications'
  | 'posOrders'
  | 'prep'
  | 'housekeeping'
  | 'facilities'
  | 'presence';

type ModuleDiagnostic = {
  key: ModuleKey;
  label: string;
  eventName: string;
  description: string;
  eventCount: number;
  lastEventAt: string | null;
  lastEventType: string | null;
  lastSummary: string | null;
  isStale: boolean;
};

type RecentEvent = {
  id: string;
  module: ModuleKey;
  label: string;
  eventName: string;
  timestamp: string;
  type: string;
  summary: string;
};

const MODULE_CONFIG: Array<Pick<ModuleDiagnostic, 'key' | 'label' | 'eventName' | 'description'>> = [
  {
    key: 'notifications',
    label: 'Notifications',
    eventName: 'notifications.sync',
    description: 'Inbox refresh and delivery fanout',
  },
  {
    key: 'posOrders',
    label: 'POS Orders',
    eventName: 'pos.orders.sync',
    description: 'Sales order lifecycle updates',
  },
  {
    key: 'prep',
    label: 'Prep Board',
    eventName: 'pos.prep.sync',
    description: 'Kitchen and bar item prep flow',
  },
  {
    key: 'housekeeping',
    label: 'Housekeeping',
    eventName: 'housekeeping.tasks.sync',
    description: 'Task board and room-prep changes',
  },
  {
    key: 'facilities',
    label: 'Facilities Maintenance',
    eventName: 'facilities.maintenance.sync',
    description: 'Maintenance request status changes',
  },
  {
    key: 'presence',
    label: 'Presence',
    eventName: 'presence.sync',
    description: 'Staff/account presence invalidation',
  },
];

function createInitialModules(): Record<ModuleKey, ModuleDiagnostic> {
  return MODULE_CONFIG.reduce(
    (acc, item) => ({
      ...acc,
      [item.key]: {
        ...item,
        eventCount: 0,
        lastEventAt: null,
        lastEventType: null,
        lastSummary: null,
        isStale: false,
      },
    }),
    {} as Record<ModuleKey, ModuleDiagnostic>,
  );
}

function summarizeEvent(module: ModuleKey, payload: any) {
  if (!payload) return 'Event received';

  switch (module) {
    case 'notifications':
      return payload.reason ? `Reason: ${payload.reason}` : 'Inbox sync received';
    case 'posOrders':
      return payload.data?.orderNo
        ? `${payload.action ?? 'updated'} ${payload.data.orderNo}`
        : 'POS order sync received';
    case 'prep':
      return payload.data?.orderNo
        ? `${payload.action ?? 'updated'} ${payload.data.orderNo}`
        : 'Prep sync received';
    case 'housekeeping':
      return payload.data?.roomNumber
        ? `${payload.action ?? 'updated'} room ${payload.data.roomNumber}`
        : payload.data?.count
          ? `${payload.action ?? 'created'} ${payload.data.count} tasks`
          : 'Housekeeping sync received';
    case 'facilities':
      return payload.data?.requestNo
        ? `${payload.action ?? 'updated'} ${payload.data.requestNo}`
        : 'Facilities sync received';
    case 'presence':
      return payload.userId ? `Presence sync for user ${payload.userId}` : 'Presence sync received';
    default:
      return 'Event received';
  }
}

function eventTypeFor(payload: any) {
  return payload?.type ?? payload?.action ?? payload?.reason ?? 'sync';
}

export function useRealtimeDiagnostics() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');
  const [connectedAt, setConnectedAt] = useState<string | null>(null);
  const [lastReadyAt, setLastReadyAt] = useState<string | null>(null);
  const [lastDisconnectAt, setLastDisconnectAt] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastErrorAt, setLastErrorAt] = useState<string | null>(null);
  const [modules, setModules] = useState<Record<ModuleKey, ModuleDiagnostic>>(
    createInitialModules(),
  );
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setConnectionState('disconnected');
      return;
    }

    const socket = getRealtimeSocket();
    if (!socket) return;

    const syncConnectionState = () => {
      if (socket.connected) {
        setConnectionState('connected');
        return;
      }
      setConnectionState(socket.active ? 'reconnecting' : 'connecting');
    };

    const handleConnect = () => {
      setConnectionState('connected');
      setConnectedAt(new Date().toISOString());
    };

    const handleReady = (payload?: { timestamp?: string }) => {
      setLastReadyAt(payload?.timestamp ?? new Date().toISOString());
    };

    const handleDisconnect = (reason?: string) => {
      setConnectionState(socket.active ? 'reconnecting' : 'disconnected');
      setLastDisconnectAt(new Date().toISOString());
      if (reason) {
        setLastError(reason);
        setLastErrorAt(new Date().toISOString());
      }
    };

    const handleConnectError = (error?: Error) => {
      setConnectionState('reconnecting');
      setLastError(error?.message ?? 'Connection error');
      setLastErrorAt(new Date().toISOString());
    };

    const handleReconnectAttempt = () => {
      setConnectionState('reconnecting');
    };

    const bindModule = (module: ModuleKey, eventName: string) => {
      const listener = (payload?: any) => {
        const timestamp = payload?.timestamp ?? new Date().toISOString();
        const type = eventTypeFor(payload);
        const summary = summarizeEvent(module, payload);

        setModules((current) => ({
          ...current,
          [module]: {
            ...current[module],
            eventCount: current[module].eventCount + 1,
            lastEventAt: timestamp,
            lastEventType: type,
            lastSummary: summary,
            isStale: false,
          },
        }));

        setRecentEvents((current) => [
          {
            id: `${module}-${timestamp}-${current.length}`,
            module,
            label: MODULE_CONFIG.find((item) => item.key === module)?.label ?? module,
            eventName,
            timestamp,
            type,
            summary,
          },
          ...current,
        ].slice(0, 25));
      };

      socket.on(eventName, listener);
      return listener;
    };

    const listeners = MODULE_CONFIG.map((item) => ({
      eventName: item.eventName,
      listener: bindModule(item.key, item.eventName),
    }));

    socket.on('connect', handleConnect);
    socket.on('realtime.ready', handleReady);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.io.on('reconnect_attempt', handleReconnectAttempt);
    syncConnectionState();

    if (!socket.connected) {
      socket.connect();
    }

    return () => {
      listeners.forEach(({ eventName, listener }) => {
        socket.off(eventName, listener);
      });
      socket.off('connect', handleConnect);
      socket.off('realtime.ready', handleReady);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.io.off('reconnect_attempt', handleReconnectAttempt);
    };
  }, [isAuthenticated]);

  const moduleList = useMemo(
    () =>
      MODULE_CONFIG.map((item) => {
        const current = modules[item.key];
        const freshnessReference = current.lastEventAt
          ? new Date(current.lastEventAt).getTime()
          : connectedAt
            ? new Date(connectedAt).getTime()
            : 0;
        const isStale =
          connectionState === 'connected' &&
          freshnessReference > 0 &&
          now - freshnessReference > 120_000;

        return {
          ...current,
          isStale,
        };
      }),
    [connectedAt, connectionState, modules, now],
  );

  return {
    connectionState,
    connectedAt,
    lastReadyAt,
    lastDisconnectAt,
    lastError,
    lastErrorAt,
    modules: moduleList,
    recentEvents,
  };
}
