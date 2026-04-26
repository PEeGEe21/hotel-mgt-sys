'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import openToast from '@/components/ToastComponent';
import { useAppStore } from '@/store/app.store';

export type HotelProfile = {
  id: string;
  name: string;
  address: string;
  city: string;
  state?: string | null;
  country: string;
  phone: string;
  email: string;
  website?: string | null;
  domain?: string | null;
  logo?: string | null;
  description?: string | null;
  currency: string;
  timezone: string;
  taxRate?: number | string | null;
  latitude?: number | null;
  longitude?: number | null;
  geofenceEnabled: boolean;
  geofenceRadiusMeters?: number;
  attendancePinRequired?: boolean;
  attendanceKioskEnabled?: boolean;
  attendancePersonalEnabled?: boolean;
  defaultCheckoutHour?: number;
  defaultCheckoutMinute?: number;
  guestCheckoutReminderEnabled?: boolean;
  autoCreateCheckoutHousekeepingTasks: boolean;
  cronSettings?: {
    attendanceAbsenceScanEnabled: boolean;
    attendanceAbsenceScanHour: number;
    attendanceAbsenceScanMinute: number;
    attendanceAbsenceScanLastTriggeredAt?: string | null;
    attendanceAbsenceScanLastSucceededAt?: string | null;
    attendanceAbsenceScanLastFailedAt?: string | null;
    attendanceAbsenceScanLastError?: string | null;
    checkoutDueScanEnabled: boolean;
    checkoutDueScanHour: number;
    checkoutDueScanMinute: number;
    checkoutDueScanLastTriggeredAt?: string | null;
    checkoutDueScanLastSucceededAt?: string | null;
    checkoutDueScanLastFailedAt?: string | null;
    checkoutDueScanLastError?: string | null;
  };
};

export function useHotelProfile() {
  return useQuery<HotelProfile>({
    queryKey: ['hotel', 'profile'],
    queryFn: async () => {
      const { data } = await api.get('/hotels/me');
      return data;
    },
  });
}

export function useUpdateHotelProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: Partial<HotelProfile>) => api.patch('/hotels/me', dto).then((r) => r.data),
    onSuccess: (data: HotelProfile) => {
      qc.setQueryData(['hotel', 'profile'], data);
      // Keep global hotel branding in sync without requiring refresh
      useAppStore.getState().setHotel({
        id: data.id,
        name: data.name,
        domain: data?.domain ?? null,
        address: data?.address ?? null,
        city: data.city,
        state: data?.state ?? null,
        country: data.country,
        currency: data.currency,
        timezone: data.timezone,
        logo: data.logo ?? null,
        email: data.email,
        phone: data.phone,
        taxRate: data.taxRate,
        geofenceEnabled: data.geofenceEnabled,
        geofenceRadiusMeters: data.geofenceRadiusMeters,
        attendancePinRequired: data.attendancePinRequired,
        attendanceKioskEnabled: data.attendanceKioskEnabled,
        attendancePersonalEnabled: data.attendancePersonalEnabled,
        defaultCheckoutHour: data.defaultCheckoutHour,
        defaultCheckoutMinute: data.defaultCheckoutMinute,
        guestCheckoutReminderEnabled: data.guestCheckoutReminderEnabled,
        autoCreateCheckoutHousekeepingTasks: data.autoCreateCheckoutHousekeepingTasks,
      });
      openToast('success', 'Hotel profile updated');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Something went wrong';
      openToast('error', msg);
    },
  });
}
