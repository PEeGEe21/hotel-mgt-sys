'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import openToast from '@/components/ToastComponent';

export type ShiftTemplate = {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  days: string[];
  color: string;
  _count?: {
    defaultStaff: number;
  };
};

export type ShiftTemplateInput = {
  name: string;
  startTime: string;
  endTime: string;
  days?: string[];
  color?: string;
};

export type ShiftOverride = {
  id: string;
  staffId: string;
  shiftTemplateId: string;
  isActive: boolean;
  dateFrom: string;
  dateTo: string;
  reason?: string | null;
  staff: {
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
    department: string;
    position: string;
  };
  shiftTemplate: ShiftTemplate;
};

export type ShiftOverrideInput = {
  staffId: string;
  shiftTemplateId: string;
  isActive?: boolean;
  dateFrom: string;
  dateTo: string;
  reason?: string;
};

export function useShiftTemplates() {
  return useQuery<ShiftTemplate[]>({
    queryKey: ['shift-templates'],
    queryFn: async () => {
      const { data } = await api.get('/shifts');
      return data;
    },
  });
}

export function useCreateShiftTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: ShiftTemplateInput) => api.post('/shifts', dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shift-templates'] });
      openToast('success', 'Shift template created');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Create failed'),
  });
}

export function useUpdateShiftTemplate(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: ShiftTemplateInput) => api.patch(`/shifts/${id}`, dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shift-templates'] });
      openToast('success', 'Shift template updated');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Update failed'),
  });
}

export function useDeleteShiftTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/shifts/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shift-templates'] });
      openToast('success', 'Shift template deleted');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Delete failed'),
  });
}

export function useShiftOverrides(filters: { staffId?: string; dateFrom?: string; dateTo?: string } = {}) {
  return useQuery<ShiftOverride[]>({
    queryKey: ['shift-overrides', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.staffId) params.set('staffId', filters.staffId);
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.set('dateTo', filters.dateTo);
      const { data } = await api.get(`/shifts/overrides/list?${params}`);
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useCreateShiftOverride() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: ShiftOverrideInput) => api.post('/shifts/overrides', dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shift-overrides'] });
      qc.invalidateQueries({ queryKey: ['staff'] });
      openToast('success', 'Shift override created');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Create failed'),
  });
}

export function useUpdateShiftOverride(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: Partial<ShiftOverrideInput>) =>
      api.patch(`/shifts/overrides/${id}`, dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shift-overrides'] });
      qc.invalidateQueries({ queryKey: ['staff'] });
      openToast('success', 'Shift override updated');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Update failed'),
  });
}

export function useDeleteShiftOverride() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/shifts/overrides/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shift-overrides'] });
      qc.invalidateQueries({ queryKey: ['staff'] });
      openToast('success', 'Shift override removed');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Delete failed'),
  });
}
