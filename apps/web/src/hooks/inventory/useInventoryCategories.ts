'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import openToast from '@/components/ToastComponent';

export type InventoryCategory = {
  id: string;
  name: string;
  description: string;
  color: string;
  itemCount: number;
};

export type InventoryCategoryInput = {
  name: string;
  description?: string;
  color?: string;
};

export function useInventoryCategories() {
  return useQuery<InventoryCategory[]>({
    queryKey: ['inventory-categories'],
    queryFn: async () => {
      const { data } = await api.get('/inventory-categories');
      return data;
    },
  });
}

export function useCreateInventoryCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: InventoryCategoryInput) => api.post('/inventory-categories', dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-categories'] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['inventory-list'] });
      qc.invalidateQueries({ queryKey: ['inventory-simple'] });
      openToast('success', 'Category created');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Create failed'),
  });
}

export function useUpdateInventoryCategory(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: InventoryCategoryInput) => api.patch(`/inventory-categories/${id}`, dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-categories'] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['inventory-list'] });
      qc.invalidateQueries({ queryKey: ['inventory-simple'] });
      openToast('success', 'Category updated');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Update failed'),
  });
}

export function useDeleteInventoryCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/inventory-categories/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-categories'] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['inventory-list'] });
      qc.invalidateQueries({ queryKey: ['inventory-simple'] });
      openToast('success', 'Category deleted');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Delete failed'),
  });
}
