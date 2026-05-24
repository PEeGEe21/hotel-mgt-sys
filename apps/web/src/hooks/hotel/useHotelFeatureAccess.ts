'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export type HotelFeatureAccessResponse = {
  flags: {
    keycard_auth: boolean;
  };
  sources: {
    keycard_auth: {
      globalEnabled: boolean;
      hotelEnabled: boolean;
    };
  };
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
