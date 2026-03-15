// ─── Shared Types — @hotel-os/shared-types ────────────────────────────────────
// Used by both apps/api (NestJS) and apps/web (Next.js)

// ─── Enums ────────────────────────────────────────────────────────────────────

export type Role =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'MANAGER'
  | 'RECEPTIONIST'
  | 'HOUSEKEEPING'
  | 'CASHIER'
  | 'BARTENDER'
  | 'STAFF';

export type RoomStatus =
  | 'AVAILABLE'
  | 'OCCUPIED'
  | 'RESERVED'
  | 'HOUSEKEEPING'
  | 'MAINTENANCE'
  | 'OUT_OF_ORDER';

export type RoomType = 'STANDARD' | 'DELUXE' | 'SUITE' | 'PRESIDENTIAL' | 'FAMILY' | 'EXECUTIVE';

export type ReservationStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CHECKED_IN'
  | 'CHECKED_OUT'
  | 'CANCELLED'
  | 'NO_SHOW';

export type BookingSource = 'DIRECT' | 'BOOKING_COM' | 'EXPEDIA' | 'WALK_IN' | 'PHONE' | 'AIRBNB';

export type PaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID' | 'REFUNDED';

export type AttendanceType = 'CLOCK_IN' | 'CLOCK_OUT';

export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'SKIPPED';

export type ContractType = 'PERMANENT' | 'CONTRACT' | 'PART_TIME' | 'PROBATION';

export type FacilityStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';

export type ComplaintStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export type ComplaintPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type MaintenanceStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD';

export type RequisitionStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'FULFILLED';

export type InspectionStatus = 'SCHEDULED' | 'PASSED' | 'FAILED' | 'PENDING';

// ─── Core Interfaces ──────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  username: string;
  role: Role;
  isActive: boolean;
  staffId?: string;
  createdAt: string;
  lastLogin?: string;
}

export interface Staff {
  id: string;
  userId?: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  department: string;
  position: string;
  isActive: boolean;
  joinDate: string;
}

export interface Room {
  id: string;
  number: string;
  floor: number;
  type: RoomType;
  status: RoomStatus;
  baseRate: number;
  capacity: number;
  beds: string;
  amenities: string[];
  notes?: string;
}

export interface Guest {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  nationality?: string;
  idType?: string;
  idNumber?: string;
  isVip: boolean;
  notes?: string;
}

export interface Reservation {
  id: string;
  guestId: string;
  roomId: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  adults: number;
  children: number;
  status: ReservationStatus;
  source: BookingSource;
  ratePerNight: number;
  totalAmount: number;
  amountPaid: number;
  notes?: string;
  createdAt: string;
}

export interface FolioItem {
  id: string;
  reservationId: string;
  date: string;
  description: string;
  category: 'ROOM' | 'FB' | 'SERVICE' | 'PAYMENT' | 'OTHER';
  amount: number;
  createdBy: string;
}

export interface AttendanceRecord {
  id: string;
  staffId: string;
  type: AttendanceType;
  timestamp: string;
  method: 'MANUAL' | 'BIOMETRIC' | 'CARD';
  note?: string;
}

// ─── API Helpers ──────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  message?: string;
  statusCode: number;
}
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
}
