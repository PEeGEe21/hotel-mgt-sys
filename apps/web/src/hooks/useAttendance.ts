'use client';

import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { endOfDay, startOfDay } from 'date-fns';
import api from '@/lib/api';
import type { PaginationMeta } from '@/components/ui/pagination';
import type { AttendanceStatus, StaffRecord } from '@/lib/attendance-data';

export type AttendanceRow = StaffRecord & {
  clockInAt?: string | null;
  clockOutAt?: string | null;
  method?: string | null;
};

export type AttendanceStats = {
  present: number;
  late: number;
  absent: number;
  leave: number;
  clockedOut: number;
  inHouse: number;
  notClocked: number;
};

export type AttendanceListResponse = {
  data: AttendanceRow[];
  meta: PaginationMeta;
  stats: AttendanceStats;
  departments: string[];
};

export type AttendanceListParams = {
  page: number;
  limit: number;
  search?: string;
  department?: string;
  date?: Date;
};

export type AttendanceReportEntry = {
  date: string;
  clockIn?: string;
  clockOut?: string;
  status: AttendanceStatus;
  hours?: number;
  note?: string;
};

export function useAttendanceList(params: AttendanceListParams) {
  return useQuery({
    queryKey: ['attendance', 'today-list', params],
    queryFn: async () => {
      const query = new URLSearchParams();
      query.set('page', String(params.page));
      query.set('limit', String(params.limit));
      if (params.search) query.set('search', params.search);
      if (params.department && params.department !== 'All Departments') {
        query.set('department', params.department);
      }
      if (params.date) {
        const from = startOfDay(params.date).toISOString();
        const to = endOfDay(params.date).toISOString();
        query.set('from', from);
        query.set('to', to);
      }
      const { data } = await api.get<AttendanceListResponse>(`/attendance/today/list?${query}`);
      return data;
    },
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

export function useAdminClockIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { staffId: string; timestamp: string; note?: string }) =>
      api.post('/attendance/admin/clock-in', { ...payload, method: 'MANUAL' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance', 'today-list'] });
    },
  });
}

export function useAdminClockOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { staffId: string; timestamp: string; note?: string }) =>
      api.post('/attendance/admin/clock-out', { ...payload, method: 'MANUAL' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance', 'today-list'] });
    },
  });
}

export function useAttendanceReport(params: {
  staffId?: string | null;
  from: Date;
  to: Date;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: [
      'attendance',
      'report',
      params.staffId,
      params.from.toISOString(),
      params.to.toISOString(),
    ],
    queryFn: async () => {
      const staffId = params.staffId;
      if (!staffId) return [] as AttendanceReportEntry[];
      const { data } = await api.get(
        `/attendance/report/${staffId}?from=${params.from.toISOString()}&to=${params.to.toISOString()}`,
      );
      const grouped = new Map<string, any[]>();
      (data ?? []).forEach((rec: any) => {
        const dateKey = new Date(rec.timestamp).toLocaleDateString('en-CA');
        const list = grouped.get(dateKey) ?? [];
        list.push(rec);
        grouped.set(dateKey, list);
      });

      const nextEntries: AttendanceReportEntry[] = Array.from(grouped.entries()).map(
        ([date, recs]) => {
          const sorted = recs
            .slice()
            .sort((a, b) => +new Date(a.timestamp) - +new Date(b.timestamp));
          const firstIn = sorted.find((r) => r.type === 'CLOCK_IN');
          const lastOut = [...sorted].reverse().find((r) => r.type === 'CLOCK_OUT');
          let totalMinutes = 0;
          for (let i = 0; i < sorted.length - 1; i += 2) {
            if (sorted[i]?.type === 'CLOCK_IN' && sorted[i + 1]?.type === 'CLOCK_OUT') {
              totalMinutes +=
                (new Date(sorted[i + 1].timestamp).getTime() -
                  new Date(sorted[i].timestamp).getTime()) /
                60000;
            }
          }
          const lastWithNote = [...sorted].reverse().find((r) => r.note);
          return {
            date,
            clockIn: firstIn
              ? new Date(firstIn.timestamp).toLocaleTimeString('en-NG', {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : undefined,
            clockOut: lastOut
              ? new Date(lastOut.timestamp).toLocaleTimeString('en-NG', {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : undefined,
            status: firstIn ? 'Present' : 'Absent',
            hours: totalMinutes ? Number((totalMinutes / 60).toFixed(1)) : undefined,
            note: lastWithNote?.note ?? undefined,
          };
        },
      );

      nextEntries.sort((a, b) => (a.date < b.date ? 1 : -1));
      return nextEntries;
    },
    enabled: params.enabled ?? true,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}
