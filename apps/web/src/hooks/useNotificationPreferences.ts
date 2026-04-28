'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import openToast from '@/components/ToastComponent';

export type NotificationEvent =
  | 'newReservation'
  | 'checkIn'
  | 'checkOut'
  | 'paymentReceived'
  | 'lowInventory'
  | 'housekeepingAlert'
  | 'maintenanceAlert'
  | 'attendanceAlert'
  | 'systemAlerts';

export type NotificationPreference = {
  event: NotificationEvent;
  channelEmail: boolean;
  channelInApp: boolean;
  channelPush: boolean;
};

export function useNotificationPreferences() {
  return useQuery<NotificationPreference[]>({
    queryKey: ['notifications', 'preferences'],
    queryFn: async () => {
      const { data } = await api.get('/notifications/preferences');
      return data;
    },
    staleTime: 60_000,
  });
}

export function useUpdateNotificationPreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (preferences: NotificationPreference[]) =>
      api.patch('/notifications/preferences', { preferences }).then((r) => r.data),
    onSuccess: (data: NotificationPreference[]) => {
      qc.setQueryData(['notifications', 'preferences'], data);
      openToast('success', 'Preferences updated');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Update failed'),
  });
}
