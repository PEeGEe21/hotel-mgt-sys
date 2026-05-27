'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import openToast from '@/components/ToastComponent';
import { Facility } from './useFacility';

const baseUrl = 'facilities/booking';

export type FacilityBooking = {
  id: string;
  facilityId: string;
  facility: Facility;
  reservationId?: string;
  guestId?: string;
  guestName?: string;
  roomNo?: string;
  startTime: string;
  endTime: string;
  durationMins?: number;
  status: string;
  pax?: number;
  amount: number;
  chargeType: string;
  isPaid?: boolean;
  invoiceId?: string;
  hasRoomFolioPosting?: boolean;
  approvedBy?: string;
  approvedAt?: string;
  notes?: string;
  cancelledAt?: string;
  cancelReason?: string;
  refundMethod?: string;
  creditNoteId?: string;
  refundId?: string;
  createdBy?: string;
};

export type FacilityBookingInput = {
  facilityId: string;
  reservationId?: string;
  guestId?: string;
  guestName?: string;
  roomNo?: string;
  startTime: string;
  endTime: string;
  durationMins?: number;
  status?: string;
  pax?: number;
  amount: number;
  chargeType: string;
  isPaid?: boolean;
  invoiceId?: string;
  approvedBy?: string;
  approvedAt?: string;
  notes?: string;
  cancelledAt?: string;
  cancelReason?: string;
  refundMethod?: string;
  creditNoteId?: string;
  refundId?: string;
  createdBy?: string;
};

export type FacilityBookingResponse = {
  bookings: FacilityBooking[];
  total: number;
  page: number;
  totalPages: number;
  meta: any;
};

export type Filters = {
  search?: string;
  page?: number;
  limit?: number;
  facilityId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type CancelFacilityBookingInput = {
  id: string;
  cancelReason?: string;
  refundMethod?: string;
  creditNoteId?: string;
  refundId?: string;
};

export type ApproveFacilityBookingInput = {
  id: string;
  approvedAt?: string;
};

export type CreateFacilityBookingInvoiceInput = {
  id: string;
  dueAt?: string;
  notes?: string;
};

export type RecordFacilityBookingPaymentInput = {
  id: string;
  amount?: number;
  method?: string;
  reference?: string;
  note?: string;
  paidAt?: string;
};

export type PostFacilityBookingToRoomInput = {
  id: string;
  description?: string;
  category?: string;
  quantity?: number;
};

export function useGenerateFacilityPaymentReference() {
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post('finance/payments/reference');
      return data as { reference: string };
    },
    onError: (e: any) =>
      openToast('error', e?.response?.data?.message ?? 'Reference generation failed'),
  });
}

export function useFacilityBookings(filters: Filters = {}) {
  return useQuery<FacilityBookingResponse>({
    queryKey: ['facility-bookings', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.search) params.set('search', filters.search);
      if (filters.page) params.set('page', String(filters.page));
      if (filters.limit) params.set('limit', String(filters.limit));
      if (filters.facilityId) params.set('facilityId', filters.facilityId);
      if (filters.status) params.set('status', filters.status);
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.set('dateTo', filters.dateTo);
      const { data } = await api.get(`${baseUrl}/list?${params}`);
      return data;
    },
    staleTime: 15_000,
    placeholderData: keepPreviousData,
  });
}

export function useCreateFacilityBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: FacilityBookingInput) => api.post(`${baseUrl}`, dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['facility-bookings'] });
      openToast('success', 'Facility Booking created');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Create failed'),
  });
}

export function useUpdateFacilityBooking(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: FacilityBookingInput) =>
      api.patch(`${baseUrl}/${id}`, dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['facility-bookings'] });
      openToast('success', 'Facility Booking updated');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Update failed'),
  });
}

export function useDeleteFacilityBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`${baseUrl}/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['facility-bookings'] });
      openToast('success', 'Facility Booking deleted');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Delete failed'),
  });
}

export function useCancelFacilityBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...dto }: CancelFacilityBookingInput) =>
      api.post(`${baseUrl}/${id}/cancel`, dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['facility-bookings'] });
      openToast('success', 'Facility Booking canceled');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Cancel failed'),
  });
}

export function useApproveFacilityBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...dto }: ApproveFacilityBookingInput) =>
      api.post(`${baseUrl}/${id}/approve`, dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['facility-bookings'] });
      openToast('success', 'Facility booking approved');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Approval failed'),
  });
}

export function useCreateFacilityBookingInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...dto }: CreateFacilityBookingInvoiceInput) =>
      api.post(`${baseUrl}/${id}/invoice`, dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['facility-bookings'] });
      openToast('success', 'Facility booking invoice created');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Invoice creation failed'),
  });
}

export function useRecordFacilityBookingPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...dto }: RecordFacilityBookingPaymentInput) =>
      api.post(`${baseUrl}/${id}/pay`, dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['facility-bookings'] });
      openToast('success', 'Facility booking payment recorded');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Payment recording failed'),
  });
}

export function usePostFacilityBookingToRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...dto }: PostFacilityBookingToRoomInput) =>
      api.post(`${baseUrl}/${id}/post-to-room`, dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['facility-bookings'] });
      openToast('success', 'Facility booking posted to room folio');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Room posting failed'),
  });
}
