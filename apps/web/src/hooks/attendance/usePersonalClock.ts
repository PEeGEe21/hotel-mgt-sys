'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export type AttendanceRecord = {
  id: string;
  type: 'CLOCK_IN' | 'CLOCK_OUT';
  timestamp: string;
};

export type TodayStatus = {
  isClockedIn: boolean;
  records: AttendanceRecord[];
  totalMinutes: number;
  lastClockInAt: string | null;
  lastClockOutAt: string | null;
};

const API_METHOD = 'SELF';

export function useTodayAttendanceStatus(enabled = true) {
  return useQuery<TodayStatus>({
    queryKey: ['attendance-today-self'],
    queryFn: async () => {
      const { data } = await api.get<TodayStatus>('/attendance/today');
      return data;
    },
    enabled,
    staleTime: 10_000,
  });
}

export function useToggleSelfClock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { isClockedIn: boolean; note?: string }) => {
      const path = input.isClockedIn ? '/attendance/clock-out' : '/attendance/clock-in';
      const { data } = await api.post(path, {
        method: API_METHOD,
        note: input.note,
      });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance-today-self'] });
    },
  });
}
