'use client';

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import api from '@/lib/api';
import type { PaginationMeta } from '@/components/ui/pagination';
import openToast from '@/components/ToastComponent';

// ─── Types ────────────────────────────────────────────────────────────────────
export type ApiGuest = {
  id: string;
  hotelId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string;
  nationality: string | null;
  idType: string | null;
  idNumber: string | null;
  dateOfBirth: string | null;
  address: string | null;
  notes: string | null;
  isVip: boolean;
  stayType: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { reservations: number };
  reservations?: any[];
};

export type GuestsResponse = {
  guests: ApiGuest[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  meta: PaginationMeta;
  stats: {
    totalGuests: number;
    inHouse: number;
    reserved: number;
    vips: number;
  };
};

export type GuestFilters = {
  search?: string;
  nationality?: string;
  isVip?: boolean;
  status?: 'in_house' | 'reserved' | 'checked_out';
  stayType?: 'all' | 'full_time' | 'short_time';
  page?: number;
  limit?: number;
};

export type CreateGuestInput = {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  nationality?: string;
  idType?: string;
  idNumber?: string;
  dateOfBirth?: string;
  address?: string;
  notes?: string;
  isVip?: boolean;
  stayType?: string;
  emailOptIn?: boolean;
};

// ─── Hooks ────────────────────────────────────────────────────────────────────
export function useGuests(filters: GuestFilters = {}) {
  return useQuery<GuestsResponse>({
    queryKey: ['guests', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.search) params.set('search', filters.search);
      if (filters.nationality) params.set('nationality', filters.nationality);
      if (filters.isVip !== undefined) params.set('isVip', String(filters.isVip));
      if (filters.status) params.set('status', filters.status);
      if (filters.page) params.set('page', String(filters.page));
      if (filters.limit) params.set('limit', String(filters.limit));
      if (filters.stayType) params.set('stayType', filters.stayType);
      const { data } = await api.get(`/guests?${params}`);
      return data;
    },
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

export function useGuest(id: string) {
  return useQuery<ApiGuest & { lifetimeValue: number }>({
    queryKey: ['guests', id],
    queryFn: async () => {
      const { data } = await api.get(`/guests/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateGuest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateGuestInput) => api.post('/guests', dto).then((r) => r.data),
    onSuccess: () => (
      qc.invalidateQueries({ queryKey: ['guests'] }),
      openToast('success', 'Success')
    ),
  });
}

export function useUpdateGuest(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: Partial<CreateGuestInput>) =>
      api.put(`/guests/${id}`, dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['guests'] });
      qc.invalidateQueries({ queryKey: ['guests', id] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Something went wrong';
      openToast('error', msg);
    },
  });
}

export function useToggleVip(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.patch(`/guests/${id}/vip`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['guests'] });
      qc.invalidateQueries({ queryKey: ['guests', id] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Something went wrong';
      openToast('error', msg);
    },
  });
}

export function useDeleteGuest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/guests/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['guests'] }),
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Something went wrong';
      openToast('error', msg);
    },
  });
}
