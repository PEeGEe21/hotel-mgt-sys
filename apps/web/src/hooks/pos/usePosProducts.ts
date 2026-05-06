'use client';

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import api from '@/lib/api';
import openToast from '@/components/ToastComponent';

// ─── Types ────────────────────────────────────────────────────────────────────
export type ProductType = 'PHYSICAL' | 'SERVICE' | 'BUNDLE';
export type PrepStation = 'NONE' | 'KITCHEN' | 'BAR';

export type InventoryItemOption = {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  sku: string;
  category: string;
};

export type ProductIngredient = {
  id: string;
  inventoryItemId: string;
  quantity: number;
  unit: string | null;
  inventoryItem: InventoryItemOption;
};

export type ApiProduct = {
  id: string;
  hotelId: string;
  name: string;
  sku: string | null;
  description: string | null;
  price: number;
  categoryId: string;
  unit: string;
  image: string | null;
  isAvailable: boolean;
  stock: number | null;
  type: ProductType;
  prepStation: PrepStation;
  createdAt: string;
  updatedAt: string;
  ingredients: ProductIngredient[];
  _count?: { orderItems: number };
  category: { name: string; id: string; color?: string | null; icon?: string | null };
};

export type CreateProductInput = {
  name: string;
  price: number;
  categoryId: string;
  type: ProductType;
  sku?: string;
  description?: string;
  unit?: string;
  image?: string;
  isAvailable?: boolean;
  stock?: number;
  prepStation?: PrepStation;
  ingredients?: { inventoryItemId: string; quantity: number; unit?: string }[];
};

export type ProductFilters = {
  search?: string;
  category?: string;
  type?: string;
  isAvailable?: string;
  page?: number;
  limit?: number;
};

export type ProductsResponse = {
  products: ApiProduct[];
  total: number;
  page: number;
  totalPages: number;
  meta: any;
  categories: string[];
};

// ─── Hooks ────────────────────────────────────────────────────────────────────
export function usePosProducts(filters: ProductFilters = {}) {
  return useQuery<ProductsResponse>({
    queryKey: ['pos-products', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.search) params.set('search', filters.search);
      if (filters.category) params.set('category', filters.category);
      if (filters.type) params.set('type', filters.type);
      if (filters.isAvailable) params.set('isAvailable', filters.isAvailable);
      if (filters.page) params.set('page', String(filters.page));
      if (filters.limit) params.set('limit', String(filters.limit));
      const { data } = await api.get(`/pos/products?${params}`);
      return data;
    },
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

export function usePosProduct(id: string) {
  return useQuery<ApiProduct>({
    queryKey: ['pos-products', id],
    queryFn: async () => {
      const { data } = await api.get(`/pos/products/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useProductCategories() {
  return useQuery<string[]>({
    queryKey: ['pos-products', 'categories'],
    queryFn: async () => {
      const { data } = await api.get('/pos/products/categories');
      return data;
    },
    staleTime: 60_000,
  });
}

export function useInventoryItemOptions(search?: string) {
  return useQuery<InventoryItemOption[]>({
    queryKey: ['pos-products', 'inventory-items', search],
    queryFn: async () => {
      const params = search ? `?search=${encodeURIComponent(search)}` : '';
      const { data } = await api.get(`/pos/products/inventory-items${params}`);
      return data;
    },
    staleTime: 30_000,
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateProductInput) => api.post('/pos/products', dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pos-products'] });
      openToast('success', 'Product created');
    },
    onError: (e: any) =>
      openToast('error', e?.response?.data?.message ?? 'Could not create product'),
  });
}

export function useUpdateProduct(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: Partial<CreateProductInput>) =>
      api.put(`/pos/products/${id}`, dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pos-products'] });
      openToast('success', 'Product updated');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Update failed'),
  });
}

export function useToggleProduct(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.patch(`/pos/products/${id}/toggle`).then((r) => r.data),
    onSuccess: (data: ApiProduct) => {
      qc.invalidateQueries({ queryKey: ['pos-products'] });
      openToast(
        'success',
        data.isAvailable ? 'Product marked available' : 'Product marked unavailable',
      );
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Failed'),
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/pos/products/${id}`).then((r) => r.data),
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ['pos-products'] });
      openToast('success', data.archived ? 'Product archived' : 'Product deleted');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Delete failed'),
  });
}
