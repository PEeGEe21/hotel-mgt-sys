'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import openToast from '@/components/ToastComponent';

export type RealtimeSettings = {
  alertsEnabled: boolean;
  alertCooldownMinutes: number;
  retentionDays: number;
  staleThresholds: {
    notifications: number;
    posOrders: number;
    prep: number;
    housekeeping: number;
    facilities: number;
    presence: number;
  };
};

export function useRealtimeSettings() {
  return useQuery<RealtimeSettings>({
    queryKey: ['realtime-settings'],
    queryFn: async () => {
      const { data } = await api.get('/realtime/settings');
      return {
        alertsEnabled: data?.alertsEnabled === true,
        alertCooldownMinutes:
          typeof data?.alertCooldownMinutes === 'number' ? data.alertCooldownMinutes : 180,
        retentionDays: typeof data?.retentionDays === 'number' ? data.retentionDays : 14,
        staleThresholds: {
          notifications:
            typeof data?.staleThresholds?.notifications === 'number'
              ? data.staleThresholds.notifications
              : 120,
          posOrders:
            typeof data?.staleThresholds?.posOrders === 'number'
              ? data.staleThresholds.posOrders
              : 120,
          prep:
            typeof data?.staleThresholds?.prep === 'number' ? data.staleThresholds.prep : 120,
          housekeeping:
            typeof data?.staleThresholds?.housekeeping === 'number'
              ? data.staleThresholds.housekeeping
              : 120,
          facilities:
            typeof data?.staleThresholds?.facilities === 'number'
              ? data.staleThresholds.facilities
              : 120,
          presence:
            typeof data?.staleThresholds?.presence === 'number'
              ? data.staleThresholds.presence
              : 180,
        },
      };
    },
    staleTime: 15_000,
  });
}

export function useUpdateRealtimeSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: Partial<RealtimeSettings>) =>
      api.patch('/realtime/settings', dto).then((response) => response.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['realtime-settings'] });
      queryClient.invalidateQueries({ queryKey: ['realtime-diagnostics'] });
      openToast('success', 'Realtime diagnostics settings updated');
    },
    onError: (error: any) =>
      openToast('error', error?.response?.data?.message ?? 'Failed to update realtime settings'),
  });
}
