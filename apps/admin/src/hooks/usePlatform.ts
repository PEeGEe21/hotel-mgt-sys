'use client';

import { useQuery } from '@tanstack/react-query';
import { platformClientFetch } from '@/lib/platform-client';
import type {
  PlatformActivityFeedResponse,
  PlatformHotelsResponse,
  PlatformStatsResponse,
  PlatformUsersResponse,
} from '@/lib/platform-types';

export function usePlatformStats() {
  return useQuery<PlatformStatsResponse>({
    queryKey: ['platform', 'stats'],
    queryFn: () => platformClientFetch('/stats'),
  });
}

export function usePlatformActivityFeed(limit = 6) {
  return useQuery<PlatformActivityFeedResponse>({
    queryKey: ['platform', 'activity-feed', limit],
    queryFn: () => platformClientFetch(`/activity-feed?limit=${limit}`),
  });
}

export function usePlatformHotels(page = 1, limit = 20) {
  return useQuery<PlatformHotelsResponse>({
    queryKey: ['platform', 'hotels', page, limit],
    queryFn: () => platformClientFetch(`/hotels?page=${page}&limit=${limit}`),
  });
}

export function usePlatformUsers(page = 1, limit = 20) {
  return useQuery<PlatformUsersResponse>({
    queryKey: ['platform', 'users', page, limit],
    queryFn: () => platformClientFetch(`/users?page=${page}&limit=${limit}`),
  });
}

export function usePlatformHotelDetail(id: string) {
  return useQuery({
    queryKey: ['platform', 'hotel', id],
    queryFn: () => platformClientFetch(`/hotels/${id}`),
    enabled: !!id,
  });
}

export function usePlatformUserDetail(id: string) {
  return useQuery({
    queryKey: ['platform', 'user', id],
    queryFn: () => platformClientFetch(`/users/${id}`),
    enabled: !!id,
  });
}
