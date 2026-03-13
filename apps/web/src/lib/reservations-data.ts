// ─── Frontend reservations data & display config ──────────────────────────────
// Types come from @hotel-os/shared-types

import type { ReservationStatus, BookingSource } from '@hotel-os/shared-types';

export type { ReservationStatus, BookingSource } from '@hotel-os/shared-types';

export type Reservation = {
  id: string;
  guestName: string;
  guestId: string;
  roomNumber: string;
  roomId: string;
  roomType: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  adults: number;
  children: number;
  status: ReservationStatus;
  ratePerNight: number;
  totalAmount: number;
  amountPaid: number;
  source: string; // display string — mapped from BookingSource on API
  notes?: string;
  createdAt: string;
};

export const reservations: Reservation[] = [
  { id: 'res001', guestName: 'David Mensah',     guestId: 'g5',  roomNumber: '102', roomId: 'r102', roomType: 'Standard',     checkIn: '2026-03-10', checkOut: '2026-03-14', nights: 4, adults: 2, children: 0, status: 'CHECKED_IN',  ratePerNight: 150, totalAmount: 600,  amountPaid: 300,  source: 'Booking.com', createdAt: '2026-03-05' },
  { id: 'res002', guestName: 'Yuki Tanaka',      guestId: 'g6',  roomNumber: '201', roomId: 'r201', roomType: 'Deluxe',       checkIn: '2026-03-09', checkOut: '2026-03-13', nights: 4, adults: 2, children: 0, status: 'CHECKED_IN',  ratePerNight: 220, totalAmount: 880,  amountPaid: 880,  source: 'Direct',      createdAt: '2026-03-01' },
  { id: 'res003', guestName: 'Marcus Johnson',   guestId: 'g8',  roomNumber: '205', roomId: 'r205', roomType: 'Family',       checkIn: '2026-03-08', checkOut: '2026-03-12', nights: 4, adults: 2, children: 3, status: 'CHECKED_IN',  ratePerNight: 280, totalAmount: 1120, amountPaid: 560,  source: 'Expedia',     notes: 'Extra cot requested', createdAt: '2026-02-28' },
  { id: 'res004', guestName: 'Fatima Al-Hassan', guestId: 'g7',  roomNumber: '303', roomId: 'r303', roomType: 'Suite',        checkIn: '2026-03-07', checkOut: '2026-03-12', nights: 5, adults: 2, children: 0, status: 'CHECKED_IN',  ratePerNight: 380, totalAmount: 1900, amountPaid: 1900, source: 'Direct',      createdAt: '2026-02-20' },
  { id: 'res005', guestName: 'James Okafor',     guestId: 'g1',  roomNumber: '304', roomId: 'r304', roomType: 'Suite',        checkIn: '2026-03-08', checkOut: '2026-03-12', nights: 4, adults: 1, children: 0, status: 'CHECKED_IN',  ratePerNight: 380, totalAmount: 1520, amountPaid: 760,  source: 'Direct',      notes: 'VIP — no feather pillows', createdAt: '2026-03-02' },
  { id: 'res006', guestName: 'Sofia Martins',    guestId: 'g4',  roomNumber: '401', roomId: 'r401', roomType: 'Presidential', checkIn: '2026-03-10', checkOut: '2026-03-14', nights: 4, adults: 2, children: 0, status: 'CHECKED_IN',  ratePerNight: 800, totalAmount: 3200, amountPaid: 3200, source: 'Direct',      notes: 'VIP guest', createdAt: '2026-03-01' },
  { id: 'res007', guestName: 'Amara Diallo',     guestId: 'g9',  roomNumber: '105', roomId: 'r105', roomType: 'Deluxe',       checkIn: '2026-03-12', checkOut: '2026-03-15', nights: 3, adults: 2, children: 0, status: 'CONFIRMED',   ratePerNight: 220, totalAmount: 660,  amountPaid: 0,    source: 'Booking.com', createdAt: '2026-03-07' },
  { id: 'res008', guestName: 'Chen Wei',         guestId: 'g10', roomNumber: '302', roomId: 'r302', roomType: 'Suite',        checkIn: '2026-03-13', checkOut: '2026-03-17', nights: 4, adults: 2, children: 1, status: 'CONFIRMED',   ratePerNight: 380, totalAmount: 1520, amountPaid: 760,  source: 'Expedia',     createdAt: '2026-03-08' },
  { id: 'res009', guestName: 'Ngozi Williams',   guestId: 'g11', roomNumber: '403', roomId: 'r403', roomType: 'Suite',        checkIn: '2026-03-14', checkOut: '2026-03-18', nights: 4, adults: 2, children: 0, status: 'PENDING',     ratePerNight: 380, totalAmount: 1520, amountPaid: 0,    source: 'Walk-in',     createdAt: '2026-03-11' },
  { id: 'res010', guestName: 'Emeka Chukwu',     guestId: 'g12', roomNumber: '101', roomId: 'r101', roomType: 'Standard',     checkIn: '2026-03-15', checkOut: '2026-03-17', nights: 2, adults: 1, children: 0, status: 'CONFIRMED',   ratePerNight: 150, totalAmount: 300,  amountPaid: 150,  source: 'Direct',      createdAt: '2026-03-10' },
  { id: 'res011', guestName: 'Lena Fischer',     guestId: 'g13', roomNumber: '202', roomId: 'r202', roomType: 'Deluxe',       checkIn: '2026-03-05', checkOut: '2026-03-08', nights: 3, adults: 2, children: 0, status: 'CHECKED_OUT', ratePerNight: 220, totalAmount: 660,  amountPaid: 660,  source: 'Booking.com', createdAt: '2026-02-25' },
  { id: 'res012', guestName: 'Kofi Asante',      guestId: 'g14', roomNumber: '104', roomId: 'r104', roomType: 'Standard',     checkIn: '2026-03-10', checkOut: '2026-03-11', nights: 1, adults: 1, children: 0, status: 'NO_SHOW',     ratePerNight: 150, totalAmount: 150,  amountPaid: 0,    source: 'Booking.com', createdAt: '2026-03-08' },
  { id: 'res013', guestName: 'Aisha Bello',      guestId: 'g15', roomNumber: '204', roomId: 'r204', roomType: 'Standard',     checkIn: '2026-03-09', checkOut: '2026-03-11', nights: 2, adults: 2, children: 0, status: 'CANCELLED',   ratePerNight: 150, totalAmount: 300,  amountPaid: 0,    source: 'Expedia',     notes: 'Cancelled 2 days before arrival', createdAt: '2026-03-01' },
  { id: 'res014', guestName: 'Pedro Alvarez',    guestId: 'g16', roomNumber: '301', roomId: 'r301', roomType: 'Suite',        checkIn: '2026-03-18', checkOut: '2026-03-22', nights: 4, adults: 2, children: 0, status: 'CONFIRMED',   ratePerNight: 380, totalAmount: 1520, amountPaid: 760,  source: 'Direct',      createdAt: '2026-03-10' },
];

// ─── Display config (frontend only) ──────────────────────────────────────────

export const STATUS_CONFIG: Record<ReservationStatus, {
  color: string; bg: string; border: string; dot: string; label: string;
}> = {
  PENDING:      { label: 'Pending',      color: 'text-amber-400',   bg: 'bg-amber-500/15',   border: 'border-amber-500/30',   dot: 'bg-amber-400' },
  CONFIRMED:    { label: 'Confirmed',    color: 'text-blue-400',    bg: 'bg-blue-500/15',    border: 'border-blue-500/30',    dot: 'bg-blue-400' },
  CHECKED_IN:   { label: 'Checked In',  color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', dot: 'bg-emerald-400' },
  CHECKED_OUT:  { label: 'Checked Out', color: 'text-slate-400',   bg: 'bg-slate-500/15',   border: 'border-slate-500/30',   dot: 'bg-slate-400' },
  CANCELLED:    { label: 'Cancelled',   color: 'text-red-400',     bg: 'bg-red-500/15',     border: 'border-red-500/30',     dot: 'bg-red-400' },
  NO_SHOW:      { label: 'No Show',     color: 'text-orange-400',  bg: 'bg-orange-500/15',  border: 'border-orange-500/30',  dot: 'bg-orange-400' },
};

export const SOURCE_COLORS: Record<string, string> = {
  Direct: 'text-blue-400', 'Booking.com': 'text-sky-400',
  Expedia: 'text-violet-400', 'Walk-in': 'text-emerald-400',
};

export const ALL_RESERVATION_STATUSES: ReservationStatus[] = ['PENDING','CONFIRMED','CHECKED_IN','CHECKED_OUT','CANCELLED','NO_SHOW'];