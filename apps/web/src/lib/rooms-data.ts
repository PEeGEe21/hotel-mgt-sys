// ─── Frontend room data & display config ──────────────────────────────────────
// Types come from @hotel-os/shared-types
// This file holds: seed/mock data + display-only label/color mappings

import type { RoomStatus, RoomType } from '@hotel-os/shared-types';

// Re-export so pages only need one import
export type { RoomStatus, RoomType } from '@hotel-os/shared-types';

export type Room = {
  id: string;
  number: string;
  floorId: string;
  floor?: { id: string; name: string; level: number };
  type: RoomType;
  status: RoomStatus;
  capacity: number;
  beds: string;
  baseRate: number;
  currentGuest?: string;
  guestId?: string;
  checkIn?: string;
  checkOut?: string;
  reservationId?: string;
  housekeeper?: string;
  lastCleaned?: string;
  notes?: string;
  amenities: string[];
};

// ─── Display config (frontend only — not in shared-types) ─────────────────────

export const STATUS_CONFIG: Record<
  RoomStatus,
  {
    label: string;
    color: string;
    bg: string;
    border: string;
    dot: string;
  }
> = {
  AVAILABLE: {
    label: 'Available',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/15',
    border: 'border-emerald-500/30',
    dot: 'bg-emerald-400',
  },
  OCCUPIED: {
    label: 'Occupied',
    color: 'text-blue-400',
    bg: 'bg-blue-500/15',
    border: 'border-blue-500/30',
    dot: 'bg-blue-400',
  },
  RESERVED: {
    label: 'Reserved',
    color: 'text-violet-400',
    bg: 'bg-violet-500/15',
    border: 'border-violet-500/30',
    dot: 'bg-violet-400',
  },
  HOUSEKEEPING: {
    label: 'Housekeeping',
    color: 'text-amber-400',
    bg: 'bg-amber-500/15',
    border: 'border-amber-500/30',
    dot: 'bg-amber-400',
  },
  MAINTENANCE: {
    label: 'Maintenance',
    color: 'text-orange-400',
    bg: 'bg-orange-500/15',
    border: 'border-orange-500/30',
    dot: 'bg-orange-400',
  },
  OUT_OF_ORDER: {
    label: 'Out of Order',
    color: 'text-red-400',
    bg: 'bg-red-500/15',
    border: 'border-red-500/30',
    dot: 'bg-red-400',
  },
  DIRTY: {
    label: 'Dirty',
    color: 'text-amber-400',
    bg: 'bg-amber-500/15',
    border: 'border-amber-500/30',
    dot: 'bg-amber-400',
  },
};

export const TYPE_CONFIG: Record<RoomType, { label: string; color: string }> = {
  STANDARD: { label: 'Standard', color: 'text-slate-400' },
  DELUXE: { label: 'Deluxe', color: 'text-sky-400' },
  SUITE: { label: 'Suite', color: 'text-green-400' },
  EXECUTIVE: { label: 'Executive', color: 'text-amber-400' },
  PRESIDENTIAL: { label: 'Presidential', color: 'text-amber-400' },
  FAMILY: { label: 'Family', color: 'text-emerald-400' },
};

export const ALL_ROOM_STATUSES: RoomStatus[] = [
  'AVAILABLE',
  'OCCUPIED',
  'RESERVED',
  'DIRTY',
  'HOUSEKEEPING',
  'MAINTENANCE',
  'OUT_OF_ORDER',
];
export const ALL_ROOM_TYPES: RoomType[] = ['STANDARD', 'DELUXE', 'SUITE', 'EXECUTIVE', 'PRESIDENTIAL', 'FAMILY'];
export const ALL_AMENITIES = [
  'WiFi',
  'AC',
  'TV',
  'Mini Bar',
  'Balcony',
  'Sea View',
  'Jacuzzi',
  'Kitchen',
  'Safe',
  'Bathtub',
];
