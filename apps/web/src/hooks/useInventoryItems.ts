'use client';

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import api from '@/lib/api';
import openToast from '@/components/ToastComponent';

// ─── Types ────────────────────────────────────────────────────────────────────
export type InventoryItem = {
  id: string;
  uniqueId: string;
  name: string;
  sku: string;
  category: string;
  description: string | null;
  unit: string;
  quantity: number;
  minStock: number;
  costPrice: number;
  sellPrice: number | null;
  supplier: string | null;
  location: string | null;
  createdAt: string;
  updatedAt: string;
};

export type StockMovement = {
  id: string;
  hotelId: string;
  itemId: string;
  type: 'IN' | 'OUT' | 'WASTAGE' | 'ADJUSTMENT';
  quantity: number;
  note: string | null;
  sourceType: string | null;
  sourceId: string | null;
  staffId: string | null;
  createdAt: string;
  item?: {
    id: string;
    name: string;
    unit: string;
    category: string;
  };
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
    supplier: string | null;
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

export type MovementsResponse = {
  movements: StockMovement[];
  meta: {
    total: number;
    current_page: number;
    per_page: number;
    last_page: number;
    from: number;
    to: number;
  };
};

export type ValuationResponse = {
  summary: {
    totalItems: number;
    totalCost: number;
    totalValue: number;
    grossMargin: number;
  };
  byCategory: Record<
    string,
    {
      items: number;
      totalCost: number;
      totalValue: number;
      margin: number;
    }
  >;
  items: InventoryItem[];
};

// ─── Hooks ────────────────────────────────────────────────────────────────────
export function useInventoryList(
  filters: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
  } = {},
) {
  return useQuery<InventoryListResponse>({
    queryKey: ['inventory', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.page) params.set('page', String(filters.page));
      if (filters.limit) params.set('limit', String(filters.limit));
      if (filters.search) params.set('search', filters.search);
      if (filters.category) params.set('category', filters.category);
      const { data } = await api.get(`/inventory?${params}`);
      return data;
    },
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

export function useInventoryItem(id: string) {
  return useQuery<InventoryItem & { movements: StockMovement[] }>({
    queryKey: ['inventory', id],
    queryFn: async () => {
      const { data } = await api.get(`/inventory/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useInventoryMovements(
  filters: {
    itemId?: string;
    type?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  } = {},
) {
  return useQuery<MovementsResponse>({
    queryKey: ['inventory-movements', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.itemId) params.set('itemId', filters.itemId);
      if (filters.type) params.set('type', filters.type);
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.set('dateTo', filters.dateTo);
      if (filters.page) params.set('page', String(filters.page));
      if (filters.limit) params.set('limit', String(filters.limit));
      const { data } = await api.get(`/inventory/movements?${params}`);
      return data;
    },
    staleTime: 15_000,
    placeholderData: keepPreviousData,
  });
}

export function useInventoryValuation() {
  return useQuery<ValuationResponse>({
    queryKey: ['inventory-valuation'],
    queryFn: async () => {
      const { data } = await api.get('/inventory/valuation');
      return data;
    },
    staleTime: 60_000,
  });
}

export function useCreateInventoryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: Partial<InventoryItem> & { costPrice: number }) =>
      api.post('/inventory', dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
      openToast('success', 'Item created');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Could not create item'),
  });
}

export function useUpdateInventoryItem(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: Partial<InventoryItem> & { costPrice?: number }) =>
      api.patch(`/inventory/${id}`, dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
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
      qc.invalidateQueries({ queryKey: ['inventory'] });
      openToast('success', 'Item deleted');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Delete failed'),
  });
}

export function useRecordMovement(itemId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: {
      type: 'IN' | 'OUT' | 'WASTAGE' | 'ADJUSTMENT';
      quantity: number;
      note?: string;
    }) => api.post(`/inventory/${itemId}/movements`, dto).then((r) => r.data),
    onSuccess: (_, dto) => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['inventory-movements'] });
      const labels = {
        IN: 'Restocked',
        OUT: 'Stock removed',
        WASTAGE: 'Wastage recorded',
        ADJUSTMENT: 'Adjusted',
      };
      openToast('success', labels[dto.type] ?? 'Movement recorded');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Movement failed'),
  });
}

export function useGerateItemSku() {
  return useMutation({
    mutationFn: () => api.get('/inventory/generate-sku').then((r) => r.data),
  });
}
