'use client';

import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import api from '@/lib/api';
import openToast from '@/components/ToastComponent';

export type FinanceOverview = {
  range: { from: string; to: string };
  revenue: number;
  expenses: number;
  net: number;
  outstanding: number;
  changes: {
    revenue: number | null;
    expenses: number | null;
    net: number | null;
    outstanding: number | null;
  };
};

export type FinanceInvoice = {
  id: string;
  invoiceNo: string;
  issuedAt: string;
  dueAt: string | null;
  subtotal?: number;
  tax?: number;
  discount?: number;
  total: number;
  paidAmount: number;
  balance: number;
  paymentStatus: 'UNPAID' | 'PARTIAL' | 'PAID' | 'REFUNDED';
  status: 'UNPAID' | 'PARTIAL' | 'PAID' | 'REFUNDED' | 'OVERDUE';
  type: string;
  counterpartyName?: string | null;
  notes?: string | null;
  reservation?: {
    id: string;
    reservationNo: string;
    room?: { number: string | null } | null;
    guest?: { firstName: string; lastName: string } | null;
  } | null;
  posOrder?: {
    id: string;
    orderNo: string;
    tableNo?: string | null;
    roomNo?: string | null;
    type?: string | null;
    reservation?: {
      id: string;
      reservationNo: string;
      guest?: { firstName: string; lastName: string } | null;
    } | null;
  } | null;
  requisition?: {
    id: string;
    title: string;
    status: string;
    facility?: { name: string } | null;
  } | null;
};

export type FinanceInvoicesResponse = {
  range: { from: string; to: string };
  invoices: FinanceInvoice[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type FinancePayment = {
  id: string;
  amount: number;
  method: string;
  reference?: string | null;
  paidAt: string;
  note?: string | null;
  invoice: {
    id: string;
    invoiceNo: string;
    type: string;
    counterpartyName?: string | null;
    reservation?: {
      id: string;
      reservationNo: string;
      guest?: { firstName: string; lastName: string } | null;
    } | null;
    posOrder?: {
      id: string;
      orderNo: string;
      tableNo?: string | null;
      roomNo?: string | null;
      type?: string | null;
      reservation?: {
        id: string;
        reservationNo: string;
        guest?: { firstName: string; lastName: string } | null;
      } | null;
    } | null;
    requisition?: {
      id: string;
      title: string;
      status: string;
    } | null;
  };
};

export type CreateFinanceInvoiceInput = {
  type?: string;
  sourceType?: string;
  reservationId?: string;
  posOrderId?: string;
  facilityBookingId?: string;
  requisitionId?: string;
  counterpartyName: string;
  notes?: string;
  subtotal: number;
  tax?: number;
  discount?: number;
  dueAt?: string;
  debitAccountCode?: string;
  creditAccountCode?: string;
  recordInitialPayment?: boolean;
  initialPaymentAmount?: number;
  initialPaymentMethod?: string;
  initialPaymentReference?: string;
  initialPaymentNote?: string;
  initialPaymentPaidAt?: string;
  initialPaymentDebitAccountCode?: string;
  initialPaymentCreditAccountCode?: string;
};

export type RecordFinancePaymentInput = {
  invoiceId: string;
  amount: number;
  method: string;
  reference?: string;
  note?: string;
  paidAt?: string;
  debitAccountCode?: string;
  creditAccountCode?: string;
};

export type UpdateFinanceInvoiceInput = {
  counterpartyName?: string;
  notes?: string;
  dueAt?: string;
};

export type FinancePaymentsResponse = {
  range: { from: string; to: string };
  payments: FinancePayment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export function useFinanceOverview(range: { from?: string; to?: string } = {}) {
  return useQuery<FinanceOverview>({
    queryKey: ['finance', 'overview', range],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (range.from) params.set('from', range.from);
      if (range.to) params.set('to', range.to);
      const { data } = await api.get(`/finance/overview?${params.toString()}`);
      return data;
    },
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

export function useFinanceInvoices(filters: {
  from?: string;
  to?: string;
  search?: string;
  status?: string;
  type?: string;
  page?: number;
  limit?: number;
} = {}) {
  return useQuery<FinanceInvoicesResponse>({
    queryKey: ['finance', 'invoices', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.from) params.set('from', filters.from);
      if (filters.to) params.set('to', filters.to);
      if (filters.search) params.set('search', filters.search);
      if (filters.status) params.set('status', filters.status);
      if (filters.type) params.set('type', filters.type);
      if (filters.page) params.set('page', String(filters.page));
      if (filters.limit) params.set('limit', String(filters.limit));
      const { data } = await api.get(`/finance/invoices?${params.toString()}`);
      return data;
    },
    staleTime: 20_000,
    placeholderData: keepPreviousData,
  });
}

export function useFinancePayments(filters: {
  from?: string;
  to?: string;
  search?: string;
  page?: number;
  limit?: number;
} = {}) {
  return useQuery<FinancePaymentsResponse>({
    queryKey: ['finance', 'payments', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.from) params.set('from', filters.from);
      if (filters.to) params.set('to', filters.to);
      if (filters.search) params.set('search', filters.search);
      if (filters.page) params.set('page', String(filters.page));
      if (filters.limit) params.set('limit', String(filters.limit));
      const { data } = await api.get(`/finance/payments?${params.toString()}`);
      return data;
    },
    staleTime: 20_000,
    placeholderData: keepPreviousData,
  });
}

export function useCreateFinanceInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateFinanceInvoiceInput) =>
      api.post('/finance/invoices', dto).then((response) => response.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'invoices'] });
      queryClient.invalidateQueries({ queryKey: ['finance', 'overview'] });
      openToast('success', 'Invoice created');
    },
    onError: (error: any) =>
      openToast('error', error?.response?.data?.message ?? 'Could not create invoice'),
  });
}

export function useCreateRequisitionInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requisitionId: string) =>
      api.post(`/finance/invoices/from-requisition/${requisitionId}`).then((response) => response.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'invoices'] });
      queryClient.invalidateQueries({ queryKey: ['finance', 'overview'] });
      queryClient.invalidateQueries({ queryKey: ['facility-requisitions'] });
      openToast('success', 'Expense invoice created');
    },
    onError: (error: any) =>
      openToast('error', error?.response?.data?.message ?? 'Could not create requisition invoice'),
  });
}

export function useRecordFinancePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: RecordFinancePaymentInput) =>
      api.post('/finance/payments', dto).then((response) => response.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'payments'] });
      queryClient.invalidateQueries({ queryKey: ['finance', 'invoices'] });
      queryClient.invalidateQueries({ queryKey: ['finance', 'overview'] });
      openToast('success', 'Payment recorded');
    },
    onError: (error: any) =>
      openToast('error', error?.response?.data?.message ?? 'Could not record payment'),
  });
}

export function useUpdateFinanceInvoice(invoiceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: UpdateFinanceInvoiceInput) =>
      api.patch(`/finance/invoices/${invoiceId}`, dto).then((response) => response.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'invoices'] });
      queryClient.invalidateQueries({ queryKey: ['finance', 'overview'] });
      openToast('success', 'Invoice updated');
    },
    onError: (error: any) =>
      openToast('error', error?.response?.data?.message ?? 'Could not update invoice'),
  });
}
