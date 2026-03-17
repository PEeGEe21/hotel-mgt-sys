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
};

export type ShiftTemplateInput = {
  name: string;
  startTime: string;
  endTime: string;
  days?: string[];
  color?: string;
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
