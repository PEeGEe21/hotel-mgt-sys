'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import openToast from '@/components/ToastComponent';

export type RoomTypeConfig = {
  id: string;
  name: string;
  description: string;
  baseRate: number;
  capacity: number;
  beds: string;
  amenities: string[];
  color: string;
  count: number;
};

export type RoomTypeConfigInput = {
  name: string;
  description?: string;
  baseRate?: number;
  capacity?: number;
  beds?: string;
  amenities?: string[];
  color?: string;
};

export function useRoomTypes() {
  return useQuery<RoomTypeConfig[]>({
    queryKey: ['room-types'],
    queryFn: async () => {
      const { data } = await api.get('/room-types');
      return data;
    },
  });
}

export function useCreateRoomType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: RoomTypeConfigInput) => api.post('/room-types', dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['room-types'] });
      openToast('success', 'Room type created');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Create failed'),
  });
}

export function useUpdateRoomType(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: RoomTypeConfigInput) => api.patch(`/room-types/${id}`, dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['room-types'] });
      openToast('success', 'Room type updated');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Update failed'),
  });
}

export function useDeleteRoomType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/room-types/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['room-types'] });
      openToast('success', 'Room type deleted');
    },
    onError: (e: any) => openToast('error', e?.response?.data?.message ?? 'Delete failed'),
  });
}
