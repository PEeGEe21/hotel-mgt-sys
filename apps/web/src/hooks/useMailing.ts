'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export type EmailDeliveryLog = {
  id: string;
  hotelId: string | null;
  recipient: string;
  subject: string;
  fromEmail: string;
  provider: string;
  event: string | null;
  status: string;
  errorMessage: string | null;
  providerMessageId: string | null;
  metadata: Record<string, unknown> | null;
  sentAt: string | null;
  createdAt: string;
};

export type MailingFilters = {
  page?: number;
  limit?: number;
  status?: string;
  event?: string;
  search?: string;
};

export type MailingResponse = {
  emails: EmailDeliveryLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  meta: {
    total: number;
    current_page: number;
    per_page: number;
    last_page: number;
    from: number;
    to: number;
  };
};

export function useMailing(filters: MailingFilters = {}) {
  return useQuery<MailingResponse>({
    queryKey: ['mailing', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.page) params.set('page', String(filters.page));
      if (filters.limit) params.set('limit', String(filters.limit));
      if (filters.status) params.set('status', filters.status);
      if (filters.event) params.set('event', filters.event);
      if (filters.search) params.set('search', filters.search);
      const { data } = await api.get(`/mailing/emails?${params}`);
      return data;
    },
    staleTime: 30_000,
  });
}
