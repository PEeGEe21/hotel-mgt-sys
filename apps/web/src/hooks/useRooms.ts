'use client';

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import type { RoomStatus, RoomType } from '@/lib/rooms-data';
import openToast from '@/components/ToastComponent';

// ─── Types ────────────────────────────────────────────────────────────────────
export type ApiRoom = {
  id: string;
  number: string;
  floorId: string;
  floor?: { id: string; name: string; level: number };
  type: RoomType;
  status: RoomStatus;
  baseRate: number;
  maxGuests: number;
  description: string | null;
  amenities: string[];
  images: string[];
  createdAt: string;
  updatedAt: string;
};

export type RoomsResponse = {
  rooms: ApiRoom[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  stats: Partial<Record<RoomStatus, number>>;
};

export type RoomFilters = {
  status?: RoomStatus;
  type?: RoomType;
  floorId?: string;
  search?: string;
  page?: number;
  limit?: number;
};

// ─── Hooks ────────────────────────────────────────────────────────────────────
export function useRooms(filters: RoomFilters = {}) {
  return useQuery<RoomsResponse>({
    queryKey: ['rooms', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.status) params.set('status', filters.status);
      if (filters.type) params.set('type', filters.type);
      if (filters.floorId) params.set('floorId', filters.floorId);
      if (filters.search) params.set('search', filters.search);
      if (filters.page) params.set('page', String(filters.page));
      if (filters.limit) params.set('limit', String(filters.limit));
      const { data } = await api.get(`/rooms?${params}`);
      return data;
    },
    staleTime: 30_000,
    placeholderData: keepPreviousData, // no flash between page/filter changes
  });
}

export function useRoom(id: string) {
  return useQuery<ApiRoom>({
    queryKey: ['rooms', id],
    queryFn: async () => {
      const { data } = await api.get(`/rooms/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: Partial<ApiRoom>) => api.post('/rooms', dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rooms'] }),
  });
}

export function useUpdateRoom(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: Partial<ApiRoom>) => api.put(`/rooms/${id}`, dto).then((r) => r.data),
    onSuccess: () => (
      qc.invalidateQueries({ queryKey: ['rooms'] }),
      openToast('success', 'Updated Successfully')
    ),
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Something went wrong';
      openToast('error', msg);
    },
  });
}

export function useUpdateRoomStatus(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (status: RoomStatus) =>
      api.patch(`/rooms/${id}/status`, { status }).then((r) => r.data),
    onSuccess: () => (
      qc.invalidateQueries({ queryKey: ['rooms'] }),
      openToast('success', 'Success')
    ),
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Something went wrong';
      openToast('error', msg);
    },
  });
}

export function useDeleteRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/rooms/${id}`).then((r) => r.data),
    onSuccess: () => (
      qc.invalidateQueries({ queryKey: ['rooms'] }),
      openToast('success', 'Success')
    ),
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Something went wrong';
      openToast('error', msg);
    },
  });
}
