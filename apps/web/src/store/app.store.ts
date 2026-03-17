'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ─── Types ────────────────────────────────────────────────────────────────────
export type HotelInfo = {
  id: string;
  name: string;
  domain: string | null;
  city: string;
  country: string;
  currency: string;
  timezone: string;
  logo: string | null;
  email: string;
  phone: string;
  geofenceEnabled?: boolean;
  geofenceRadiusMeters?: number;
  attendancePinRequired?: boolean;
  attendanceKioskEnabled?: boolean;
  attendancePersonalEnabled?: boolean;
};

interface AppState {
  hotel: HotelInfo | null;
  // Actions
  setHotel: (hotel: HotelInfo) => void;
  clearHotel: () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────
// Persists to localStorage — survives logout and tab closes.
// Hotel info is set on login and stays until explicitly cleared.
// This means the login page always has branding even when logged out.
export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      hotel: null,
      setHotel: (hotel) => set({ hotel }),
      clearHotel: () => set({ hotel: null }),
    }),
    {
      name: 'hotel-app', // localStorage key
    },
  ),
);
