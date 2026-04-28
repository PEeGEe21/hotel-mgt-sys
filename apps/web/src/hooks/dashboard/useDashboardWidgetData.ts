'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

export function useDashboardWidgetData<T = any>(widgetId: string) {
  const user = useAuthStore((s) => s.user);
  const authScope = user
    ? `${user.id}:${user.role}:${user.impersonatorId ?? 'self'}`
    : 'anonymous';

  return useQuery<T>({
    queryKey: ['dashboard', 'widget', widgetId, authScope],
    queryFn: async () => {
      const { data } = await api.get(`/dashboard/widgets/${widgetId}`);
      return data;
    },
    enabled: Boolean(user && widgetId),
    staleTime: 30_000,
  });
}
