export type PlatformStatsResponse = {
  totals: {
    hotels: number;
    users: number;
    activeUsers: number;
    recentLogins24h: number;
    recentReservations30d: number;
    staleHotels30d: number;
    suspendedHotels: number;
  };
  generatedAt: string;
};

export type PlatformActivityFeedResponse = {
  events: Array<{
    id: string;
    action: string;
    targetType: string | null;
    targetId: string | null;
    createdAt: string;
    hotel: { id: string; name: string } | null;
    actor: {
      id: string;
      email: string;
      role: string;
      name: string;
    };
    metadata: unknown;
  }>;
};

export type PlatformHotelsResponse = {
  hotels: Array<{
    id: string;
    name: string;
    domain: string | null;
    city: string;
    country: string;
    email: string;
    phone: string;
    createdAt: string;
    updatedAt: string;
    onboardingStatus: 'PENDING_SETUP' | 'ROOMS_ADDED' | 'STAFF_INVITED' | 'ACTIVE';
    suspendedAt: string | null;
    suspensionReason: string | null;
    status: 'active' | 'stale' | 'setup' | 'suspended';
    counts: {
      rooms: number;
      staff: number;
      reservations: number;
    };
    primaryAdmin: {
      id: string;
      email: string;
      isActive: boolean;
      name: string;
    } | null;
    latestStaffLoginAt: string | null;
  }>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type PlatformUsersResponse = {
  users: Array<{
    id: string;
    email: string;
    username: string | null;
    role: string;
    isActive: boolean;
    mustChangePassword: boolean;
    lastLoginAt: string | null;
    createdAt: string;
    staff: {
      id: string;
      employeeCode: string;
      name: string;
      department: string;
      position: string;
    } | null;
    hotel: {
      id: string;
      name: string;
      city: string;
      country: string;
    } | null;
  }>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type PlatformHotelDetailResponse = {
  id: string;
  name: string;
  domain: string | null;
  address: string;
  city: string;
  state: string | null;
  country: string;
  phone: string;
  email: string;
  website: string | null;
  description: string | null;
  currency: string;
  timezone: string;
  createdAt: string;
  updatedAt: string;
  onboardingStatus: 'PENDING_SETUP' | 'ROOMS_ADDED' | 'STAFF_INVITED' | 'ACTIVE';
  suspendedAt: string | null;
  suspensionReason: string | null;
  _count: {
    rooms: number;
    staff: number;
    guests: number;
    reservations: number;
    facilities: number;
    invoices: number;
    payments: number;
  };
  admins: Array<{
    id: string;
    email: string;
    isActive: boolean;
    lastLoginAt: string | null;
    name: string;
    department: string | null;
    position: string | null;
  }>;
  recentReservations: Array<{
    id: string;
    createdAt: string;
    status: string;
    checkIn: string;
    checkOut: string;
  }>;
  recentStaffLogins: Array<{
    id: string;
    name: string;
    department: string;
    email: string;
    lastLoginAt: string | null;
  }>;
};

export type PlatformUserDetailResponse = {
  id: string;
  email: string;
  username: string | null;
  role: string;
  isActive: boolean;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  staff: {
    id: string;
    employeeCode: string;
    name: string;
    department: string;
    position: string;
    phone: string | null;
  } | null;
  hotel: {
    id: string;
    name: string;
    city: string;
    country: string;
  } | null;
  recentSessions: Array<{
    id: string;
    createdAt: string;
    expiresAt: string;
    isImpersonation: boolean;
    impersonatorId: string | null;
  }>;
};

export type PlatformHotelOnboardingResponse = {
  hotel: {
    id: string;
    name: string;
    city: string;
    country: string;
    email: string;
    phone: string;
    onboardingStatus: 'PENDING_SETUP' | 'ROOMS_ADDED' | 'STAFF_INVITED' | 'ACTIVE';
  };
  admin: {
    id: string;
    name: string;
    email: string;
    username: string | null;
    employeeCode: string;
    role: string;
  };
  credentials: {
    temporaryPassword: string;
    mustChangePassword: boolean;
  };
};

export type PlatformAuditLogsResponse = {
  logs: Array<{
    id: string;
    action: string;
    targetType: string | null;
    targetId: string | null;
    createdAt: string;
    ipAddress: string | null;
    userAgent: string | null;
    metadata: unknown;
    hotel: { id: string; name: string } | null;
    actor: {
      id: string;
      email: string;
      role: string;
      name: string;
    };
    targetUser: {
      id: string;
      email: string;
      name: string;
    } | null;
  }>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};
