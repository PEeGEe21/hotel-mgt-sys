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

function normalizeInventoryItem(item: InventoryItem): InventoryItem {
  return {
    ...item,
    quantity: Number(item.quantity ?? 0),
    minStock: Number(item.minStock ?? 0),
    costPrice: Number(item.costPrice ?? 0),
    sellPrice: item.sellPrice == null ? null : Number(item.sellPrice),
  };
}

function normalizeStockMovement(movement: StockMovement): StockMovement {
  return {
    ...movement,
    quantity: Number(movement.quantity ?? 0),
  };
}

// ─── Hooks ────────────────────────────────────────────────────────────────────
export function useInventoryList(
  filters: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
  } = {},
  options: { enabled?: boolean } = {},
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
      const items = Array.isArray(data?.items) ? data.items.map(normalizeInventoryItem) : [];
      const lowStockItems = Array.isArray(data?.stats?.lowStockItems) ? data.stats.lowStockItems : [];
      return {
        items,
        meta: data?.meta && typeof data.meta === 'object'
          ? data.meta
          : {
              total: items.length,
              current_page: filters.page ?? 1,
              per_page: filters.limit ?? items.length,
              last_page: 1,
              from: items.length > 0 ? 1 : 0,
              to: items.length,
            },
        stats: {
          totalItems: Number(data?.stats?.totalItems ?? items.length),
          lowStockCount: Number(data?.stats?.lowStockCount ?? lowStockItems.length),
          totalValue: Number(data?.stats?.totalValue ?? 0),
          todaySales: Number(data?.stats?.todaySales ?? 0),
          todayTransactions: Number(data?.stats?.todayTransactions ?? 0),
          lowStockItems,
        },
      };
    },
    enabled: options.enabled ?? true,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

export function useInventoryItem(id: string) {
  return useQuery<InventoryItem & { movements: StockMovement[] }>({
    queryKey: ['inventory', id],
    queryFn: async () => {
      const { data } = await api.get(`/inventory/${id}`);
      return {
        ...normalizeInventoryItem(data),
        movements: Array.isArray(data?.movements) ? data.movements.map(normalizeStockMovement) : [],
      };
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
      const movements = Array.isArray(data?.movements)
        ? data.movements.map(normalizeStockMovement)
        : [];
      return {
        movements,
        meta: data?.meta && typeof data.meta === 'object'
          ? data.meta
          : {
              total: movements.length,
              current_page: filters.page ?? 1,
              per_page: filters.limit ?? movements.length,
              last_page: 1,
              from: movements.length > 0 ? 1 : 0,
              to: movements.length,
            },
      };
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
      return {
        summary: {
          totalItems: Number(data?.summary?.totalItems ?? 0),
          totalCost: Number(data?.summary?.totalCost ?? 0),
          totalValue: Number(data?.summary?.totalValue ?? 0),
          grossMargin: Number(data?.summary?.grossMargin ?? 0),
        },
        byCategory: data?.byCategory && typeof data.byCategory === 'object' ? data.byCategory : {},
        items: Array.isArray(data?.items) ? data.items.map(normalizeInventoryItem) : [],
      };
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
