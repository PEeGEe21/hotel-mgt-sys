'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getRealtimeSocket } from '@/lib/realtime';
import { useAuthStore } from '@/store/auth.store';

export function useDashboardPosRealtime() {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) return;

    const socket = getRealtimeSocket();
    if (!socket) return;

    const invalidateDashboardPos = () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'widget', 'active_pos_orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'widget', 'pos_sales_today'] });
    };

    socket.on('pos.orders.sync', invalidateDashboardPos);
    socket.on('pos.prep.sync', invalidateDashboardPos);

    if (!socket.connected) {
      socket.connect();
    }

    return () => {
      socket.off('pos.orders.sync', invalidateDashboardPos);
      socket.off('pos.prep.sync', invalidateDashboardPos);
    };
  }, [isAuthenticated, queryClient]);
}
