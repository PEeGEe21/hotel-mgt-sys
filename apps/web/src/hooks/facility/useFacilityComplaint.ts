'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import openToast from '@/components/ToastComponent';

const baseUrl = 'facilities/complaints';

export type Complaint = {
  id: string;
  complaintNo: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  channel: string;
  reporterType: string;
  reporterStaffId?: string | null;
  reporterGuestId?: string | null;
  reporter?: string | null;
  facility?: { id: string; name: string } | null;
  maintenanceRequest?: { id: string; requestNo: string } | null;
  createdAt: string;
  resolvedAt?: string | null;
  updatedAt?: string | null;
};

export type ComplaintResponse = {
  complaints: Complaint[];
  total: number;
  page: number;
  totalPages: number;
  meta: any;
};

export type ComplaintInput = {
  complaintNo?: string;
  reporterType: string;
  reporterStaffId?: string;
  reporterGuestId?: string;
  channel: string;
  facilityId?: string;
  roomId?: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status?: string;
  maintenanceRequestId?: string;
  resolvedAt?: string;
};

export type ComplaintFilters = {
  search?: string;
  page?: number;
  limit?: number;
  status?: string;
  facilityId?: string;
  reporterType?: string;
  reporterStaffId?: string;
  reporterGuestId?: string;
  channel?: string;
  priority?: string;
};

export function useFacilityComplaints(filters: ComplaintFilters = {}) {
  return useQuery<ComplaintResponse>({
    queryKey: ['facility-complaints', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.search) params.set('search', filters.search);
      if (filters.page) params.set('page', String(filters.page));
      if (filters.limit) params.set('limit', String(filters.limit));
      if (filters.status) params.set('status', filters.status);
      if (filters.facilityId) params.set('facilityId', filters.facilityId);
      if (filters.reporterType) params.set('reporterType', filters.reporterType);
      if (filters.reporterStaffId) params.set('reporterStaffId', filters.reporterStaffId);
      if (filters.reporterGuestId) params.set('reporterGuestId', filters.reporterGuestId);
      if (filters.channel) params.set('channel', filters.channel);
      if (filters.priority) params.set('priority', filters.priority);
      const { data } = await api.get(`${baseUrl}/list?${params}`);
      return data;
    },
    staleTime: 15_000,
    placeholderData: keepPreviousData,
  });
}

export function useCreateFacilityComplaint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: ComplaintInput) => api.post(`${baseUrl}`, dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['facility-complaints'] });
      openToast('success', 'Complaint logged');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Create failed'),
  });
}
