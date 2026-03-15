'use client';

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import api from '@/lib/api';
import openToast from '@/components/ToastComponent';

// ─── Types ────────────────────────────────────────────────────────────────────
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'SKIPPED';
export type TaskPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export type TaskType = 'CLEANING' | 'TURNDOWN' | 'MAINTENANCE' | 'INSPECTION' | 'AMENITY';

export type HKStaff = {
  id: string;
  firstName: string;
  lastName: string;
  avatar: string | null;
  position: string;
  department: string;
  tasks: { id: string }[];
};

export type HKTask = {
  id: string;
  hotelId: string;
  roomId: string;
  type: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignedTo: string | null;
  notes: string | null;
  dueBy: string | null;
  scheduledAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  room: {
    id: string;
    number: string;
    type: string;
    status: string;
    floor?: { id: string; name: string; level: number } | null;
  };
  staff?: { id: string; firstName: string; lastName: string; avatar: string | null } | null;
};

export type HKStats = {
  total: number;
  pending: number;
  inProgress: number;
  done: number;
  blocked: number;
  urgent: number;
  roomStats: Record<string, number>;
  floors: {
    id: string;
    name: string;
    level: number;
    ready: number;
    dirty: number;
    occupied: number;
    maintenance: number;
    total: number;
  }[];
};

export type TaskFilters = {
  status?: TaskStatus;
  priority?: TaskPriority;
  type?: string;
  assignedTo?: string;
  roomId?: string;
  floorId?: string;
  search?: string;
  page?: number;
  limit?: number;
};

export type CreateTaskInput = {
  roomId: string;
  type: string;
  priority?: TaskPriority;
  assignedTo?: string;
  notes?: string;
  dueBy?: string;
  scheduledAt?: string;
};

// ─── Hooks ────────────────────────────────────────────────────────────────────
export function useHKStats() {
  return useQuery<HKStats>({
    queryKey: ['housekeeping', 'stats'],
    queryFn: async () => {
      const { data } = await api.get('/housekeeping/stats');
      return data;
    },
    staleTime: 30_000,
    refetchInterval: 60_000, // auto-refresh every minute
  });
}

export function useHKStaff() {
  return useQuery<HKStaff[]>({
    queryKey: ['housekeeping', 'staff'],
    queryFn: async () => {
      const { data } = await api.get('/housekeeping/staff');
      return data;
    },
    staleTime: 60_000,
  });
}

export function useHKTasks(filters: TaskFilters = {}) {
  return useQuery<{ tasks: HKTask[]; total: number; page: number; totalPages: number }>({
    queryKey: ['housekeeping', 'tasks', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.status) params.set('status', filters.status);
      if (filters.priority) params.set('priority', filters.priority);
      if (filters.type) params.set('type', filters.type);
      if (filters.assignedTo) params.set('assignedTo', filters.assignedTo);
      if (filters.roomId) params.set('roomId', filters.roomId);
      if (filters.floorId) params.set('floorId', filters.floorId);
      if (filters.search) params.set('search', filters.search);
      if (filters.page) params.set('page', String(filters.page));
      if (filters.limit) params.set('limit', String(filters.limit));
      const { data } = await api.get(`/housekeeping?${params}`);
      return data;
    },
    staleTime: 20_000,
    placeholderData: keepPreviousData,
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateTaskInput) => api.post('/housekeeping', dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['housekeeping'] });
      openToast('success', 'Task created');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Could not create task'),
  });
}

export function useUpdateTask(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: Partial<CreateTaskInput & { status: TaskStatus; priority: TaskPriority }>) =>
      api.put(`/housekeeping/${id}`, dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['housekeeping'] });
      qc.invalidateQueries({ queryKey: ['rooms'] });
      openToast('success', 'Task updated');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Update failed'),
  });
}

export function useMarkDone(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.patch(`/housekeeping/${id}/done`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['housekeeping'] });
      qc.invalidateQueries({ queryKey: ['rooms'] });
      openToast('success', 'Task marked done');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Failed'),
  });
}

export function useAssignTask(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (staffId: string | null) =>
      api.patch(`/housekeeping/${id}/assign`, { staffId }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['housekeeping'] });
      openToast('success', 'Task assigned');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Assignment failed'),
  });
}
