'use client';

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import api from '@/lib/api';
import openToast from '@/components/ToastComponent';

// ─── Types ────────────────────────────────────────────────────────────────────
export type OrderStatus = 'PENDING' | 'PREPARING' | 'READY' | 'DELIVERED' | 'CANCELLED';
export type OrderType = 'DINE_IN' | 'ROOM_SERVICE' | 'TAKEAWAY' | 'RETAIL';

export type OrderItem = {
  id: string;
  orderId: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  total: number;
  note: string | null;
  product?: { id: string; name: string; type: string; category: string; unit: string };
};

export type ApiOrder = {
  id: string;
  hotelId: string;
  orderNo: string;
  tableNo: string | null;
  roomNo: string | null;
  reservationId: string | null;
  posTerminalId: string | null;
  staffId: string | null;
  type: OrderType;
  status: OrderStatus;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: string | null;
  isPaid: boolean;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  posTerminal?: { id: string; name: string; location: string } | null;
  reservation?: {
    id: string;
    reservationNo: string;
    guest: { firstName: string; lastName: string };
  } | null;
  staff?: { id: string; firstName: string; lastName: string } | null;
  invoices?: any[];
};

export type CreateOrderInput = {
  type: OrderType;
  items: { productId: string; quantity: number; note?: string }[];
  tableNo?: string;
  roomNo?: string;
  reservationId?: string;
  posTerminalId?: string;
  staffId?: string;
  discount?: number;
  note?: string;
};

export type OrderFilters = {
  status?: string;
  type?: string;
  posTerminalId?: string;
  staffId?: string;
  tableNo?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  limit?: number;
};

export type OrdersResponse = {
  orders: ApiOrder[];
  total: number;
  page: number;
  totalPages: number;
  meta: any;
  stats: {
    todayRevenue: number;
    todayCount: number;
    activeOrders: number;
    paymentMix: Record<string, number>;
  };
};

export type ZReport = {
  date: string;
  terminal: string;
  totalOrders: number;
  paidOrders: number;
  unpaidOrders: number;
  grossRevenue: number;
  netRevenue: number;
  totalTax: number;
  totalDiscount: number;
  byMethod: Record<string, number>;
  byType: Record<string, number>;
  topItems: { name: string; qty: number; revenue: number }[];
  openTables: (string | null)[];
};

// ─── Hooks ────────────────────────────────────────────────────────────────────
export function usePosOrders(filters: OrderFilters = {}) {
  return useQuery<OrdersResponse>({
    queryKey: ['pos-orders', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.status) params.set('status', filters.status);
      if (filters.type) params.set('type', filters.type);
      if (filters.posTerminalId) params.set('posTerminalId', filters.posTerminalId);
      if (filters.staffId) params.set('staffId', filters.staffId);
      if (filters.tableNo) params.set('tableNo', filters.tableNo);
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.set('dateTo', filters.dateTo);
      if (filters.search) params.set('search', filters.search);
      if (filters.page) params.set('page', String(filters.page));
      if (filters.limit) params.set('limit', String(filters.limit));
      const { data } = await api.get(`/pos/orders?${params}`);
      return data;
    },
    staleTime: 15_000,
    placeholderData: keepPreviousData,
    refetchInterval: 30_000, // auto-refresh for live kitchen view
  });
}

export function usePosOrder(id: string) {
  return useQuery<ApiOrder>({
    queryKey: ['pos-orders', id],
    queryFn: async () => {
      const { data } = await api.get(`/pos/orders/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useTableSummary(tableNo: string | null) {
  return useQuery({
    queryKey: ['pos-orders', 'table', tableNo],
    queryFn: async () => {
      const { data } = await api.get(`/pos/orders/table/${tableNo}`);
      return data;
    },
    enabled: !!tableNo,
  });
}

export function useZReport(options: { posTerminalId?: string; date?: string; staffId?: string }) {
  return useQuery<ZReport>({
    queryKey: ['pos-orders', 'z-report', options],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options.posTerminalId) params.set('posTerminalId', options.posTerminalId);
      if (options.date) params.set('date', options.date);
      if (options.staffId) params.set('staffId', options.staffId);
      const { data } = await api.get(`/pos/orders/z-report?${params}`);
      return data;
    },
    staleTime: 60_000,
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateOrderInput) => api.post('/pos/orders', dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pos-orders'] });
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Could not create order'),
  });
}

export function useAddOrderItem(orderId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: { productId: string; quantity: number; note?: string }) =>
      api.post(`/pos/orders/${orderId}/items`, dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pos-orders', orderId] }),
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Failed'),
  });
}

export function useUpdateOrderItem(orderId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, ...dto }: { itemId: string; quantity?: number; note?: string }) =>
      api.patch(`/pos/orders/${orderId}/items/${itemId}`, dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pos-orders', orderId] }),
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Failed'),
  });
}

// ── Bound versions (when orderId is known at hook call time) ──────────────────
// Use these on detail pages, order cards, kitchen display etc.

export function useUpdateOrderStatus(orderId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (status: string) =>
      api.patch(`/pos/orders/${orderId}/status`, { status }).then((r) => r.data),
    onSuccess: (_, status) => {
      qc.invalidateQueries({ queryKey: ['pos-orders'] });
      qc.invalidateQueries({ queryKey: ['reservations'] });
      if (status === 'DELIVERED') openToast('success', 'Order delivered — inventory updated');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Status update failed'),
  });
}

export function usePayOrder(orderId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: {
      method: string;
      amountTendered?: number;
      reference?: string;
      note?: string;
    }) => api.post(`/pos/orders/${orderId}/pay`, dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pos-orders'] });
      openToast('success', 'Payment recorded');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Payment failed'),
  });
}

export function useCancelOrder(orderId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reason?: string) =>
      api.patch(`/pos/orders/${orderId}/cancel`, { reason }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pos-orders'] });
      openToast('success', 'Order cancelled');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Cancel failed'),
  });
}

// ── Unbound versions (when orderId is only known at mutation call time) ────────
// Use these on the terminal where the order is created on the fly.

export function useDeliverOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) =>
      api.patch(`/pos/orders/${orderId}/status`, { status: 'DELIVERED' }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pos-orders'] });
      qc.invalidateQueries({ queryKey: ['reservations'] });
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Delivery failed'),
  });
}

export function usePayOrderById() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      orderId,
      method,
      amountTendered,
      reference,
      note,
    }: {
      orderId: string;
      method: string;
      amountTendered?: number;
      reference?: string;
      note?: string;
    }) =>
      api
        .post(`/pos/orders/${orderId}/pay`, { method, amountTendered, reference, note })
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pos-orders'] });
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Payment failed'),
  });
}
