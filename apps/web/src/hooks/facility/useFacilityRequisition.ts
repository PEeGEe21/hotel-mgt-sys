'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import openToast from '@/components/ToastComponent';

const baseUrl = 'facilities/requisitions';

export type FacilityRequisition = {
  id: string;
  hotelId?: string;
  facilityId: string;
  requestedBy: string;
  title: string;
  description?: string | null;
  priority: string;
  status: string;
  items: any;
  estimatedTotal?: number | string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  fulfilledAt?: string | null;
  rejectionReason?: string | null;
  inventoryLinked?: boolean;
  createdAt: string;
  updatedAt: string;
  facility?: { id: string; name: string } | null;
  requestedByStaff?: { id: string; firstName: string; lastName: string } | null;
  approvedByStaff?: { id: string; firstName: string; lastName: string } | null;
};

export type FacilityRequisitionInput = {
  facilityId: string;
  requestedBy?: string;
  title: string;
  description?: string;
  priority: string;
  status?: string;
  items: any;
  estimatedTotal?: number;
  approvedBy?: string;
  approvedAt?: string;
  fulfilledAt?: string;
  rejectionReason?: string;
  inventoryLinked?: boolean;
};

export type FacilityRequisitionResponse = {
  requisitions: FacilityRequisition[];
  total: number;
  page: number;
  totalPages: number;
  meta: any;
};

export type FacilityRequisitionFilters = {
  search?: string;
  page?: number;
  limit?: number;
  facilityId?: string;
  status?: string;
  priority?: string;
  dateFrom?: string;
  dateTo?: string;
};

export function useFacilityRequisitions(filters: FacilityRequisitionFilters = {}) {
  return useQuery<FacilityRequisitionResponse>({
    queryKey: ['facility-requisitions', filters],
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

export function useCreateFacilityRequisition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: FacilityRequisitionInput) => api.post(baseUrl, dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['facility-requisitions'] });
      openToast('success', 'Requisition created');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Create failed'),
  });
}

export function useUpdateFacilityRequisition(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: Partial<FacilityRequisitionInput>) =>
      api.patch(`${baseUrl}/${id}`, dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['facility-requisitions'] });
      openToast('success', 'Requisition updated');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Update failed'),
  });
}

export function useUpdateFacilityRequisitionStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...dto }: { id: string } & Partial<FacilityRequisitionInput>) =>
      api.patch(`${baseUrl}/${id}`, dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['facility-requisitions'] });
      openToast('success', 'Requisition updated');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Update failed'),
  });
}
