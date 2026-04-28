'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { DashboardFeatureFlagsResponse } from '@/types/dashboard';

export function useDashboardFeatureFlags() {
  return useQuery<DashboardFeatureFlagsResponse>({
    queryKey: ['dashboard', 'feature-flags'],
    queryFn: async () => {
      const { data } = await api.get('/dashboard/feature-flags');
      return data;
    },
    staleTime: 60_000,
  });
}
