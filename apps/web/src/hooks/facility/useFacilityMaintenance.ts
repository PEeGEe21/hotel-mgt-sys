'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import openToast from '@/components/ToastComponent';

const baseUrl = 'facilities/maintenances';

export type FacilityMaintenanceRequest = {
  id: string;
  facilityId?: string | null;
  roomId?: string | null;
  requestNo: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  reportedBy?: string | null;
  assignedTo?: string | null;
  assignedAt?: string | null;
  startedAt?: string | null;
  resolvedAt?: string | null;
  closedAt?: string | null;
  estimatedMins?: number | null;
  actualMins?: number | null;
  partsUsed?: any;
  totalCost?: number | string | null;
  images?: string[];
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  facility?: { id: string; name: string } | null;
  assignedToStaff?: { id: string; firstName: string; lastName: string } | null;
};

export type FacilityMaintenanceInput = {
  facilityId?: string;
  roomId?: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status?: string;
  reportedBy?: string;
  assignedTo?: string;
  assignedAt?: string;
  startedAt?: string;
  resolvedAt?: string;
  closedAt?: string;
  estimatedMins?: number;
  actualMins?: number;
  totalCost?: number;
  partsUsed?: Record<string, unknown>;
  images?: string[];
  notes?: string;
  inspectionId?: string;
  verificationInspectionId?: string;
};

export type FacilityMaintenanceResponse = {
  maintenanceRequests: FacilityMaintenanceRequest[];
  total: number;
  page: number;
  totalPages: number;
  meta: any;
};

export type FacilityMaintenanceFilters = {
  search?: string;
  page?: number;
  limit?: number;
  facilityId?: string;
  status?: string;
  priority?: string;
  dateFrom?: string;
  dateTo?: string;
};

export function useFacilityMaintenance(filters: FacilityMaintenanceFilters = {}) {
  return useQuery<FacilityMaintenanceResponse>({
    queryKey: ['facility-maintenance', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.search) params.set('search', filters.search);
      if (filters.page) params.set('page', String(filters.page));
      if (filters.limit) params.set('limit', String(filters.limit));
      if (filters.facilityId) params.set('facilityId', filters.facilityId);
      if (filters.status) params.set('status', filters.status);
      if (filters.priority) params.set('priority', filters.priority);
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.set('dateTo', filters.dateTo);
      const { data } = await api.get(`${baseUrl}/list?${params}`);
      return data;
    },
    staleTime: 15_000,
    placeholderData: keepPreviousData,
  });
}

export function useCreateFacilityMaintenance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: FacilityMaintenanceInput) => api.post(baseUrl, dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['facility-maintenance'] });
      openToast('success', 'Maintenance request created');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Create failed'),
  });
}

export function useUpdateFacilityMaintenance(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: Partial<FacilityMaintenanceInput>) =>
      api.patch(`${baseUrl}/${id}`, dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['facility-maintenance'] });
      openToast('success', 'Maintenance request updated');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Update failed'),
  });
}
