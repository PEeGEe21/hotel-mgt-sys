'use client';

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import api from '@/lib/api';

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
  total: number;
  paidAmount: number;
  balance: number;
  paymentStatus: 'UNPAID' | 'PARTIAL' | 'PAID' | 'REFUNDED';
  status: 'UNPAID' | 'PARTIAL' | 'PAID' | 'REFUNDED' | 'OVERDUE';
  type: string;
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
  };
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
