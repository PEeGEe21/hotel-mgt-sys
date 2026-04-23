'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import openToast from '@/components/ToastComponent';
const baseUrl = 'facilities/departments';
export type FacilityDepartment = {
  id: string;
  name: string;
  description: string;
  headId?: string | null;
  head?: { name: string; id: string } | null;
  facilitiesCount: number;
};

export type FacilityDepartmentInput = {
  name: string;
  description?: string;
  headId?: string;
};

export type FacilityDepartmentResponse = {
  departments: FacilityDepartment[];
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

export function useFacilityDepartments(filters: Filters = {}) {
  return useQuery<FacilityDepartmentResponse>({
    queryKey: ['facilities-departments', filters],
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

export function useCreateFacilityDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: FacilityDepartmentInput) => api.post(`${baseUrl}`, dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['facilities-departments'] });
      openToast('success', 'Department created');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Create failed'),
  });
}

export function useUpdateFacilityDepartment(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: FacilityDepartmentInput) =>
      api.patch(`${baseUrl}/${id}`, dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['facilities-departments'] });
      openToast('success', 'Department updated');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Update failed'),
  });
}

export function useDeleteFacilityDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`${baseUrl}/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['facilities-departments'] });
      openToast('success', 'Department deleted');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Delete failed'),
  });
}
