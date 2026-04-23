'use client';

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import api from '@/lib/api';

export type RoomReservation = {
  id: string;
  reservationNo: string;
  checkIn: string;
  checkOut: string;
  status: string;
  bookingType: string;
  paymentStatus: string;
  totalAmount: number;
  paidAmount: number;
  guest: { id: string; firstName: string; lastName: string; isVip: boolean };
  company?: { id: string; name: string } | null;
  groupBooking?: { id: string; name: string } | null;
};

export type RoomReservationsResponse = {
  roomId: string;
  roomNumber: string;
  reservations: RoomReservation[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type RoomReservationsFilters = {
  page?: number;
  limit?: number;
  status?: string;
};

export function useRoomReservations(roomId: string, filters: RoomReservationsFilters = {}) {
  return useQuery<RoomReservationsResponse>({
    queryKey: ['room-reservations', roomId, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.page) params.set('page', String(filters.page));
      if (filters.limit) params.set('limit', String(filters.limit));
      if (filters.status) params.set('status', filters.status);
      const { data } = await api.get(`/rooms/${roomId}/reservations?${params}`);
      return data;
    },
    enabled: !!roomId,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}
