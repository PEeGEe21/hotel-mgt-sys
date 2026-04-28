'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import openToast from '@/components/ToastComponent';
import type { Role } from '@/lib/permissions';
import type { DashboardWidgetSize } from '@/types/dashboard';

export type DashboardAdminWidget = {
  id: string;
  title: string;
  permissionKey: string;
  featureFlag: string | null;
  defaultEnabled: boolean;
  defaultSize: DashboardWidgetSize;
  allowedSizes: DashboardWidgetSize[];
};

export type DashboardAdminLayoutRow = {
  id: string;
  role: Role;
  widgetId: string;
  title: string;
  permissionKey: string;
  featureFlag: string | null;
  defaultSize: DashboardWidgetSize;
  allowedSizes: DashboardWidgetSize[];
  position: number;
  enabled: boolean;
  sizeOverride: DashboardWidgetSize | null;
  size: DashboardWidgetSize;
};

export type DashboardAdminLayoutsResponse = {
  roles: Role[];
  widgets: DashboardAdminWidget[];
  rows: DashboardAdminLayoutRow[];
};

export type DashboardAdminLayoutUpdateRow = {
  role: Role;
  widgetId: string;
  position: number;
  enabled: boolean;
  sizeOverride: DashboardWidgetSize | null;
};

export function useDashboardAdminLayouts() {
  return useQuery<DashboardAdminLayoutsResponse>({
    queryKey: ['dashboard', 'admin', 'layouts'],
    queryFn: async () => {
      const { data } = await api.get('/dashboard/admin/layouts');
      return data;
    },
    staleTime: 30_000,
  });
}

export function useUpdateDashboardAdminLayouts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (rows: DashboardAdminLayoutUpdateRow[]) =>
      api.put('/dashboard/admin/layouts', { rows }).then((response) => response.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      openToast('success', 'Dashboard layout saved');
    },
    onError: (error: any) => {
      openToast('error', error?.response?.data?.message ?? 'Could not save dashboard layout');
    },
  });
}
