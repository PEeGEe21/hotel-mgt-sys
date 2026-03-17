'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import openToast from '@/components/ToastComponent';

export type InventoryItem = {
  id: string;
  uniqueId: string;
  name: string;
  sku: string;
  category: string;
  description?: string | null;
  unit: string;
  quantity: number;
  minStock: number;
  costPrice: number;
  sellPrice?: number | null;
  supplier?: string | null;
};

export type InventoryStats = {
  totalItems: number;
  lowStockCount: number;
  totalValue: number;
  todaySales: number;
  todayTransactions: number;
  lowStockItems: {
    id: string;
    name: string;
    quantity: number;
    minStock: number;
    supplier?: string | null;
  }[];
};

export type InventoryListResponse = {
  items: InventoryItem[];
  meta: {
    total: number;
    current_page: number;
    per_page: number;
    last_page: number;
    from: number;
    to: number;
  };
  stats: InventoryStats;
};

export function useInventoryItems() {
  return useQuery<InventoryItem[]>({
    queryKey: ['inventory-simple'],
    queryFn: async () => {
      const { data } = await api.get('/inventory', { params: { page: 1, limit: 1000 } });
      return data.items ?? [];
    },
  });
}

export function useInventoryList(params: {
  page: number;
  limit: number;
  search?: string;
  category?: string;
}) {
  return useQuery<InventoryListResponse>({
    queryKey: ['inventory-list', params],
    queryFn: async () => {
      const { data } = await api.get('/inventory', { params });
      return data;
    },
  });
}

export type InventoryItemInput = {
  name: string;
  sku: string;
  category: string;
  description?: string;
  unit: string;
  quantity: number;
  minStock: number;
  costPrice: number;
  sellPrice?: number | null;
  supplier?: string;
  location?: string;
};

export function useCreateInventoryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: InventoryItemInput) => api.post('/inventory', dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-list'] });
      qc.invalidateQueries({ queryKey: ['inventory-simple'] });
      openToast('success', 'Item added');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Create failed'),
  });
}

export function useUpdateInventoryItem(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: Partial<InventoryItemInput>) =>
      api.patch(`/inventory/${id}`, dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-list'] });
      qc.invalidateQueries({ queryKey: ['inventory-simple'] });
      openToast('success', 'Item updated');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Update failed'),
  });
}

export function useDeleteInventoryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/inventory/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-list'] });
      qc.invalidateQueries({ queryKey: ['inventory-simple'] });
      openToast('success', 'Item removed');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Delete failed'),
  });
}

export function useGerateItemSku() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.get('/inventory/generate-sku').then((r) => r.data),
    onSuccess: (data: { sku: string }) => {
      qc.invalidateQueries({ queryKey: ['inventory-list'] });
      return data;
    },
  });
}
