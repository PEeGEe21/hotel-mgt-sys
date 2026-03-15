'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────
export type ApiFloor = {
  id: string;
  hotelId: string;
  name: string;
  level: number;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { rooms: number };
};

// ─── Hooks ────────────────────────────────────────────────────────────────────
export function useFloors() {
  return useQuery<ApiFloor[]>({
    queryKey: ['floors'],
    queryFn: async () => {
      const { data } = await api.get('/floors');
      return data;
    },
    staleTime: 60_000, // floors change rarely
  });
}

export function useFloor(id: string) {
  return useQuery<ApiFloor>({
    queryKey: ['floors', id],
    queryFn: async () => {
      const { data } = await api.get(`/floors/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateFloor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: { name: string; level: number; description?: string }) =>
      api.post('/floors', dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['floors'] }),
  });
}

export function useUpdateFloor(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: { name?: string; level?: number; description?: string }) =>
      api.put(`/floors/${id}`, dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['floors'] });
      qc.invalidateQueries({ queryKey: ['rooms'] }); // room cards show floor name
    },
  });
}

export function useDeleteFloor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/floors/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['floors'] }),
  });
}
