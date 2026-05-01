'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import openToast from '@/components/ToastComponent';

type PushSettingsResponse = {
  enabled: boolean;
  publicKey: string | null;
};

export type PushStatusResponse = {
  summary: {
    totalSubscriptions: number;
    healthySubscriptions: number;
    failingSubscriptions: number;
    neverTestedSubscriptions: number;
  };
  subscriptions: Array<{
    id: string;
    endpointPreview: string;
    userAgent: string | null;
    createdAt: string;
    updatedAt: string;
    lastAttemptAt: string | null;
    lastSuccessAt: string | null;
    lastFailureAt: string | null;
    lastFailureReason: string | null;
    lastFailureStatusCode: number | null;
    lastDeliveredEvent: string | null;
    health: 'healthy' | 'failing' | 'never_tested';
  }>;
  recentDeliveries: Array<{
    id: string;
    event: string;
    title: string;
    status: string;
    failureReason: string | null;
    failureStatusCode: number | null;
    endpointPreview: string;
    correlationId: string | null;
    isTest: boolean;
    deliveredAt: string | null;
    createdAt: string;
  }>;
  lastTestResult: {
    id: string;
    event: string;
    title: string;
    status: string;
    failureReason: string | null;
    failureStatusCode: number | null;
    endpointPreview: string;
    correlationId: string | null;
    isTest: boolean;
    deliveredAt: string | null;
    createdAt: string;
  } | null;
};

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

async function getServiceWorkerRegistration() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    throw new Error('Service workers are not supported in this browser.');
  }

  const existing = await navigator.serviceWorker.getRegistration('/push-sw.js');
  if (existing) return existing;
  return navigator.serviceWorker.register('/push-sw.js');
}

export function usePushSettings() {
  return useQuery<PushSettingsResponse>({
    queryKey: ['notifications', 'push-settings'],
    queryFn: async () => {
      const { data } = await api.get('/notifications/push/settings');
      return data;
    },
    staleTime: 60_000,
  });
}

export function usePushStatus() {
  return useQuery<PushStatusResponse>({
    queryKey: ['notifications', 'push-status'],
    queryFn: async () => {
      const { data } = await api.get('/notifications/push/status');
      return data;
    },
    staleTime: 15_000,
  });
}

export function useEnablePushNotifications() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (publicKey: string) => {
      if (typeof window === 'undefined' || !('Notification' in window)) {
        throw new Error('Browser notifications are not supported on this device.');
      }

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        throw new Error('Notification permission was not granted.');
      }

      const registration = await getServiceWorkerRegistration();
      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        }));

      const json = subscription.toJSON();
      const p256dh = json.keys?.p256dh;
      const auth = json.keys?.auth;

      if (!json.endpoint || !p256dh || !auth) {
        throw new Error('Push subscription is missing required keys.');
      }

      await api.post('/notifications/push/subscriptions', {
        endpoint: json.endpoint,
        p256dh,
        auth,
      });

      return { subscribed: true };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications', 'push-status'] });
      openToast('success', 'Browser push notifications enabled');
    },
    onError: (error: any) =>
      openToast('error', error?.message ?? 'Failed to enable browser push notifications'),
  });
}

export function useDisablePushNotifications() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
        return { removed: 0 };
      }

      const registration = await navigator.serviceWorker.getRegistration('/push-sw.js');
      const subscription = await registration?.pushManager.getSubscription();

      if (subscription) {
        const json = subscription.toJSON();
        if (json.endpoint) {
          await api.delete('/notifications/push/subscriptions', {
            data: { endpoint: json.endpoint },
          });
        }
        await subscription.unsubscribe();
      }

      return { removed: subscription ? 1 : 0 };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications', 'push-status'] });
      openToast('success', 'Browser push notifications disabled');
    },
    onError: (error: any) =>
      openToast('error', error?.message ?? 'Failed to disable browser push notifications'),
  });
}
