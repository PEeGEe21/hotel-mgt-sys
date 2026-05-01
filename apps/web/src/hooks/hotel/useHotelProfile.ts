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
  guestCheckoutReminderLeadDays?: number[];
  autoCreateCheckoutHousekeepingTasks: boolean;
  housekeepingFollowUpEnabled?: boolean;
  housekeepingFollowUpGraceHours?: number;
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
    upcomingArrivalScanEnabled: boolean;
    upcomingArrivalScanHour: number;
    upcomingArrivalScanMinute: number;
    upcomingArrivalScanLastTriggeredAt?: string | null;
    upcomingArrivalScanLastSucceededAt?: string | null;
    upcomingArrivalScanLastFailedAt?: string | null;
    upcomingArrivalScanLastError?: string | null;
    overduePaymentScanEnabled: boolean;
    overduePaymentScanHour: number;
    overduePaymentScanMinute: number;
    overduePaymentScanLastTriggeredAt?: string | null;
    overduePaymentScanLastSucceededAt?: string | null;
    overduePaymentScanLastFailedAt?: string | null;
    overduePaymentScanLastError?: string | null;
    housekeepingFollowUpScanEnabled: boolean;
    housekeepingFollowUpScanHour: number;
    housekeepingFollowUpScanMinute: number;
    housekeepingFollowUpScanLastTriggeredAt?: string | null;
    housekeepingFollowUpScanLastSucceededAt?: string | null;
    housekeepingFollowUpScanLastFailedAt?: string | null;
    housekeepingFollowUpScanLastError?: string | null;
    noShowFollowUpScanEnabled: boolean;
    noShowFollowUpScanHour: number;
    noShowFollowUpScanMinute: number;
    noShowFollowUpScanLastTriggeredAt?: string | null;
    noShowFollowUpScanLastSucceededAt?: string | null;
    noShowFollowUpScanLastFailedAt?: string | null;
    noShowFollowUpScanLastError?: string | null;
    maintenanceEscalationScanEnabled: boolean;
    maintenanceEscalationScanHour: number;
    maintenanceEscalationScanMinute: number;
    maintenanceEscalationScanLastTriggeredAt?: string | null;
    maintenanceEscalationScanLastSucceededAt?: string | null;
    maintenanceEscalationScanLastFailedAt?: string | null;
    maintenanceEscalationScanLastError?: string | null;
    dailyDigestScanEnabled: boolean;
    dailyDigestScanHour: number;
    dailyDigestScanMinute: number;
    dailyDigestScanLastTriggeredAt?: string | null;
    dailyDigestScanLastSucceededAt?: string | null;
    dailyDigestScanLastFailedAt?: string | null;
    dailyDigestScanLastError?: string | null;
  };
};

export type RunnableHotelCronJob =
  | 'attendanceAbsenceScan'
  | 'upcomingArrivalScan'
  | 'checkoutDueScan'
  | 'overduePaymentScan'
  | 'housekeepingFollowUpScan'
  | 'noShowFollowUpScan'
  | 'maintenanceEscalationScan'
  | 'dailyDigestScan';

export type RunHotelCronJobResponse = {
  job: RunnableHotelCronJob;
  result: Record<string, unknown>;
  profile: HotelProfile;
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
        guestCheckoutReminderLeadDays: data.guestCheckoutReminderLeadDays,
        autoCreateCheckoutHousekeepingTasks: data.autoCreateCheckoutHousekeepingTasks,
        housekeepingFollowUpEnabled: data.housekeepingFollowUpEnabled,
        housekeepingFollowUpGraceHours: data.housekeepingFollowUpGraceHours,
      });
      openToast('success', 'Hotel profile updated');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Something went wrong';
      openToast('error', msg);
    },
  });
}

export function useRunHotelCronJob() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (job: RunnableHotelCronJob) =>
      api.post('/hotels/me/cron/run', { job }).then((r) => r.data as RunHotelCronJobResponse),
    onSuccess: (data) => {
      qc.setQueryData(['hotel', 'profile'], data.profile);
      useAppStore.getState().setHotel({
        ...(useAppStore.getState().hotel ?? {}),
        ...data.profile,
      });
      openToast('success', 'Scheduler job completed');
    },
    onError: (err: any) => {
      openToast('error', err?.response?.data?.message ?? 'Could not run scheduler job');
    },
  });
}
