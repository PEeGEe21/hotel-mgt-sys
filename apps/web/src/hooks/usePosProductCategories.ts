'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import openToast from '@/components/ToastComponent';

export type PosProductCategory = {
  id: string;
  name: string;
  description: string;
  color: string;
};

export type PosProductCategoryInput = {
  name: string;
  description?: string;
  color?: string;
};

export function usePosProductCategories() {
  return useQuery<PosProductCategory[]>({
    queryKey: ['pos-products-categories'],
    queryFn: async () => {
      const { data } = await api.get('/pos/products/categories');
      return data;
    },
  });
}

export function useCreatePosProductCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: PosProductCategoryInput) =>
      api.post('/pos/products/categories', dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pos-products-categories'] });
      qc.invalidateQueries({ queryKey: ['pos-products'] });
      qc.invalidateQueries({ queryKey: ['pos-products-list'] });
      openToast('success', 'Category created');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Create failed'),
  });
}

export function useUpdatePosProductCategory(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: PosProductCategoryInput) =>
      api.patch(`/pos/products/categories/${id}`, dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pos-products-categories'] });
      qc.invalidateQueries({ queryKey: ['pos-products'] });
      qc.invalidateQueries({ queryKey: ['pos-products-list'] });
      openToast('success', 'Category updated');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Update failed'),
  });
}

export function useDeletePosProductCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/pos/products/categories/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pos-products-categories'] });
      qc.invalidateQueries({ queryKey: ['pos-products'] });
      qc.invalidateQueries({ queryKey: ['pos-products-list'] });
      openToast('success', 'Category deleted');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Delete failed'),
  });
}
