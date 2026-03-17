'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { AuthUser } from '@/store/auth.store';
import { useAuthStore } from '@/store/auth.store';

export type MeResponse = {
  user: AuthUser;
  hotel: any;
};

export type UpdateMeInput = {
  name?: string;
  email?: string;
  phone?: string | null;
  avatar?: string | null;
};

export function useMe() {
  return useQuery<MeResponse>({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const { data } = await api.get('/auth/me');
      return data;
    },
    staleTime: 30_000,
  });
}

export function useUpdateMe() {
  const qc = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);

  return useMutation({
    mutationFn: (dto: UpdateMeInput) => api.patch('/auth/me', dto).then((r) => r.data),
    onSuccess: (data: MeResponse) => {
      qc.setQueryData(['auth', 'me'], data);
      if (data?.user) setUser(data.user);
    },
    onError: (err: any) => {
      throw err;
    },
  });
}

export function useResetAttendancePin() {
  const qc = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);

  return useMutation({
    mutationFn: () => api.patch('/auth/me/attendance-pin/reset').then((r) => r.data),
    onSuccess: (data: { pin: string }) => {
      qc.invalidateQueries({ queryKey: ['auth', 'me'] });
      const current = useAuthStore.getState().user;
      if (current) setUser({ ...current, attendancePinSet: true });
      return data;
    },
  });
}
