'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getRealtimeSocket } from '@/lib/realtime';
import { useAuthStore } from '@/store/auth.store';

export function useNotificationsRealtime() {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    const socket = getRealtimeSocket();
    if (!socket) return;

    if (!isAuthenticated) {
      socket.disconnect();
      return;
    }

    const invalidateInbox = () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', 'inbox'] });
    };

    socket.on('notifications.sync', invalidateInbox);

    if (!socket.connected) {
      socket.connect();
    }

    return () => {
      socket.off('notifications.sync', invalidateInbox);
    };
  }, [isAuthenticated, queryClient]);
}
