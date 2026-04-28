'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { DashboardFeatureFlagsResponse } from '@/types/dashboard';
import { useAuthStore } from '@/store/auth.store';

export function useDashboardFeatureFlags() {
  const user = useAuthStore((s) => s.user);
  const authScope = user
    ? `${user.id}:${user.role}:${user.impersonatorId ?? 'self'}`
    : 'anonymous';

  return useQuery<DashboardFeatureFlagsResponse>({
    queryKey: ['dashboard', 'feature-flags', authScope],
    queryFn: async () => {
      const { data } = await api.get('/dashboard/feature-flags');
      return data;
    },
    enabled: Boolean(user),
    staleTime: 60_000,
  });
}
