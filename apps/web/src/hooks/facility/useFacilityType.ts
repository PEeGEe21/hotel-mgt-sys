'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import openToast from '@/components/ToastComponent';
const baseUrl = 'facilities/types';
export type FacilityType = {
  id: string;
  name: string;
  description: string;
  facilitiesCount: number;
};

export type FacilityTypeInput = {
  name: string;
  description?: string;
};

export type FacilityTypeResponse = {
  types: FacilityType[];
  total: number;
  page: number;
  totalPages: number;
  meta: any;
};

export type Filters = {
  search?: string;
  page?: number;
  limit?: number;
};

export function useFacilityTypes(filters: Filters = {}) {
  return useQuery<FacilityTypeResponse>({
    queryKey: ['facilities-types', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.search) params.set('search', filters.search);
      if (filters.page) params.set('page', String(filters.page));
      const safeLimit = Math.min(filters.limit ?? 20, 100);
      if (safeLimit) params.set('limit', String(safeLimit));
      const { data } = await api.get(`${baseUrl}/list?${params}`);
      const types = Array.isArray(data?.types) ? data.types : [];
      return {
        types,
        total: typeof data?.total === 'number' ? data.total : types.length,
        page: typeof data?.page === 'number' ? data.page : filters.page ?? 1,
        totalPages: typeof data?.totalPages === 'number' ? data.totalPages : 1,
        meta: data?.meta ?? null,
      };
    },
    staleTime: 15_000,
    placeholderData: keepPreviousData,
  });
}

export function useCreateFacilityType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: FacilityTypeInput) => api.post(`${baseUrl}`, dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['facilities-types'] });
      openToast('success', 'Facility Type created');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Create failed'),
  });
}

export function useUpdateFacilityType(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: FacilityTypeInput) => api.patch(`${baseUrl}/${id}`, dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['facilities-types'] });
      openToast('success', 'Facility Type updated');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Update failed'),
  });
}

export function useDeleteFacilityType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`${baseUrl}/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['facilities-types'] });
      openToast('success', 'Facility Type deleted');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Delete failed'),
  });
}
