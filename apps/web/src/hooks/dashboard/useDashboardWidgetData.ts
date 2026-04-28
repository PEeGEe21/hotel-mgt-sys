'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export function useDashboardWidgetData<T = any>(widgetId: string) {
  return useQuery<T>({
    queryKey: ['dashboard', 'widget', widgetId],
    queryFn: async () => {
      const { data } = await api.get(`/dashboard/widgets/${widgetId}`);
      return data;
    },
    staleTime: 30_000,
  });
}
