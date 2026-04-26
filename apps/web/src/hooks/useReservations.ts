'use client';

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import api from '@/lib/api';
import openToast from '@/components/ToastComponent';
import { PaginationMeta } from '@/components/ui/pagination';

// ─── Types ────────────────────────────────────────────────────────────────────
export type ReservationStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CHECKED_IN'
  | 'CHECKED_OUT'
  | 'CANCELLED'
  | 'NO_SHOW';

export type PaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID' | 'REFUNDED';

export type ApiReservation = {
  id: string;
  hotelId: string;
  reservationNo: string;
  guestId: string;
  roomId: string;
  companyId: string | null;
  groupBookingId: string | null;
  bookingType: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  status: ReservationStatus;
  paymentStatus: PaymentStatus;
  totalAmount: number;
  paidAmount: number;
  source: string;
  specialRequests: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  // Relations
  guest?: { id: string; firstName: string; lastName: string; isVip: boolean; phone: string };
  room?: { id: string; number: string; type: string; baseRate?: number; floor?: { name: string } };
  company?: { id: string; name: string; email?: string; contactName?: string } | null;
  groupBooking?: { id: string; groupNo: string; name: string } | null;
  guests?: {
    id: string;
    role: string;
    guest: { id: string; firstName: string; lastName: string; isVip: boolean };
  }[];
  folioItems?: {
    id: string;
    description: string;
    amount: number;
    category: string;
    createdAt: string;
  }[];
  invoices?: {
    id: string;
    invoiceNo: string;
    total: number;
    paymentStatus: PaymentStatus;
    issuedAt: string;
    payments?: {
      id: string;
      amount: number;
      method: string;
      reference?: string | null;
      paidAt: string;
      note?: string | null;
    }[];
  }[];
  _count?: { folioItems: number };
};

export type AvailableRoom = {
  id: string;
  number: string;
  type: string;
  baseRate: number;
  maxGuests: number;
  amenities: string[];
  floor?: { name: string; level: number } | null;
};

export type ReservationsResponse = {
  reservations: ApiReservation[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  meta: PaginationMeta & { per_page: number };
  stats: {
    arrivals: number;
    departures: number;
    inHouse: number;
    pending: number;
  };
};

export type ReservationFilters = {
  status?: ReservationStatus;
  checkoutTiming?: 'dueTomorrow' | 'dueToday' | 'overdue';
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  roomId?: string;
  guestId?: string;
  page?: number;
  limit?: number;
};

export type CreateReservationInput = {
  guestId: string;
  roomId: string;
  checkIn: string;
  checkOut: string;
  adults?: number;
  children?: number;
  source?: string;
  specialRequests?: string;
  notes?: string;
  companyId?: string;
  groupBookingId?: string;
  bookingType?: string;
  totalAmount?: number;
};

// ─── Hooks ────────────────────────────────────────────────────────────────────
export function useReservations(filters: ReservationFilters = {}) {
  return useQuery<ReservationsResponse>({
    queryKey: ['reservations', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.status) params.set('status', filters.status);
      if (filters.checkoutTiming) params.set('checkoutTiming', filters.checkoutTiming);
      if (filters.search) params.set('search', filters.search);
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.set('dateTo', filters.dateTo);
      if (filters.roomId) params.set('roomId', filters.roomId);
      if (filters.guestId) params.set('guestId', filters.guestId);
      if (filters.page) params.set('page', String(filters.page));
      if (filters.limit) params.set('limit', String(filters.limit));
      const { data } = await api.get(`/reservations?${params}`);
      return data;
    },
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

export function useReservation(id: string) {
  return useQuery<ApiReservation>({
    queryKey: ['reservations', id],
    queryFn: async () => {
      const { data } = await api.get(`/reservations/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useAvailableRooms(
  params: { checkIn: string; checkOut: string; type?: string; minGuests?: number } | null,
) {
  return useQuery<AvailableRoom[]>({
    queryKey: ['rooms', 'availability', params],
    queryFn: async () => {
      const p = new URLSearchParams();
      p.set('checkIn', params!.checkIn);
      p.set('checkOut', params!.checkOut);
      if (params!.type) p.set('type', params!.type);
      if (params!.minGuests) p.set('minGuests', String(params!.minGuests));
      const { data } = await api.get(`/reservations/availability?${p}`);
      return data;
    },
    enabled: !!params?.checkIn && !!params?.checkOut,
    staleTime: 60_000,
  });
}

export function useCreateReservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateReservationInput) => api.post('/reservations', dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reservations'] });
      qc.invalidateQueries({ queryKey: ['rooms'] });
      openToast('success', 'Reservation created');
    },
    onError: (e: any) =>
      openToast('error', e?.response?.data?.message ?? 'Could not create reservation'),
  });
}

export function useUpdateReservation(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (
      dto: Partial<CreateReservationInput & { paidAmount: number; paymentStatus: string }>,
    ) => api.put(`/reservations/${id}`, dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reservations'] });
      qc.invalidateQueries({ queryKey: ['reservations', id] });
      openToast('success', 'Reservation updated');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Update failed'),
  });
}

export function useRecordReservationPayment(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: {
      amount: number;
      method: string;
      reference?: string;
      note?: string;
      paidAt?: string;
    }) => api.post(`/reservations/${id}/payments`, dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reservations'] });
      qc.invalidateQueries({ queryKey: ['reservations', id] });
      openToast('success', 'Payment recorded');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Payment failed'),
  });
}

export function useCheckIn(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.patch(`/reservations/${id}/check-in`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reservations'] });
      qc.invalidateQueries({ queryKey: ['rooms'] });
      openToast('success', 'Guest checked in');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Check-in failed'),
  });
}

export function useCheckOut(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.patch(`/reservations/${id}/check-out`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reservations'] });
      qc.invalidateQueries({ queryKey: ['rooms'] });
      openToast('success', 'Guest checked out');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Check-out failed'),
  });
}

export function useCancelReservation(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.patch(`/reservations/${id}/cancel`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reservations'] });
      qc.invalidateQueries({ queryKey: ['rooms'] });
      openToast('success', 'Reservation cancelled');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Cancel failed'),
  });
}

export function useNoShow(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.patch(`/reservations/${id}/no-show`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reservations'] });
      qc.invalidateQueries({ queryKey: ['rooms'] });
      openToast('success', 'Marked as no-show');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Failed'),
  });
}

export function useAddFolioItem(reservationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: {
      description: string;
      amount: number;
      category: string;
      quantity?: number;
    }) => api.post(`/reservations/${reservationId}/folio`, dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reservations', reservationId] });
      qc.invalidateQueries({ queryKey: ['reservations', reservationId, 'folio-items'] });
      openToast('success', 'Charge added');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Failed to add charge'),
  });
}
