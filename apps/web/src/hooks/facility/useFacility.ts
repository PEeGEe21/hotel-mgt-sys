'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import openToast from '@/components/ToastComponent';

const baseUrl = 'facilities';

export type Facility = {
  id: string;
  name: string;
  type: string | null;
  location: string | null;
  department: string | null;
  status: string | null;
  quantities: number;
  manager: string | null;
  description: string | null;
  inspections: number;
  typeId?: string | null;
  locationId?: string | null;
  departmentId?: string | null;
  managerId?: string | null;
  capacity?: number | null;
  openTime?: string | null;
  closeTime?: string | null;
  operatingSchedule?: any;
  baseRate?: number | null;
  rateUnit?: string | null;
  requiresApproval?: boolean;
  minDurationMins?: number | null;
  maxDurationMins?: number | null;
  images?: string[];
  amenities?: string[];
};

export type FacilityInput = {
  name: string;
  type: string;
  description?: string;
  capacity?: number;
  status?: string;
  openTime?: string;
  closeTime?: string;
  operatingSchedule?: any;
  baseRate?: number;
  rateUnit?: string;
  requiresApproval?: boolean;
  minDurationMins?: number;
  maxDurationMins?: number;
  images?: string[];
  amenities?: string[];
  typeId?: string;
  locationId?: string;
  departmentId?: string;
  managerId: string;
};

export type FacilityStats = {
  total: number;
  active: number;
  inactive: number;
  maintenance: number;
};

export type FacilityResponse = {
  facilities: Facility[];
  stats: FacilityStats;
  total: number;
  page: number;
  totalPages: number;
  meta: any;
};

export type Filters = {
  search?: string;
  page?: number;
  limit?: number;
  type?: string;
  status?: string;
};

export function useFacilities(filters: Filters = {}) {
  return useQuery<FacilityResponse>({
    queryKey: ['facilities', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.search) params.set('search', filters.search);
      if (filters.page) params.set('page', String(filters.page));
      if (filters.limit) params.set('limit', String(filters.limit));
      if (filters.type) params.set('type', filters.type);
      if (filters.status) params.set('status', filters.status);
      const { data } = await api.get(`${baseUrl}?${params}`);
      return data;
    },
    staleTime: 15_000,
    placeholderData: keepPreviousData,
  });
}

export function useCreateFacility() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: FacilityInput) => api.post(`${baseUrl}`, dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['facilities'] });
      openToast('success', 'Facility created');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Create failed'),
  });
}

export function useUpdateFacility(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: FacilityInput) =>
      api.patch(`${baseUrl}/${id}`, dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['facilities'] });
      openToast('success', 'Facility updated');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Update failed'),
  });
}

export function useDeleteFacility() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`${baseUrl}/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['facilities'] });
      openToast('success', 'Facility deleted');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Delete failed'),
  });
}
