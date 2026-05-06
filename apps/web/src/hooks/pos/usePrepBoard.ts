'use client';

import { useEffect } from 'react';
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

  useEffect(() => {
    if (!isAuthenticated) return;

    const socket = getRealtimeSocket();
    if (!socket) return;

    const handlePrepSync = (payload?: PrepSyncPayload) => {
      if (!payload) return;
      if (station && payload.data.prepStation !== station) return;

      queryClient.invalidateQueries({ queryKey: ['pos-prep-board'] });
      queryClient.invalidateQueries({ queryKey: ['pos-orders'] });
    };

    socket.on('pos.prep.sync', handlePrepSync);

    if (!socket.connected) {
      socket.connect();
    }

    return () => {
      socket.off('pos.prep.sync', handlePrepSync);
    };
  }, [isAuthenticated, queryClient, station]);
}
