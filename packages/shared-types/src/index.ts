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
  | 'COOK'
  | 'BARTENDER'
  | 'STAFF';

export type PrepStation = 'NONE' | 'KITCHEN' | 'BAR';

export type PrepStatus = 'QUEUED' | 'IN_PROGRESS' | 'READY' | 'FULFILLED' | 'CANCELLED';

export type RoomStatus =
  | 'AVAILABLE'
  | 'OCCUPIED'
  | 'RESERVED'
  | 'HOUSEKEEPING'
  | 'MAINTENANCE'
  | 'DIRTY'
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
export type SubscriptionStatus =
  | 'TRIAL'
  | 'ACTIVE'
  | 'GRACE'
  | 'SUSPENDED'
  | 'EXPIRED'
  | 'CANCELLED';
export type FeatureScopeType = 'MODULE' | 'SUB_FEATURE' | 'LIMIT';
export type FeatureRolloutStage = 'INTERNAL' | 'BETA' | 'GA' | 'DEPRECATED';
export type SupportCaseSource = 'HOTEL' | 'PLATFORM' | 'SYSTEM';
export type SupportCasePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type SupportCaseStatus =
  | 'OPEN'
  | 'TRIAGED'
  | 'IN_PROGRESS'
  | 'WAITING_ON_HOTEL'
  | 'RESOLVED'
  | 'CLOSED';
export type SupportCommentVisibility = 'INTERNAL' | 'HOTEL_VISIBLE';

export interface HotelEntitlementSnapshot {
  hotelId: string;
  plan: {
    id: string | null;
    code: string | null;
    name: string | null;
  } | null;
  subscriptionStatus: SubscriptionStatus | 'NONE';
  features: Record<string, boolean>;
  limits: Record<string, number | string | null>;
  warnings: string[];
}

export interface PlatformSubscriptionPlanSummary {
  id: string;
  code: string;
  name: string;
  description: string | null;
  priceMonthly: number | null;
  priceYearly: number | null;
  billingIntervalOptions: string[];
  isActive: boolean;
  isPublic: boolean;
  sortOrder: number;
  hotelCount: number;
  activeHotelCount: number;
}

export interface PlatformHotelSubscriptionSummary {
  id: string;
  hotelId: string;
  hotelName: string;
  planId: string | null;
  planCode: string | null;
  planName: string | null;
  status: SubscriptionStatus | 'NONE';
  startsAt: string | null;
  endsAt: string | null;
  trialEndsAt: string | null;
  graceEndsAt: string | null;
  billingEmail: string | null;
  billingContactName: string | null;
}

export interface PlatformFeatureCatalogItem {
  key: string;
  name: string | null;
  description: string | null;
  category: string | null;
  defaultEnabled: boolean;
  globalEnabled: boolean;
  scopeType: FeatureScopeType;
  rolloutStage: FeatureRolloutStage;
  planRequired: string | null;
  planAssignments: Array<{
    planId: string;
    planCode: string;
    planName: string;
    enabled: boolean;
    limitValue: string | null;
  }>;
  overrideCount: number;
}

export interface PlatformSupportCaseSummary {
  id: string;
  hotelId: string;
  hotelName: string;
  subject: string;
  category: string;
  priority: SupportCasePriority;
  status: SupportCaseStatus;
  source: SupportCaseSource;
  assignedAdminId: string | null;
  assignedAdminName: string | null;
  createdAt: string;
  updatedAt: string;
}

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
