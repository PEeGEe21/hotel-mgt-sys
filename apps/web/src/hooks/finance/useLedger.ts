'use client';

import {
  useQuery, useMutation, useQueryClient, keepPreviousData,
} from '@tanstack/react-query';
import api from '@/lib/api';
import openToast from '@/components/ToastComponent';

// ─── Types ────────────────────────────────────────────────────────────────────
export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';

export type Account = {
  id:            string;
  hotelId:       string;
  code:          string;
  name:          string;
  type:          AccountType;
  normalBalance: 'DEBIT' | 'CREDIT';
  description:   string | null;
  isActive:      boolean;
  isSystem:      boolean;
  parentCode:    string | null;
  debit:         number;
  credit:        number;
  balance:       number;
};

export type JournalLine = {
  id:             string;
  type:           'DEBIT' | 'CREDIT';
  amount:         number;
  description:    string | null;
  account:        { code: string; name: string; type: string };
};

export type JournalEntry = {
  id:          string;
  entryNo:     string;
  date:        string;
  description: string;
  reference:   string | null;
  sourceType:  string | null;
  sourceId:    string | null;
  isReversed:  boolean;
  lines:       JournalLine[];
};

export type DayBookResponse = {
  date:    string;
  entries: JournalEntry[];
  summary: { totalEntries: number; totalDebits: number; totalCredits: number };
  meta:    any;
};

export type TrialBalanceRow = Account;

export type TrialBalanceResponse = {
  asOf:         string;
  rows:         TrialBalanceRow[];
  totalDebits:  number;
  totalCredits: number;
  isBalanced:   boolean;
};

export type PnLResponse = {
  period:   { from: string; to: string };
  revenue:  { total: number; rows: Account[]; byCategory: Record<string, number> };
  expenses: { total: number; rows: Account[] };
  netProfit: number;
  margin:    number;
};

// ─── Hooks ────────────────────────────────────────────────────────────────────
export function useAccounts(type?: AccountType) {
  return useQuery<Account[]>({
    queryKey: ['ledger-accounts', type],
    queryFn:  async () => {
      const params = type ? `?type=${type}` : '';
      const { data } = await api.get(`/ledger/accounts${params}`);
      return data;
    },
    staleTime: 60_000,
  });
}

export function useDayBook(date: string, page = 1) {
  return useQuery<DayBookResponse>({
    queryKey:        ['ledger-daybook', date, page],
    queryFn:         async () => {
      const { data } = await api.get(`/ledger/day-book?date=${date}&page=${page}&limit=50`);
      return data;
    },
    staleTime:       30_000,
    placeholderData: keepPreviousData,
  });
}

export function useTrialBalance(asOf?: string) {
  return useQuery<TrialBalanceResponse>({
    queryKey: ['ledger-trial-balance', asOf],
    queryFn:  async () => {
      const params = asOf ? `?asOf=${asOf}` : '';
      const { data } = await api.get(`/ledger/trial-balance${params}`);
      return data;
    },
    staleTime: 60_000,
  });
}

export function useProfitAndLoss(from: string, to: string) {
  return useQuery<PnLResponse>({
    queryKey: ['ledger-pnl', from, to],
    queryFn:  async () => {
      const { data } = await api.get(`/ledger/profit-loss?from=${from}&to=${to}`);
      return data;
    },
    staleTime:       60_000,
    placeholderData: keepPreviousData,
  });
}

export function useAccountStatement(code: string, from?: string, to?: string) {
  return useQuery({
    queryKey: ['ledger-statement', code, from, to],
    queryFn:  async () => {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to)   params.set('to',   to);
      const { data } = await api.get(`/ledger/accounts/${code}/statement?${params}`);
      return data;
    },
    enabled:  !!code,
    staleTime: 30_000,
  });
}

export function useSeedCoa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/ledger/accounts/seed').then(r => r.data),
    onSuccess:  (data: any) => {
      qc.invalidateQueries({ queryKey: ['ledger-accounts'] });
      openToast('success', data.message ?? 'Chart of accounts seeded');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Failed'),
  });
}

export function usePostManualEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: {
      description: string;
      reference?:  string;
      date?:       string;
      lines: { accountCode: string; type: 'DEBIT' | 'CREDIT'; amount: number; description?: string }[];
    }) => api.post('/ledger/entries', dto).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ledger-daybook']       });
      qc.invalidateQueries({ queryKey: ['ledger-trial-balance'] });
      qc.invalidateQueries({ queryKey: ['ledger-pnl']           });
      qc.invalidateQueries({ queryKey: ['ledger-accounts']      });
      openToast('success', 'Journal entry posted');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Could not post entry'),
  });
}
