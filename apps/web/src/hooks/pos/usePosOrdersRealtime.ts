'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getRealtimeSocket } from '@/lib/realtime';
import { useAuthStore } from '@/store/auth.store';
import type { ApiOrder, OrderFilters, OrdersResponse } from '@/hooks/pos/usePosOrders';

type PosOrdersSyncPayload = {
  type: 'pos.orders.sync';
  entity: 'pos.order';
  action: 'created' | 'updated' | 'status_changed' | 'paid' | 'cancelled';
  hotelId: string;
  timestamp: string;
  data: {
    orderId: string;
    orderNo: string;
    status: 'PENDING' | 'PREPARING' | 'READY' | 'DELIVERED' | 'CANCELLED';
    isPaid: boolean;
    posTerminalId: string | null;
    tableNo: string | null;
    roomNo: string | null;
    reservationId: string | null;
  };
};

function syncOrderIntoList(
  current: OrdersResponse | undefined,
  filters: OrderFilters,
  payload: PosOrdersSyncPayload,
) {
  if (!current) return current;

  const nextOrders = current.orders
    .map((order) =>
      order.id === payload.data.orderId
        ? {
            ...order,
            status: payload.data.status,
            isPaid: payload.data.isPaid,
            posTerminalId: payload.data.posTerminalId,
            tableNo: payload.data.tableNo,
            roomNo: payload.data.roomNo,
            reservationId: payload.data.reservationId,
          }
        : order,
    )
    .filter((order) => {
      if (filters.status && order.status !== filters.status) return false;
      if (filters.posTerminalId && order.posTerminalId !== filters.posTerminalId) return false;
      if (filters.tableNo && order.tableNo !== filters.tableNo) return false;
      if (filters.search) {
        const search = filters.search.toLowerCase();
        const haystack = [order.orderNo, order.tableNo, order.roomNo]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    });

  return {
    ...current,
    orders: nextOrders,
  };
}

function syncOrderDetail(current: ApiOrder | undefined, payload: PosOrdersSyncPayload) {
  if (!current || current.id !== payload.data.orderId) return current;

  return {
    ...current,
    status: payload.data.status,
    isPaid: payload.data.isPaid,
    posTerminalId: payload.data.posTerminalId,
    tableNo: payload.data.tableNo,
    roomNo: payload.data.roomNo,
    reservationId: payload.data.reservationId,
  };
}

type PosOrdersRealtimeOptions = {
  enabled?: boolean;
};

export function usePosOrdersRealtime(options: PosOrdersRealtimeOptions = {}) {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const shouldConnect = options.enabled ?? isAuthenticated;

  useEffect(() => {
    const socket = getRealtimeSocket();
    if (!socket) return;

    if (!shouldConnect) {
      socket.disconnect();
      return;
    }

    const invalidatePosData = (payload?: PosOrdersSyncPayload) => {
      if (payload) {
        const cachedOrderLists = queryClient.getQueriesData<OrdersResponse>({
          queryKey: ['pos-orders'],
        });

        for (const [queryKey, current] of cachedOrderLists) {
          if (
            !Array.isArray(queryKey) ||
            queryKey[0] !== 'pos-orders' ||
            !queryKey[1] ||
            Array.isArray(queryKey[1]) ||
            typeof queryKey[1] !== 'object' ||
            !current ||
            !('orders' in current)
          ) {
            continue;
          }

          queryClient.setQueryData(
            queryKey,
            syncOrderIntoList(current, queryKey[1] as OrderFilters, payload),
          );
        }

        queryClient.setQueryData<ApiOrder>(
          ['pos-orders', payload.data.orderId],
          (current) => syncOrderDetail(current, payload),
        );
      }

      queryClient.invalidateQueries({ queryKey: ['pos-orders'] });
      queryClient.invalidateQueries({ queryKey: ['pos-orders', 'table'] });
      queryClient.invalidateQueries({ queryKey: ['pos-orders', 'z-report'] });
      queryClient.invalidateQueries({ queryKey: ['pos-tables'] });

      if (
        payload?.action === 'paid' ||
        payload?.data.status === 'DELIVERED' ||
        payload?.data.reservationId
      ) {
        queryClient.invalidateQueries({ queryKey: ['reservations'] });
      }
    };

    socket.on('pos.orders.sync', invalidatePosData);

    if (!socket.connected) {
      socket.connect();
    }

    return () => {
      socket.off('pos.orders.sync', invalidatePosData);
    };
  }, [queryClient, shouldConnect]);
}
