'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getRealtimeSocket } from '@/lib/realtime';
import { useAuthStore } from '@/store/auth.store';

type OperationsRealtimeScope = 'housekeeping' | 'facilities-maintenance';

export function useOperationsRealtime(scope: OperationsRealtimeScope) {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) return;

    const socket = getRealtimeSocket();
    if (!socket) return;

    const invalidateHousekeeping = () => {
      queryClient.invalidateQueries({ queryKey: ['housekeeping'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    };

    const invalidateFacilitiesMaintenance = () => {
      queryClient.invalidateQueries({ queryKey: ['facility-maintenance'] });
    };

    if (scope === 'housekeeping') {
      socket.on('housekeeping.tasks.sync', invalidateHousekeeping);
    }

    if (scope === 'facilities-maintenance') {
      socket.on('facilities.maintenance.sync', invalidateFacilitiesMaintenance);
    }

    if (!socket.connected) {
      socket.connect();
    }

    return () => {
      socket.off('housekeeping.tasks.sync', invalidateHousekeeping);
      socket.off('facilities.maintenance.sync', invalidateFacilitiesMaintenance);
    };
  }, [isAuthenticated, queryClient, scope]);
}
