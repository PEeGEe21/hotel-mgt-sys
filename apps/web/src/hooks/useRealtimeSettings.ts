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
      return data;
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
