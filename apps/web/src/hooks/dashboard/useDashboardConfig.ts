'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { DashboardConfigResponse } from '@/types/dashboard';
import { useAuthStore } from '@/store/auth.store';

export function useDashboardConfig() {
  const user = useAuthStore((s) => s.user);
  const authScope = user
    ? `${user.id}:${user.role}:${user.impersonatorId ?? 'self'}`
    : 'anonymous';

  return useQuery<DashboardConfigResponse>({
    queryKey: ['dashboard', 'config', authScope],
    queryFn: async () => {
      const { data } = await api.get('/dashboard/config');
      return data;
    },
    enabled: Boolean(user),
    staleTime: 60_000,
  });
}
