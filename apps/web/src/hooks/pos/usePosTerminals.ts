'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import openToast from '@/components/ToastComponent';

export type PosTerminal = {
  id: string;
  name: string;
  location: string;
  terminalGroupId: string | null;
  terminalGroupName: string | null;
  device: string;
  status: string;
  staffId: string | null;
  staffName: string | null;
  createdAt: string;
};

export type PosTerminalGroup = {
  id: string;
  name: string;
  description?: string;
  level?: number;
  createdAt: string;
};

export type PosTerminalInput = {
  name: string;
  location: string;
  terminalGroupId: string | null;
  device: string;
  status?: string;
  staffId?: string | null;
};

export function usePosTerminals() {
  return useQuery<PosTerminal[]>({
    queryKey: ['pos-terminals'],
    queryFn: async () => {
      const { data } = await api.get('/pos/terminals');
      return data;
    },
  });
}

export function usePosTerminalGroups() {
  return useQuery<PosTerminalGroup[]>({
    queryKey: ['pos-terminal-groups'],
    queryFn: async () => {
      const { data } = await api.get('/pos/terminals/groups');
      return data;
    },
  });
}

export function useCreatePosTerminal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: PosTerminalInput) => api.post('/pos/terminals', dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pos-terminals'] });
      openToast('success', 'Terminal created');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Create failed'),
  });
}

export function useUpdatePosTerminal(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: Partial<PosTerminalInput>) =>
      api.patch(`/pos/terminals/${id}`, dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pos-terminals'] });
      qc.invalidateQueries({ queryKey: ['pos-terminals', id] });
      openToast('success', 'Terminal updated');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Update failed'),
  });
}

export function useDeletePosTerminal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/pos/terminals/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pos-terminals'] });
      openToast('success', 'Terminal removed');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Delete failed'),
  });
}

export function useTerminalStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/pos/terminals/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pos-terminals'] });
      openToast('success', 'Terminal Status updated');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Delete failed'),
  });
}

export function useRenamePosTerminalGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: { from: string; to: string }) =>
      api.patch('/pos/terminals/group', dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pos-terminals'] });
      openToast('success', 'Group updated');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Update failed'),
  });
}
