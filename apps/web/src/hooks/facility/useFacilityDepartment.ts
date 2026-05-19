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
      const safeLimit = Math.min(filters.limit ?? 20, 100);
      if (safeLimit) params.set('limit', String(safeLimit));
      const { data } = await api.get(`${baseUrl}/list?${params}`);
      const departments = Array.isArray(data?.departments) ? data.departments : [];
      return {
        departments,
        total: typeof data?.total === 'number' ? data.total : departments.length,
        page: typeof data?.page === 'number' ? data.page : filters.page ?? 1,
        totalPages: typeof data?.totalPages === 'number' ? data.totalPages : 1,
        meta: data?.meta ?? null,
      };
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
