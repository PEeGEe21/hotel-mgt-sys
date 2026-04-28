'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import openToast from '@/components/ToastComponent';

export type UserAccount = {
  id: string;
  staffId: string | null;
  staffName: string;
  firstName: string | null;
  lastName: string | null;
  employeeCode: string | null;
  username: string;
  email: string;
  role: string;
  status: 'Active' | 'Suspended' | 'Pending';
  lastLogin: string | null;
  createdAt: string;
  department: string | null;
  position: string | null;
  permissionGrants: string[];
  permissionDenies: string[];
  isOnline?: boolean;
  lastSeenAt?: string | null;
};

export type UserAccountInput = {
  email: string;
  password: string;
  role: string;
  firstName: string;
  lastName: string;
  department: string;
  position: string;
  employeeCode: string;
  phone?: string;
};

export type UserAccountUpdate = Partial<{
  email: string;
  role: string;
  isActive: boolean;
  firstName: string;
  lastName: string;
  department: string;
  position: string;
  employeeCode: string;
  phone: string;
}>;

export type UserFilters = {
  search?: string;
  department?: string;
  role?: string;
  page?: number;
  limit?: number;
};

export type UserResponse = {
  users: UserAccount[];
  total: number;
  page: number;
  totalPages: number;
  meta: any;
  stats?: {
    total: number;
    active: number;
    suspended: number;
    pending: number;
  };
};

export function useUserAccounts(filters: UserFilters = {}) {
  return useQuery<UserResponse>({
    queryKey: ['user-accounts', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.search) params.set('search', filters.search);
      if (filters.department) params.set('department', filters.department);
      if (filters.role) params.set('role', filters.role);
      if (filters.page) params.set('page', String(filters.page));
      if (filters.limit) params.set('limit', String(filters.limit));
      const { data } = await api.get(`/users?${params}`);
      return data;
    },
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

export function useAllUserAccounts(search?: string) {
  return useQuery<UserAccount[]>({
    queryKey: ['user-accounts', search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const { data } = await api.get(`/users/list?${params}`);
      return data;
    },
  });
}

export function useCreateUserAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: UserAccountInput) => api.post('/users', dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user-accounts'] });
      openToast('success', 'Account created');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Create failed'),
  });
}

export function useUpdateUserAccount(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: UserAccountUpdate) => api.patch(`/users/${id}`, dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user-accounts'] });
      openToast('success', 'Account updated');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Update failed'),
  });
}

export function useResetUserPassword(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (password: string) => api.patch(`/users/${id}/reset-password`, { password }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user-accounts'] });
      openToast('success', 'Password reset');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Reset failed'),
  });
}

export function useDeleteUserAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user-accounts'] });
      openToast('success', 'Account disabled');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Delete failed'),
  });
}

export function useUpdateUserPermissions(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: { grants: string[]; denies: string[] }) =>
      api.patch(`/users/${id}/permissions`, dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user-accounts'] });
      openToast('success', 'Permissions updated');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Update failed'),
  });
}
