'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import openToast from '@/components/ToastComponent';
import { PaginationMeta } from '@/components/ui/pagination';
import type { NotificationMetadata } from '@/lib/notification-links';

export type AppNotificationEvent =
  | 'newReservation'
  | 'checkIn'
  | 'checkOut'
  | 'upcomingArrival'
  | 'checkOutDue'
  | 'paymentOverdue'
  | 'paymentReceived'
  | 'lowInventory'
  | 'housekeepingAlert'
  | 'noShowFollowUp'
  | 'maintenanceAlert'
  | 'maintenanceEscalation'
  | 'attendanceAlert'
  | 'dailyDigest'
  | 'systemAlerts';

export type AppNotification = {
  id: string;
  userId: string;
  hotelId: string;
  event: AppNotificationEvent;
  title: string;
  message: string;
  metadata: NotificationMetadata;
  readAt: string | null;
  pinnedAt?: string | null;
  archivedAt?: string | null;
  createdAt: string;
};

export type NotificationsInboxResponse = {
  items: AppNotification[];
  unreadCount: number;
  meta: PaginationMeta;
};

export function useNotifications(options: {
  limit?: number;
  page?: number;
  unreadOnly?: boolean;
  event?: AppNotificationEvent;
  includeArchived?: boolean;
  pinnedOnly?: boolean;
} = {}) {
  const limit = options.limit ?? 12;
  const page = options.page ?? 1;
  const unreadOnly = options.unreadOnly ?? false;
  const event = options.event;
  const includeArchived = options.includeArchived ?? false;
  const pinnedOnly = options.pinnedOnly ?? false;

  return useQuery<NotificationsInboxResponse>({
    queryKey: ['notifications', 'inbox', { limit, page, unreadOnly, event, includeArchived, pinnedOnly }],
    queryFn: async () => {
      const { data } = await api.get('/notifications', {
        params: { limit, page, unreadOnly, event, includeArchived, pinnedOnly },
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

function invalidateNotifications(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['notifications', 'inbox'] });
}

export function useArchiveNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/archive`).then((r) => r.data),
    onSuccess: () => invalidateNotifications(qc),
    onError: (e: any) =>
      openToast('error', e?.response?.data?.message ?? 'Failed to archive notification'),
  });
}

export function useUnarchiveNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/unarchive`).then((r) => r.data),
    onSuccess: () => invalidateNotifications(qc),
    onError: (e: any) =>
      openToast('error', e?.response?.data?.message ?? 'Failed to restore notification'),
  });
}

export function usePinNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/pin`).then((r) => r.data),
    onSuccess: () => invalidateNotifications(qc),
    onError: (e: any) =>
      openToast('error', e?.response?.data?.message ?? 'Failed to pin notification'),
  });
}

export function useUnpinNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/unpin`).then((r) => r.data),
    onSuccess: () => invalidateNotifications(qc),
    onError: (e: any) =>
      openToast('error', e?.response?.data?.message ?? 'Failed to unpin notification'),
  });
}

export function useBulkNotificationAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      action: 'read' | 'archive' | 'unarchive' | 'pin' | 'unpin';
      ids: string[];
    }) => api.patch('/notifications/bulk', payload).then((r) => r.data),
    onSuccess: (_, payload) => {
      invalidateNotifications(qc);
      const labelMap = {
        read: 'Notifications marked as read',
        archive: 'Notifications archived',
        unarchive: 'Notifications restored',
        pin: 'Notifications pinned',
        unpin: 'Notifications unpinned',
      } as const;
      openToast('success', labelMap[payload.action]);
    },
    onError: (e: any) =>
      openToast('error', e?.response?.data?.message ?? 'Failed to update notifications'),
  });
}
