'use client';

import { useQuery } from '@tanstack/react-query';
import { platformClientFetch } from '@/lib/platform-client';
import type {
  PlatformActivityFeedResponse,
  PlatformAuditLogsResponse,
  PlatformHotelsResponse,
  PlatformSearchResponse,
  PlatformStatsResponse,
  PlatformSuperAdminsResponse,
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

export function usePlatformHotels(page = 1, limit = 20, options?: { search?: string; all?: boolean }) {
  const params = new URLSearchParams();
  if (!options?.all) {
    params.set('page', String(page));
    params.set('limit', String(limit));
  }
  if (options?.search?.trim()) params.set('search', options.search.trim());
  if (options?.all) params.set('all', 'true');

  return useQuery<PlatformHotelsResponse>({
    queryKey: ['platform', 'hotels', page, limit, options],
    queryFn: () => platformClientFetch(`/hotels?${params.toString()}`),
  });
}

export function usePlatformUsers(page = 1, limit = 20, filters?: { search?: string; hotelId?: string; role?: string }) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  for (const [key, value] of Object.entries(filters ?? {})) {
    const trimmed = value?.trim();
    if (trimmed) params.set(key, trimmed);
  }

  return useQuery<PlatformUsersResponse>({
    queryKey: ['platform', 'users', page, limit, filters],
    queryFn: () => platformClientFetch(`/users?${params.toString()}`),
  });
}

export function usePlatformSearch(query: string) {
  const term = query.trim();

  return useQuery<PlatformSearchResponse>({
    queryKey: ['platform', 'search', term],
    queryFn: () => platformClientFetch(`/search?q=${encodeURIComponent(term)}`),
    enabled: term.length >= 2,
  });
}

export function usePlatformSuperAdmins(search = '') {
  const params = new URLSearchParams();
  if (search.trim()) params.set('search', search.trim());

  return useQuery<PlatformSuperAdminsResponse>({
    queryKey: ['platform', 'super-admins', search],
    queryFn: () => platformClientFetch(`/super-admins?${params.toString()}`),
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

export function usePlatformAuditLogs(
  page = 1,
  limit = 20,
  filters?: { action?: string; actor?: string; hotel?: string; targetUser?: string; search?: string },
) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  for (const [key, value] of Object.entries(filters ?? {})) {
    const trimmed = value?.trim();
    if (trimmed) params.set(key, trimmed);
  }

  return useQuery<PlatformAuditLogsResponse>({
    queryKey: ['platform', 'audit-logs', page, limit, filters],
    queryFn: () => platformClientFetch(`/audit-logs?${params.toString()}`),
  });
}
