'use client';

import { useInfiniteQuery, type InfiniteData } from '@tanstack/react-query';
import api from '@/lib/api';

export type FolioItem = {
  id: string;
  description: string;
  amount: number;
  quantity?: number;
  category: string;
  createdAt: string;
};

export type GuestFolioItem = FolioItem & {
  reservation: {
    id: string;
    reservationNo: string;
    checkIn: string;
    checkOut: string;
    room: { number: string; type: string };
  };
};

export type FolioItemsResponse<T> = {
  items: T[];
  nextCursor: string | null;
};

type PaginationOptions = {
  limit?: number;
  enabled?: boolean;
};

export function useGuestFolioItems(guestId: string, options: PaginationOptions = {}) {
  const { limit = 20, enabled = true } = options;
  const queryKey = ['guests', guestId, 'folio-items', limit] as const;
  return useInfiniteQuery<
    FolioItemsResponse<GuestFolioItem>,
    Error,
    InfiniteData<FolioItemsResponse<GuestFolioItem>>,
    typeof queryKey,
    string | undefined
  >({
    queryKey,
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      params.set('limit', String(limit));
      if (pageParam) params.set('cursor', String(pageParam));
      const { data } = await api.get(`/guests/${guestId}/folio-items?${params}`);
      return data;
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: enabled && !!guestId,
  });
}

export function useReservationFolioItems(reservationId: string, options: PaginationOptions = {}) {
  const { limit = 20, enabled = true } = options;
  const queryKey = ['reservations', reservationId, 'folio-items', limit] as const;
  return useInfiniteQuery<
    FolioItemsResponse<FolioItem>,
    Error,
    InfiniteData<FolioItemsResponse<FolioItem>>,
    typeof queryKey,
    string | undefined
  >({
    queryKey,
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      params.set('limit', String(limit));
      if (pageParam) params.set('cursor', String(pageParam));
      const { data } = await api.get(`/reservations/${reservationId}/folio-items?${params}`);
      return data;
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: enabled && !!reservationId,
  });
}
