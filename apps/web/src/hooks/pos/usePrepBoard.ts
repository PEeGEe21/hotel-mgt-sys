'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { getRealtimeSocket } from '@/lib/realtime';
import { useAuthStore } from '@/store/auth.store';
import openToast from '@/components/ToastComponent';

export type PrepStation = 'NONE' | 'KITCHEN' | 'BAR';
export type PrepStatus = 'QUEUED' | 'IN_PROGRESS' | 'READY' | 'FULFILLED' | 'CANCELLED';

export type PrepBoardTicketItem = {
  id: string;
  name: string;
  quantity: number;
  note: string | null;
  prepStatus: PrepStatus;
  prepStartedAt: string | null;
  prepCompletedAt: string | null;
  bumpedAt: string | null;
};

export type PrepBoardTicket = {
  orderId: string;
  orderNo: string;
  tableNo: string | null;
  roomNo: string | null;
  type: string;
  orderStatus: string;
  isPaid: boolean;
  note: string | null;
  createdAt: string;
  ageMinutes: number;
  urgency: 'normal' | 'warning' | 'critical';
  station: PrepStation;
  staff: { id: string; firstName: string; lastName: string } | null;
  items: PrepBoardTicketItem[];
  prepSummary: {
    totalRoutedItems: number;
    queued: number;
    inProgress: number;
    ready: number;
    fulfilled: number;
    cancelled: number;
    isPrepComplete: boolean;
    hasQueuedPrepItems: boolean;
    hasInProgressPrepItems: boolean;
    hasReadyPrepItems: boolean;
  };
};

export type PrepBoardResponse = {
  station: PrepStation;
  statuses: PrepStatus[];
  summary: {
    station: PrepStation;
    counts: {
      queued: number;
      inProgress: number;
      ready: number;
    };
    ageBuckets: {
      normal: number;
      warning: number;
      critical: number;
    };
    totalTickets: number;
    totalItems: number;
  };
  tickets: PrepBoardTicket[];
};

type PrepSyncPayload = {
  type: 'pos.prep.sync';
  entity: 'pos.prep-item';
  action: 'queued' | 'started' | 'ready' | 'fulfilled' | 'cancelled' | 'rerouted' | 'refired';
  hotelId: string;
  timestamp: string;
  data: {
    orderId: string;
    orderNo: string;
    orderItemId: string;
    prepStation: PrepStation;
    prepStatus: PrepStatus;
    tableNo: string | null;
    roomNo: string | null;
    ticketSummary: {
      itemName: string;
      quantity: number;
      orderType: string;
      note: string | null;
    };
  };
};

export type PrepRealtimeConnectionState =
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected';

export type PrepRealtimeStatus = {
  connectionState: PrepRealtimeConnectionState;
  lastEventAt: string | null;
  lastEventAction: PrepSyncPayload['action'] | null;
  lastEventOrderNo: string | null;
  lastConnectedAt: string | null;
  lastDisconnectedAt: string | null;
  lastErrorAt: string | null;
  isStale: boolean;
};

export function usePrepBoard(
  station: Exclude<PrepStation, 'NONE'>,
  statuses: PrepStatus[] = ['QUEUED', 'IN_PROGRESS', 'READY'],
) {
  return useQuery<PrepBoardResponse>({
    queryKey: ['pos-prep-board', station, statuses],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('station', station);
      if (statuses.length) {
        params.set('statuses', statuses.join(','));
      }
      const { data } = await api.get(`/pos/orders/prep-board?${params}`);
      return data;
    },
    staleTime: 10_000,
    refetchInterval: 60_000,
  });
}

export function useUpdatePrepItemStatus(orderId: string, itemId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (status: PrepStatus) =>
      api.patch(`/pos/orders/${orderId}/items/${itemId}/prep-status`, { status }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos-prep-board'] });
      queryClient.invalidateQueries({ queryKey: ['pos-orders'] });
    },
    onError: (error: any) =>
      openToast('error', error?.response?.data?.message ?? 'Prep status update failed'),
  });
}

export function usePrepRealtime(station?: Exclude<PrepStation, 'NONE'>) {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [connectionState, setConnectionState] = useState<PrepRealtimeConnectionState>('connecting');
  const [lastEventAt, setLastEventAt] = useState<string | null>(null);
  const [lastEventAction, setLastEventAction] = useState<PrepSyncPayload['action'] | null>(null);
  const [lastEventOrderNo, setLastEventOrderNo] = useState<string | null>(null);
  const [lastConnectedAt, setLastConnectedAt] = useState<string | null>(null);
  const [lastDisconnectedAt, setLastDisconnectedAt] = useState<string | null>(null);
  const [lastErrorAt, setLastErrorAt] = useState<string | null>(null);
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

    const handlePrepSync = (payload?: PrepSyncPayload) => {
      if (!payload) return;
      if (station && payload.data.prepStation !== station) return;

      setLastEventAt(payload.timestamp ?? new Date().toISOString());
      setLastEventAction(payload.action);
      setLastEventOrderNo(payload.data.orderNo);

      queryClient.invalidateQueries({ queryKey: ['pos-prep-board'] });
      queryClient.invalidateQueries({ queryKey: ['pos-orders'] });
    };

    const handleConnect = () => {
      setConnectionState('connected');
      setLastConnectedAt(new Date().toISOString());
    };

    const handleDisconnect = () => {
      setConnectionState(socket.active ? 'reconnecting' : 'disconnected');
      setLastDisconnectedAt(new Date().toISOString());
    };

    const handleConnectError = () => {
      setConnectionState('reconnecting');
      setLastErrorAt(new Date().toISOString());
    };

    const handleReconnectAttempt = () => {
      setConnectionState('reconnecting');
    };

    socket.on('pos.prep.sync', handlePrepSync);
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.io.on('reconnect_attempt', handleReconnectAttempt);
    syncConnectionState();

    if (!socket.connected) {
      socket.connect();
    }

    return () => {
      socket.off('pos.prep.sync', handlePrepSync);
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.io.off('reconnect_attempt', handleReconnectAttempt);
    };
  }, [isAuthenticated, queryClient, station]);

  const latestPrepBoardUpdateAt =
    queryClient.getQueryState<PrepBoardResponse>(['pos-prep-board', station, ['QUEUED', 'IN_PROGRESS', 'READY']])
      ?.dataUpdatedAt ?? 0;

  const freshnessReference = Math.max(
    latestPrepBoardUpdateAt,
    lastEventAt ? new Date(lastEventAt).getTime() : 0,
    lastConnectedAt ? new Date(lastConnectedAt).getTime() : 0,
  );

  const isStale =
    connectionState === 'connected' &&
    freshnessReference > 0 &&
    now - freshnessReference > 90_000;

  return useMemo(
    () => ({
      connectionState,
      lastEventAt,
      lastEventAction,
      lastEventOrderNo,
      lastConnectedAt,
      lastDisconnectedAt,
      lastErrorAt,
      isStale,
    }),
    [
      connectionState,
      isStale,
      lastConnectedAt,
      lastDisconnectedAt,
      lastErrorAt,
      lastEventAction,
      lastEventAt,
      lastEventOrderNo,
    ],
  );
}
