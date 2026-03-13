'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/store/app.store';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export function useHotelBranding() {
  const { hotel, setHotel } = useAppStore();

  useEffect(() => {
    const domain = window.location.hostname;

    // Bust cache if the cached hotel belongs to a different domain
    if (hotel?.domain && hotel.domain !== domain) {
      setHotel(null as any);
    }

    // Already have the right hotel cached — skip fetch
    if (hotel && (!hotel.domain || hotel.domain === domain)) return;

    fetch(`${API}/auth/hotel-info?domain=${encodeURIComponent(domain)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setHotel(data);
      })
      .catch(() => {});
  }, []);

  return hotel;
}
