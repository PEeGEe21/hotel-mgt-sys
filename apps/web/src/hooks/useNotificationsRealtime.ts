'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getRealtimeSocket } from '@/lib/realtime';
import { playNotificationSound, primeNotificationSound } from '@/lib/notification-sound';
import { isInAppNotificationSoundEnabled } from '@/lib/notification-sound-settings';
import { useAuthStore } from '@/store/auth.store';

type NotificationSyncPayload = {
  reason?: 'created' | 'read' | 'read-all';
};

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

    const invalidateInbox = (payload?: NotificationSyncPayload) => {
      queryClient.invalidateQueries({ queryKey: ['notifications', 'inbox'] });
      if (payload?.reason === 'created' && isInAppNotificationSoundEnabled()) {
        void playNotificationSound();
      }
    };

    socket.on('notifications.sync', invalidateInbox);

    if (!socket.connected) {
      socket.connect();
    }

    const primeSound = () => {
      void primeNotificationSound();
    };

    window.addEventListener('pointerdown', primeSound, { once: true });
    window.addEventListener('keydown', primeSound, { once: true });

    return () => {
      socket.off('notifications.sync', invalidateInbox);
      window.removeEventListener('pointerdown', primeSound);
      window.removeEventListener('keydown', primeSound);
    };
  }, [isAuthenticated, queryClient]);
}
