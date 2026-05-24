'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export type HotelFeatureAccessResponse = {
  flags: Record<string, boolean>;
  limits: Record<string, string | number | null>;
  warnings: string[];
  plan: {
    id: string | null;
    code: string | null;
    name: string | null;
  } | null;
  subscriptionStatus: string;
  sources: Record<
    string,
    {
      globalEnabled: boolean;
      defaultEnabled: boolean;
      planEnabled: boolean | null;
      overrideEnabled: boolean | null;
      hotelEnabled: boolean | null;
      effectiveEnabled: boolean;
    }
  >;
  keycardAuth: {
    globalEnabled: boolean;
    hotelEnabled: boolean;
  } | null;
};

export function useHotelFeatureAccess() {
  return useQuery<HotelFeatureAccessResponse>({
    queryKey: ['hotel', 'feature-access'],
    queryFn: async () => {
      const { data } = await api.get('/hotels/me/features');
      return data;
    },
    staleTime: 60_000,
  });
}
