'use client';

import { create } from 'zustand';

type PlatformStoreState = {
  selectedHotelId: string | null;
  selectedUserId: string | null;
  setSelectedHotelId: (hotelId: string | null) => void;
  setSelectedUserId: (userId: string | null) => void;
  clearSelections: () => void;
};

export const usePlatformStore = create<PlatformStoreState>()((set) => ({
  selectedHotelId: null,
  selectedUserId: null,
  setSelectedHotelId: (selectedHotelId) => set({ selectedHotelId }),
  setSelectedUserId: (selectedUserId) => set({ selectedUserId }),
  clearSelections: () =>
    set({
      selectedHotelId: null,
      selectedUserId: null,
    }),
}));
