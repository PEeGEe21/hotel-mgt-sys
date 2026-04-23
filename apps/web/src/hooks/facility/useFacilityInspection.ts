'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import openToast from '@/components/ToastComponent';

const baseUrl = 'facilities/inspections';

export type FacilityInspection = {
  id: string;
  hotelId?: string;
  inspectionNo: string;
  inspectionType: string;
  scheduledBy: string;
  inspectorName?: string | null;
  inspectorOrganization?: string | null;
  facilityId?: string | null;
  area?: string | null;
  scheduledAt: string;
  checklist?: any;
  findings?: string | null;
  score?: number | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  facility?: { id: string; name: string } | null;
  scheduledByStaff?: { id: string; firstName: string; lastName: string } | null;
};

export type FacilityInspectionInput = {
  inspectionNo?: string;
  inspectionType: string;
  scheduledBy?: string;
  inspectorName?: string;
  inspectorOrganization?: string;
  facilityId?: string;
  area?: string;
  scheduledAt: string;
  checklist?: any;
  findings?: string;
  score?: number;
  status?: string;
};

export type FacilityInspectionResponse = {
  inspections: FacilityInspection[];
  total: number;
  page: number;
  totalPages: number;
  meta: any;
};

export type FacilityInspectionFilters = {
  search?: string;
  page?: number;
  limit?: number;
  facilityId?: string;
  status?: string;
  inspectionType?: string;
  dateFrom?: string;
  dateTo?: string;
};

export function useFacilityInspections(filters: FacilityInspectionFilters = {}) {
  return useQuery<FacilityInspectionResponse>({
    queryKey: ['facility-inspections', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.search) params.set('search', filters.search);
      if (filters.page) params.set('page', String(filters.page));
      if (filters.limit) params.set('limit', String(filters.limit));
      if (filters.facilityId) params.set('facilityId', filters.facilityId);
      if (filters.status) params.set('status', filters.status);
      if (filters.inspectionType) params.set('inspectionType', filters.inspectionType);
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.set('dateTo', filters.dateTo);
      const { data } = await api.get(`${baseUrl}/list?${params}`);
      return data;
    },
    staleTime: 15_000,
    placeholderData: keepPreviousData,
  });
}

export function useCreateFacilityInspection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: FacilityInspectionInput) => api.post(baseUrl, dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['facility-inspections'] });
      openToast('success', 'Inspection scheduled');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Create failed'),
  });
}

export function useUpdateFacilityInspection(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: Partial<FacilityInspectionInput>) =>
      api.patch(`${baseUrl}/${id}`, dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['facility-inspections'] });
      openToast('success', 'Inspection updated');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Update failed'),
  });
}
