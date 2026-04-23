'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import openToast from '@/components/ToastComponent';

// ─── Types ────────────────────────────────────────────────────────────────────
export type PosTable = {
  id:        string;
  hotelId:   string;
  name:      string;
  section:   string | null;
  capacity:  number | null;
  isActive:  boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  _count?:   { orders: number };
};

export type TableSection = {
  name:   string;
  tables: PosTable[];
};

export type TablesResponse = {
  tables:   PosTable[];
  sections: TableSection[];
  total:    number;
};

export type TableOpenOrders = {
  table:      PosTable;
  orders:     any[];
  total:      number;
  orderCount: number;
};

export type CreateTableInput = {
  name:       string;
  section?:   string;
  capacity?:  number;
  sortOrder?: number;
};

// ─── Hooks ────────────────────────────────────────────────────────────────────
export function usePosTables(includeInactive = false) {
  return useQuery<TablesResponse>({
    queryKey: ['pos-tables', { includeInactive }],
    queryFn:  async () => {
      const params = includeInactive ? '?includeInactive=true' : '';
      const { data } = await api.get(`/pos/tables${params}`);
      return data;
    },
    staleTime: 60_000,
  });
}

export function usePosTable(id: string) {
  return useQuery<PosTable>({
    queryKey: ['pos-tables', id],
    queryFn:  async () => {
      const { data } = await api.get(`/pos/tables/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useTableOpenOrders(id: string | null) {
  return useQuery<TableOpenOrders>({
    queryKey: ['pos-tables', id, 'orders'],
    queryFn:  async () => {
      const { data } = await api.get(`/pos/tables/${id}/orders`);
      return data;
    },
    enabled:        !!id,
    refetchInterval: 30_000, // refresh open orders every 30s on terminal
  });
}

export function useTableSections() {
  return useQuery<string[]>({
    queryKey: ['pos-tables', 'sections'],
    queryFn:  async () => {
      const { data } = await api.get('/pos/tables/sections');
      return data;
    },
    staleTime: 120_000,
  });
}

export function useCreateTable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateTableInput) => api.post('/pos/tables', dto).then(r => r.data),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['pos-tables'] });
      openToast('success', 'Table created');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Could not create table'),
  });
}

export function useUpdateTable(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: Partial<CreateTableInput> & { isActive?: boolean }) =>
      api.put(`/pos/tables/${id}`, dto).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pos-tables'] });
      openToast('success', 'Table updated');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Update failed'),
  });
}

export function useToggleTable(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.patch(`/pos/tables/${id}/toggle`).then(r => r.data),
    onSuccess:  (data: PosTable) => {
      qc.invalidateQueries({ queryKey: ['pos-tables'] });
      openToast('success', data.isActive ? 'Table activated' : 'Table deactivated');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Failed'),
  });
}

export function useDeleteTable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/pos/tables/${id}`).then(r => r.data),
    onSuccess:  (data: any) => {
      qc.invalidateQueries({ queryKey: ['pos-tables'] });
      openToast('success', data.archived ? 'Table deactivated' : 'Table deleted');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Delete failed'),
  });
}

export function useReorderTables() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (items: { id: string; sortOrder: number }[]) =>
      api.post('/pos/tables/reorder', { items }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pos-tables'] }),
    onError:   (e: any) => openToast('error', e?.response?.data?.message ?? 'Reorder failed'),
  });
}

export function useSeedTables() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/pos/tables/seed').then(r => r.data),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['pos-tables'] });
      openToast('success', 'Default tables created');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Seed failed'),
  });
}
