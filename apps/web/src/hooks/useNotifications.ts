'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import openToast from '@/components/ToastComponent';
import { PaginationMeta } from '@/components/ui/pagination';

export type AppNotificationEvent =
  | 'newReservation'
  | 'checkIn'
  | 'checkOut'
  | 'checkOutDue'
  | 'paymentReceived'
  | 'lowInventory'
  | 'housekeepingAlert'
  | 'maintenanceAlert'
  | 'attendanceAlert'
  | 'systemAlerts';

export type AppNotification = {
  id: string;
  userId: string;
  hotelId: string;
  event: AppNotificationEvent;
  title: string;
  message: string;
  metadata: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
};

export type NotificationsInboxResponse = {
  items: AppNotification[];
  unreadCount: number;
  meta: PaginationMeta;
};

export function useNotifications(options: { limit?: number; page?: number; unreadOnly?: boolean } = {}) {
  const limit = options.limit ?? 12;
  const page = options.page ?? 1;
  const unreadOnly = options.unreadOnly ?? false;

  return useQuery<NotificationsInboxResponse>({
    queryKey: ['notifications', 'inbox', { limit, page, unreadOnly }],
    queryFn: async () => {
      const { data } = await api.get('/notifications', {
        params: { limit, page, unreadOnly },
      });
      return data;
    },
    staleTime: 20_000,
    refetchInterval: 60_000,
  });
}

export function useMarkNotificationAsRead() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications', 'inbox'] });
    },
    onError: (e: any) =>
      openToast('error', e?.response?.data?.message ?? 'Failed to update notification'),
  });
}

export function useMarkAllNotificationsAsRead() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => api.patch('/notifications/read-all').then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications', 'inbox'] });
      openToast('success', 'Notifications marked as read');
    },
    onError: (e: any) =>
      openToast('error', e?.response?.data?.message ?? 'Failed to update notifications'),
  });
}
