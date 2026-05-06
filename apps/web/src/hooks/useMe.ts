'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { AuthUser } from '@/store/auth.store';
import { useAuthStore } from '@/store/auth.store';

export type MeResponse = {
  user: AuthUser;
  hotel: any;
};

export type AuthSession = {
  id: string;
  userId: string;
  hotelId: string | null;
  impersonatorId: string | null;
  isImpersonation: boolean;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  current: boolean;
};

export type SessionsResponse = {
  sessions: AuthSession[];
};

export type UpdateMeInput = {
  name?: string;
  email?: string;
  phone?: string | null;
  avatar?: string | null;
};

export type ChangePasswordInput = {
  currentPassword: string;
  newPassword: string;
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

export function useSessions() {
  return useQuery<SessionsResponse>({
    queryKey: ['auth', 'sessions'],
    queryFn: async () => {
      const { data } = await api.get('/auth/sessions');
      return data;
    },
    staleTime: 15_000,
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

export function useChangePassword() {
  const qc = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);

  return useMutation({
    mutationFn: (dto: ChangePasswordInput) =>
      api.patch('/auth/change-password', dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['auth', 'me'] });
      const current = useAuthStore.getState().user;
      if (current) setUser({ ...current, mustChangePassword: false });
    },
  });
}

export function useRevokeSession() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) => api.delete(`/auth/sessions/${sessionId}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['auth', 'sessions'] });
    },
  });
}

export function useRevokeOtherSessions() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => api.post('/auth/sessions/revoke-others').then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['auth', 'sessions'] });
    },
  });
}
