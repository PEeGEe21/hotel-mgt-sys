'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getRealtimeSocket } from '@/lib/realtime';
import { useAuthStore } from '@/store/auth.store';

export function usePresenceRealtime() {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    const socket = getRealtimeSocket();
    if (!socket) return;

    if (!isAuthenticated) {
      socket.disconnect();
      return;
    }

    const invalidatePresenceConsumers = () => {
      queryClient.invalidateQueries({ queryKey: ['user-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    };

    socket.on('presence.sync', invalidatePresenceConsumers);

    if (!socket.connected) {
      socket.connect();
    }

    return () => {
      socket.off('presence.sync', invalidatePresenceConsumers);
    };
  }, [isAuthenticated, queryClient]);
}
