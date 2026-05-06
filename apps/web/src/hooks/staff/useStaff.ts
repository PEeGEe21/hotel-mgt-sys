'use client';

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import api from '@/lib/api';
import openToast from '@/components/ToastComponent';

// ─── Types ────────────────────────────────────────────────────────────────────
export type StaffRole =
  | 'ADMIN'
  | 'MANAGER'
  | 'RECEPTIONIST'
  | 'HOUSEKEEPING'
  | 'CASHIER'
  | 'COOK'
  | 'BARTENDER'
  | 'STAFF';

export type ApiStaff = {
  id: string;
  hotelId: string;
  userId: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  department: string;
  position: string;
  salary: number;
  hireDate: string;
  avatar: string | null;
  createdAt: string;
  updatedAt: string;
  clockStatus?: 'Clocked In' | 'Clocked Out' | 'On Leave' | 'Not Clocked In';
  user: {
    id: string;
    email: string;
    role: StaffRole;
    isActive: boolean;
    isOnline?: boolean;
    lastLoginAt: string | null;
    lastSeenAt?: string | null;
    mustChangePassword: boolean;
  };
  _count?: { tasks: number; attendance: number };
  tasks?: any[];
  leaves?: any[];
  attendance?: any[];
};

export type CreateStaffInput = {
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  position: string;
  role: StaffRole;
  hireDate: string;
  phone?: string;
  salary?: number;
};

export type StaffFilters = {
  search?: string;
  department?: string;
  role?: string;
  page?: number;
  limit?: number;
};

export type StaffResponse = {
  staff: ApiStaff[];
  total: number;
  page: number;
  totalPages: number;
  meta: any;
  stats: {
    total: number;
    clocked: number;
    onLeave: number;
    notClockedIn: number;
  };
  departments: { id: string; name: string }[];
};

export type CreateStaffResult = {
  staff: ApiStaff;
  employeeCode: string;
  defaultPassword: string;
};

// ─── Hooks ────────────────────────────────────────────────────────────────────
export function useStaff(filters: StaffFilters = {}) {
  return useQuery<StaffResponse>({
    queryKey: ['staff', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.search) params.set('search', filters.search);
      if (filters.department) params.set('department', filters.department);
      if (filters.role) params.set('role', filters.role);
      if (filters.page) params.set('page', String(filters.page));
      if (filters.limit) params.set('limit', String(filters.limit));
      const { data } = await api.get(`/staff?${params}`);
      return data;
    },
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

export function useStaffAll() {
  return useQuery<ApiStaff[]>({
    queryKey: ['staff'],
    queryFn: async () => {
      const { data } = await api.get(`/staff/all`);
      return data;
    },
  });
}

export function useStaffMember(id: string) {
  return useQuery<ApiStaff>({
    queryKey: ['staff', id],
    queryFn: async () => {
      const { data } = await api.get(`/staff/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useRoles() {
  return useQuery<StaffRole[]>({
    queryKey: ['staff', 'roles'],
    queryFn: async () => {
      const { data } = await api.get('/staff/roles');
      return data;
    },
    staleTime: Infinity, // roles never change at runtime
  });
}

export function useCreateStaff() {
  const qc = useQueryClient();
  return useMutation<CreateStaffResult, any, CreateStaffInput>({
    mutationFn: (dto) => api.post('/staff', dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff'] }),
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Could not create staff'),
  });
}

export function useUpdateStaff(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: Partial<CreateStaffInput>) =>
      api.put(`/staff/${id}`, dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff'] });
      openToast('success', 'Staff updated');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Update failed'),
  });
}

export function useDeactivateStaff(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.patch(`/staff/${id}/deactivate`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff'] });
      openToast('success', 'Staff account deactivated');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Failed'),
  });
}

export function useReactivateStaff(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.patch(`/staff/${id}/reactivate`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff'] });
      openToast('success', 'Staff account reactivated');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Failed'),
  });
}

export function useResetStaffPassword(id: string) {
  return useMutation({
    mutationFn: () => api.patch(`/staff/${id}/reset-password`).then((r) => r.data),
    onSuccess: () => openToast('success', 'Password reset to default'),
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Reset failed'),
  });
}
