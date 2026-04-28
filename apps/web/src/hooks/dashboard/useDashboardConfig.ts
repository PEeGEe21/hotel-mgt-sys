'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { DashboardConfigResponse } from '@/types/dashboard';

export function useDashboardConfig() {
  return useQuery<DashboardConfigResponse>({
    queryKey: ['dashboard', 'config'],
    queryFn: async () => {
      const { data } = await api.get('/dashboard/config');
      return data;
    },
    staleTime: 60_000,
  });
}
