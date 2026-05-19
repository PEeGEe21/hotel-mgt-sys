'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export type AuditLogRow = {
  id: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  targetUserId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: any;
  createdAt: string;
  actor: { id: string; email: string; name: string };
  targetUser: { id: string; email: string; name: string } | null;
};

export type AuditLogsResponse = {
  logs: AuditLogRow[];
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

export type AuditLogFilters = {
  page?: number;
  limit?: number;
  action?: string;
  actorUserId?: string;
  targetUserId?: string;
  search?: string;
};

export function useAuditLogs(filters: AuditLogFilters = {}) {
  return useQuery<AuditLogsResponse>({
    queryKey: ['audit-logs', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.page) params.set('page', String(filters.page));
      if (filters.limit) params.set('limit', String(filters.limit));
      if (filters.action) params.set('action', filters.action);
      if (filters.actorUserId) params.set('actorUserId', filters.actorUserId);
      if (filters.targetUserId) params.set('targetUserId', filters.targetUserId);
      if (filters.search) params.set('search', filters.search);
      const { data } = await api.get(`/audit-logs?${params}`);
      const logs = Array.isArray(data?.logs) ? data.logs : [];
      return {
        logs,
        total: typeof data?.total === 'number' ? data.total : logs.length,
        page: typeof data?.page === 'number' ? data.page : filters.page ?? 1,
        limit: typeof data?.limit === 'number' ? data.limit : filters.limit ?? logs.length,
        totalPages: typeof data?.totalPages === 'number' ? data.totalPages : 1,
        meta:
          data?.meta && typeof data.meta === 'object'
            ? data.meta
            : {
                total: logs.length,
                current_page: filters.page ?? 1,
                per_page: filters.limit ?? logs.length,
                last_page: 1,
                from: logs.length ? 1 : 0,
                to: logs.length,
              },
      };
    },
    staleTime: 30_000,
  });
}
