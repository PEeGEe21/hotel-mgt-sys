'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import openToast from '@/components/ToastComponent';

export type KeycardStatus = 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'LOST';
export type KeycardType = 'PHYSICAL' | 'MOBILE';

export type ReservationKeycard = {
  id: string;
  reservationId: string;
  roomId: string;
  guestId: string | null;
  cardUid: string | null;
  accessToken: string;
  type: KeycardType;
  status: KeycardStatus;
  validFrom: string;
  validUntil: string;
  issuedAt?: string;
  revokedAt?: string | null;
  revokedReason?: string | null;
  guest?: {
    id: string;
    firstName: string;
    lastName: string;
    phone?: string | null;
  } | null;
  room?: {
    id: string;
    number: string;
    lockDeviceId?: string | null;
    lockVendor?: string | null;
  } | null;
};

export type IssueKeycardInput = {
  reservationId: string;
  roomId: string;
  guestId?: string;
  cardUid?: string;
  type?: KeycardType;
  validFrom?: string;
  validUntil?: string;
};

export function useReservationKeycards(reservationId: string, options: { enabled?: boolean } = {}) {
  return useQuery<{ keycards: ReservationKeycard[] }>({
    queryKey: ['keycards', 'reservation', reservationId],
    queryFn: async () => {
      const { data } = await api.get(`/keycards/reservation/${reservationId}`);
      return data;
    },
    enabled: (options.enabled ?? true) && !!reservationId,
    staleTime: 15_000,
  });
}

export function useIssueKeycard(reservationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: IssueKeycardInput) => api.post('/keycards/issue', dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['keycards', 'reservation', reservationId] });
      openToast('success', 'Keycard issued');
    },
    onError: (e: any) =>
      openToast('error', e?.response?.data?.message ?? 'Could not issue keycard'),
  });
}

export function useRevokeKeycard(reservationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ keycardId, reason }: { keycardId: string; reason?: string }) =>
      api.patch(`/keycards/${keycardId}/revoke`, { reason }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['keycards', 'reservation', reservationId] });
      openToast('success', 'Keycard revoked');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Could not revoke keycard'),
  });
}

export function useReportLostKeycard(reservationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ keycardId, reason }: { keycardId: string; reason?: string }) =>
      api.patch(`/keycards/${keycardId}/report-lost`, { reason }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['keycards', 'reservation', reservationId] });
      openToast('success', 'Keycard marked as lost');
    },
    onError: (e: any) =>
      openToast('error', e?.response?.data?.message ?? 'Could not mark keycard as lost'),
  });
}
