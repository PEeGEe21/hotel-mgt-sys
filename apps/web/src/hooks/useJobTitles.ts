'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import openToast from '@/components/ToastComponent';

export type JobTitle = {
  id: string;
  name: string;
  description: string;
  color: string;
  departmentId?: string | null;
  departmentName: string;
  staffCount: number;
};

export type JobTitleInput = {
  name: string;
  description?: string;
  departmentId?: string;
  color?: string;
};

export function useJobTitles() {
  return useQuery<JobTitle[]>({
    queryKey: ['job-titles'],
    queryFn: async () => {
      const { data } = await api.get('/job-titles');
      return data;
    },
  });
}

export function useCreateJobTitle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: JobTitleInput) => api.post('/job-titles', dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['job-titles'] });
      qc.invalidateQueries({ queryKey: ['staff'] });
      openToast('success', 'Job title created');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Create failed'),
  });
}

export function useUpdateJobTitle(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: JobTitleInput) => api.patch(`/job-titles/${id}`, dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['job-titles'] });
      qc.invalidateQueries({ queryKey: ['staff'] });
      qc.invalidateQueries({ queryKey: ['user-accounts'] });
      openToast('success', 'Job title updated');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Update failed'),
  });
}

export function useDeleteJobTitle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/job-titles/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['job-titles'] });
      qc.invalidateQueries({ queryKey: ['staff'] });
      qc.invalidateQueries({ queryKey: ['user-accounts'] });
      openToast('success', 'Job title deleted');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Delete failed'),
  });
}
