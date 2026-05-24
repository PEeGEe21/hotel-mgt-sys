'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import openToast from '@/components/ToastComponent';

export type TenantSupportCase = {
  id: string;
  category: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'OPEN' | 'TRIAGED' | 'IN_PROGRESS' | 'WAITING_ON_HOTEL' | 'RESOLVED' | 'CLOSED';
  subject: string;
  source: 'HOTEL' | 'PLATFORM' | 'SYSTEM';
  requestType: 'PLAN_UPGRADE' | 'BILLING_CONTACT_CHANGE' | 'FEATURE_ACTIVATION' | null;
  requestPayload: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  assignedAdminName: string | null;
};

export type TenantSupportCaseDetail = {
  id: string;
  category: string;
  priority: TenantSupportCase['priority'];
  status: TenantSupportCase['status'];
  subject: string;
  description: string;
  source: TenantSupportCase['source'];
  requestType: TenantSupportCase['requestType'];
  requestPayload: TenantSupportCase['requestPayload'];
  createdAt: string;
  updatedAt: string;
  assignedAdminName: string | null;
  createdByName: string | null;
  events: Array<{
    id: string;
    type: string;
    payload: unknown;
    createdAt: string;
    actorName: string;
  }>;
  comments: Array<{
    id: string;
    body: string;
    visibility: 'HOTEL_VISIBLE' | 'INTERNAL';
    createdAt: string;
    authorName: string;
  }>;
};

export type TenantSupportCasesResponse = {
  cases: TenantSupportCase[];
  statusCounts: Record<string, number>;
  canViewHotelWide: boolean;
};

export function useTenantSupportCases(filters?: { status?: string; priority?: string; search?: string }) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters ?? {})) {
    const trimmed = value?.trim();
    if (trimmed) params.set(key, trimmed);
  }

  return useQuery<TenantSupportCasesResponse>({
    queryKey: ['tenant-support', 'cases', filters],
    queryFn: async () => {
      const { data } = await api.get(`/support/cases${params.toString() ? `?${params.toString()}` : ''}`);
      return data;
    },
  });
}

export function useTenantSupportCaseDetail(id: string) {
  return useQuery<TenantSupportCaseDetail>({
    queryKey: ['tenant-support', 'case', id],
    queryFn: async () => {
      const { data } = await api.get(`/support/cases/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateTenantSupportCase() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      category: string;
      priority?: string;
      subject: string;
      description: string;
      requestType?: 'PLAN_UPGRADE' | 'BILLING_CONTACT_CHANGE' | 'FEATURE_ACTIVATION';
      requestPayload?: Record<string, unknown>;
    }) =>
      api.post('/support/cases', payload).then((response) => response.data as TenantSupportCaseDetail),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenant-support', 'cases'] });
      qc.invalidateQueries({ queryKey: ['hotel', 'entitlements'] });
      openToast('success', 'Support request submitted');
    },
    onError: (error: any) => {
      openToast('error', error?.response?.data?.message ?? 'Failed to submit support request');
    },
  });
}
