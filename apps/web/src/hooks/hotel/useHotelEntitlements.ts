'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export type HotelEntitlementsResponse = {
  hotel: {
    id: string;
    name: string;
    email: string;
  };
  subscription: {
    plan: {
      id: string | null;
      code: string | null;
      name: string | null;
    } | null;
    status: string;
  };
  features: Record<string, boolean>;
  limits: Record<string, string | number | null>;
  warnings: string[];
  items: Array<{
    key: string;
    name: string | null;
    description: string | null;
    category: string | null;
    scopeType: 'MODULE' | 'SUB_FEATURE' | 'LIMIT';
    rolloutStage: 'INTERNAL' | 'BETA' | 'GA' | 'DEPRECATED';
    planRequired: string | null;
    effectiveEnabled: boolean;
    effectiveLimitValue: string | null;
  }>;
  support: {
    supportAvailable: boolean;
    supportTier: string;
    openCasesCount: number;
    contactMode: string;
  };
  requestablePlans: Array<{
    id: string;
    code: string;
    name: string;
    description: string | null;
  }>;
};

export function useHotelEntitlements() {
  return useQuery<HotelEntitlementsResponse>({
    queryKey: ['hotel', 'entitlements'],
    queryFn: async () => {
      const { data } = await api.get('/hotels/me/entitlements');
      return data;
    },
    staleTime: 60_000,
  });
}
