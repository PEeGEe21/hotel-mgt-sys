'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import openToast from '@/components/ToastComponent';
const baseUrl = 'facilities/locations';
export type FacilityLocation = {
  id: string;
  name: string;
  building: string;
  floor: string;
  description: string;
  facilitiesCount: number;
};

export type FacilityLocationInput = {
  name: string;
  description?: string;
};

export type FacilityLocationResponse = {
  locations: FacilityLocation[];
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

export function useFacilityLocations(filters: Filters = {}) {
  return useQuery<FacilityLocationResponse>({
    queryKey: ['facilities-locations', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.search) params.set('search', filters.search);
      if (filters.page) params.set('page', String(filters.page));
      if (filters.limit) params.set('limit', String(filters.limit));
      const { data } = await api.get(`${baseUrl}/list?${params}`);
      return data;
    },
    staleTime: 15_000,
    placeholderData: keepPreviousData,
  });
}

export function useCreateFacilityLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: FacilityLocationInput) => api.post(`${baseUrl}`, dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['facilities-locations'] });
      openToast('success', 'Location created');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Create failed'),
  });
}

export function useUpdateFacilityLocation(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: FacilityLocationInput) =>
      api.patch(`${baseUrl}/${id}`, dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['facilities-locations'] });
      openToast('success', 'Location updated');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Update failed'),
  });
}

export function useDeleteFacilityLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`${baseUrl}/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['facilities-locations'] });
      openToast('success', 'Location deleted');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Delete failed'),
  });
}
