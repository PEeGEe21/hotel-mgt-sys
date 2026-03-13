// ─── Frontend room data & display config ──────────────────────────────────────
// Types come from @hotel-os/shared-types
// This file holds: seed/mock data + display-only label/color mappings

import type { RoomStatus, RoomType } from '@hotel-os/shared-types';

// Re-export so pages only need one import
export type { RoomStatus, RoomType } from '@hotel-os/shared-types';

export type Room = {
  id: string;
  number: string;
  floor: number;
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

export const rooms: Room[] = [
  // Floor 1
  { id: 'r101', number: '101', floor: 1, type: 'STANDARD', status: 'AVAILABLE', capacity: 2, beds: '1 Queen', baseRate: 150, lastCleaned: '2026-03-11', amenities: ['WiFi', 'AC', 'TV'] },
  { id: 'r102', number: '102', floor: 1, type: 'STANDARD', status: 'OCCUPIED', capacity: 2, beds: '1 Queen', baseRate: 150, currentGuest: 'David Mensah', guestId: 'g5', checkIn: '2026-03-10', checkOut: '2026-03-14', amenities: ['WiFi', 'AC', 'TV'] },
  { id: 'r103', number: '103', floor: 1, type: 'STANDARD', status: 'HOUSEKEEPING', capacity: 2, beds: '2 Single', baseRate: 150, housekeeper: 'Adaeze Okafor', lastCleaned: '2026-03-10', amenities: ['WiFi', 'AC', 'TV'] },
  { id: 'r104', number: '104', floor: 1, type: 'STANDARD', status: 'AVAILABLE', capacity: 2, beds: '1 Queen', baseRate: 150, lastCleaned: '2026-03-11', amenities: ['WiFi', 'AC', 'TV'] },
  { id: 'r105', number: '105', floor: 1, type: 'DELUXE', status: 'RESERVED', capacity: 2, beds: '1 King', baseRate: 220, reservationId: 'res007', checkIn: '2026-03-12', checkOut: '2026-03-15', amenities: ['WiFi', 'AC', 'TV', 'Mini Bar', 'Safe'] },
  { id: 'r106', number: '106', floor: 1, type: 'STANDARD', status: 'OUT_OF_ORDER', capacity: 2, beds: '1 Queen', baseRate: 150, notes: 'Bathroom renovation in progress', amenities: ['WiFi', 'AC', 'TV'] },
  // Floor 2
  { id: 'r201', number: '201', floor: 2, type: 'DELUXE', status: 'OCCUPIED', capacity: 2, beds: '1 King', baseRate: 220, currentGuest: 'Yuki Tanaka', guestId: 'g6', checkIn: '2026-03-09', checkOut: '2026-03-13', amenities: ['WiFi', 'AC', 'TV', 'Mini Bar', 'Safe'] },
  { id: 'r202', number: '202', floor: 2, type: 'DELUXE', status: 'AVAILABLE', capacity: 2, beds: '1 King', baseRate: 220, lastCleaned: '2026-03-11', amenities: ['WiFi', 'AC', 'TV', 'Mini Bar', 'Safe'] },
  { id: 'r203', number: '203', floor: 2, type: 'DELUXE', status: 'HOUSEKEEPING', capacity: 2, beds: '1 King', baseRate: 220, housekeeper: 'Emeka Obi', amenities: ['WiFi', 'AC', 'TV', 'Mini Bar', 'Safe'] },
  { id: 'r204', number: '204', floor: 2, type: 'STANDARD', status: 'AVAILABLE', capacity: 2, beds: '2 Single', baseRate: 150, lastCleaned: '2026-03-11', amenities: ['WiFi', 'AC', 'TV'] },
  { id: 'r205', number: '205', floor: 2, type: 'FAMILY', status: 'OCCUPIED', capacity: 5, beds: '1 King + 2 Single', baseRate: 280, currentGuest: 'Marcus Johnson', guestId: 'g8', checkIn: '2026-03-08', checkOut: '2026-03-12', amenities: ['WiFi', 'AC', 'TV', 'Safe'] },
  { id: 'r206', number: '206', floor: 2, type: 'DELUXE', status: 'MAINTENANCE', capacity: 2, beds: '1 King', baseRate: 220, notes: 'AC unit replacement scheduled', amenities: ['WiFi', 'AC', 'TV', 'Mini Bar', 'Safe'] },
  // Floor 3
  { id: 'r301', number: '301', floor: 3, type: 'SUITE', status: 'AVAILABLE', capacity: 3, beds: '1 King + Sofa', baseRate: 380, lastCleaned: '2026-03-11', amenities: ['WiFi', 'AC', 'TV', 'Mini Bar', 'Balcony', 'Jacuzzi', 'Safe'] },
  { id: 'r302', number: '302', floor: 3, type: 'SUITE', status: 'RESERVED', capacity: 3, beds: '1 King + Sofa', baseRate: 380, reservationId: 'res008', checkIn: '2026-03-13', checkOut: '2026-03-17', amenities: ['WiFi', 'AC', 'TV', 'Mini Bar', 'Balcony', 'Jacuzzi', 'Safe'] },
  { id: 'r303', number: '303', floor: 3, type: 'SUITE', status: 'OCCUPIED', capacity: 3, beds: '1 King + Sofa', baseRate: 380, currentGuest: 'Fatima Al-Hassan', guestId: 'g7', checkIn: '2026-03-07', checkOut: '2026-03-12', amenities: ['WiFi', 'AC', 'TV', 'Mini Bar', 'Balcony', 'Jacuzzi', 'Safe'] },
  { id: 'r304', number: '304', floor: 3, type: 'SUITE', status: 'OCCUPIED', capacity: 3, beds: '1 King + Sofa', baseRate: 380, currentGuest: 'James Okafor', guestId: 'g1', checkIn: '2026-03-08', checkOut: '2026-03-12', notes: 'VIP — no feather pillows', amenities: ['WiFi', 'AC', 'TV', 'Mini Bar', 'Balcony', 'Jacuzzi', 'Safe'] },
  { id: 'r305', number: '305', floor: 3, type: 'FAMILY', status: 'AVAILABLE', capacity: 5, beds: '1 King + 2 Single', baseRate: 280, lastCleaned: '2026-03-11', amenities: ['WiFi', 'AC', 'TV', 'Safe'] },
  { id: 'r306', number: '306', floor: 3, type: 'SUITE', status: 'HOUSEKEEPING', capacity: 3, beds: '1 King + Sofa', baseRate: 380, housekeeper: 'Adaeze Okafor', amenities: ['WiFi', 'AC', 'TV', 'Mini Bar', 'Balcony', 'Jacuzzi', 'Safe'] },
  // Floor 4
  { id: 'r401', number: '401', floor: 4, type: 'PRESIDENTIAL', status: 'OCCUPIED', capacity: 4, beds: '2 King', baseRate: 800, currentGuest: 'Sofia Martins', guestId: 'g4', checkIn: '2026-03-10', checkOut: '2026-03-14', notes: 'VIP guest', amenities: ['WiFi', 'AC', 'TV', 'Mini Bar', 'Balcony', 'Sea View', 'Jacuzzi', 'Kitchen', 'Safe', 'Bathtub'] },
  { id: 'r402', number: '402', floor: 4, type: 'PRESIDENTIAL', status: 'AVAILABLE', capacity: 4, beds: '2 King', baseRate: 800, lastCleaned: '2026-03-11', amenities: ['WiFi', 'AC', 'TV', 'Mini Bar', 'Balcony', 'Sea View', 'Jacuzzi', 'Kitchen', 'Safe', 'Bathtub'] },
  { id: 'r403', number: '403', floor: 4, type: 'SUITE', status: 'RESERVED', capacity: 3, beds: '1 King + Sofa', baseRate: 380, reservationId: 'res009', checkIn: '2026-03-14', checkOut: '2026-03-18', amenities: ['WiFi', 'AC', 'TV', 'Mini Bar', 'Balcony', 'Jacuzzi', 'Safe'] },
  { id: 'r404', number: '404', floor: 4, type: 'DELUXE', status: 'OUT_OF_ORDER', capacity: 2, beds: '1 King', baseRate: 220, notes: 'Water damage — awaiting repair', amenities: ['WiFi', 'AC', 'TV', 'Mini Bar', 'Safe'] },
];

// ─── Display config (frontend only — not in shared-types) ─────────────────────

export const STATUS_CONFIG: Record<RoomStatus, {
  label: string; color: string; bg: string; border: string; dot: string;
}> = {
  AVAILABLE:    { label: 'Available',     color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', dot: 'bg-emerald-400' },
  OCCUPIED:     { label: 'Occupied',      color: 'text-blue-400',    bg: 'bg-blue-500/15',    border: 'border-blue-500/30',    dot: 'bg-blue-400' },
  RESERVED:     { label: 'Reserved',      color: 'text-violet-400',  bg: 'bg-violet-500/15',  border: 'border-violet-500/30',  dot: 'bg-violet-400' },
  HOUSEKEEPING: { label: 'Housekeeping',  color: 'text-amber-400',   bg: 'bg-amber-500/15',   border: 'border-amber-500/30',   dot: 'bg-amber-400' },
  MAINTENANCE:  { label: 'Maintenance',   color: 'text-orange-400',  bg: 'bg-orange-500/15',  border: 'border-orange-500/30',  dot: 'bg-orange-400' },
  OUT_OF_ORDER: { label: 'Out of Order',  color: 'text-red-400',     bg: 'bg-red-500/15',     border: 'border-red-500/30',     dot: 'bg-red-400' },
};

export const TYPE_CONFIG: Record<RoomType, { label: string; color: string }> = {
  STANDARD:     { label: 'Standard',     color: 'text-slate-400' },
  DELUXE:       { label: 'Deluxe',       color: 'text-sky-400' },
  SUITE:        { label: 'Suite',        color: 'text-violet-400' },
  PRESIDENTIAL: { label: 'Presidential', color: 'text-amber-400' },
  FAMILY:       { label: 'Family',       color: 'text-emerald-400' },
};

export const ALL_ROOM_STATUSES: RoomStatus[] = ['AVAILABLE','OCCUPIED','RESERVED','HOUSEKEEPING','MAINTENANCE','OUT_OF_ORDER'];
export const ALL_ROOM_TYPES: RoomType[] = ['STANDARD','DELUXE','SUITE','PRESIDENTIAL','FAMILY'];
export const ALL_AMENITIES = ['WiFi','AC','TV','Mini Bar','Balcony','Sea View','Jacuzzi','Kitchen','Safe','Bathtub'];