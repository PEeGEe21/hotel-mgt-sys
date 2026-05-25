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
  keycards: {
    enabledHotels: number;
    mockProviderHotels: number;
    liveProviderHotels: number;
    hotelsWithMissingRoomLockMappings: number;
    recentFailureEvents24h: number;
    denialSpikeHotels: Array<{
      id: string;
      name: string;
      deniedEvents24h: number;
    }>;
    missingMappingHotels: Array<{
      id: string;
      name: string;
      totalRooms: number;
      missingRooms: number;
    }>;
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
    keycardAuthEnabled: boolean;
    onboardingStatus: 'PENDING_SETUP' | 'ROOMS_ADDED' | 'STAFF_INVITED' | 'ACTIVE';
    suspendedAt: string | null;
    suspensionReason: string | null;
    deletedAt: string | null;
    purgeAfterAt: string | null;
    status: 'active' | 'stale' | 'setup' | 'suspended' | 'deleted';
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
    health: {
      score: number;
      status: 'healthy' | 'warning' | 'critical' | 'setup';
      label: string;
      lastStaffLoginAt: string | null;
      lastReservationCreatedAt: string | null;
      overdueInvoices: number;
      signals: string[];
    };
    keycards: {
      enabled: boolean;
      hotelLockVendor: string | null;
      providerMode: 'mock' | 'live';
      totalRooms: number;
      roomsWithLockMapping: number;
      missingRoomLockMappings: number;
      deniedEvents24h: number;
    };
  }>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type PlatformSearchResponse = {
  hotels: Array<{
    id: string;
    name: string;
    city: string;
    country: string;
    domain: string | null;
  }>;
  users: Array<{
    id: string;
    email: string;
    role: string;
    name: string;
    hotel: {
      id: string;
      name: string;
    } | null;
  }>;
  actions: Array<{
    id: string;
    action: string;
    createdAt: string;
    actorName: string;
    hotel: {
      id: string;
      name: string;
    } | null;
  }>;
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

export type PlatformSuperAdminsResponse = {
  superAdmins: Array<{
    id: string;
    email: string;
    name: string;
    isActive: boolean;
    lastLoginAt: string | null;
    createdAt: string;
    mfaEnabled: boolean;
  }>;
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
  keycardAuthEnabled: boolean;
  lockVendor: string | null;
  createdAt: string;
  updatedAt: string;
  onboardingStatus: 'PENDING_SETUP' | 'ROOMS_ADDED' | 'STAFF_INVITED' | 'ACTIVE';
  suspendedAt: string | null;
  suspensionReason: string | null;
  deletedAt: string | null;
  purgeAfterAt: string | null;
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
  health: {
    score: number;
    status: 'healthy' | 'warning' | 'critical' | 'setup';
    label: string;
    lastStaffLoginAt: string | null;
    lastReservationCreatedAt: string | null;
    overdueInvoices: number;
    signals: string[];
  };
  subscription: {
    id: string;
    planId: string | null;
    planCode: string | null;
    planName: string | null;
    status: 'TRIAL' | 'ACTIVE' | 'GRACE' | 'SUSPENDED' | 'EXPIRED' | 'CANCELLED';
    startsAt: string | null;
    endsAt: string | null;
    trialEndsAt: string | null;
    graceEndsAt: string | null;
    billingEmail: string | null;
    billingContactName: string | null;
    notes: string | null;
  } | null;
  keycards: {
    enabled: boolean;
    hotelLockVendor: string | null;
    providerMode: 'mock' | 'live';
    lockApiConfigured: boolean;
    totalRooms: number;
    roomsWithLockMapping: number;
    missingRoomLockMappings: number;
    roomVendors: Array<{
      vendor: string;
      rooms: number;
    }>;
    accessSummary: {
      granted24h: number;
      denied24h: number;
      expired24h: number;
      revoked24h: number;
      unknown24h: number;
      recentEvents: Array<{
        id: string;
        createdAt: string;
        result: string;
        reason: string | null;
        roomNumber: string | null;
        deviceId: string | null;
        accessTokenPreview: string | null;
        diagnosis: 'configuration' | 'lifecycle' | 'unknown';
      }>;
    };
    supportSignals: {
      configurationIssues: string[];
      lifecycleIssues: string[];
    };
  };
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

export type PlatformSubscriptionsOverviewResponse = {
  plans: Array<{
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
  }>;
  assignments: Array<{
    id: string;
    hotelId: string;
    hotelName: string;
    planId: string | null;
    planCode: string | null;
    planName: string | null;
    status: 'TRIAL' | 'ACTIVE' | 'GRACE' | 'SUSPENDED' | 'EXPIRED' | 'CANCELLED' | 'NONE';
    startsAt: string | null;
    endsAt: string | null;
    trialEndsAt: string | null;
    graceEndsAt: string | null;
    billingEmail: string | null;
    billingContactName: string | null;
  }>;
  statusCounts: Record<string, number>;
};

export type PlatformFeatureCatalogOverviewResponse = {
  features: Array<{
    key: string;
    name: string | null;
    description: string | null;
    category: string | null;
    defaultEnabled: boolean;
    globalEnabled: boolean;
    scopeType: 'MODULE' | 'SUB_FEATURE' | 'LIMIT';
    rolloutStage: 'INTERNAL' | 'BETA' | 'GA' | 'DEPRECATED';
    planRequired: string | null;
    planAssignments: Array<{
      planId: string;
      planCode: string;
      planName: string;
      enabled: boolean;
      limitValue: string | null;
    }>;
    overrideCount: number;
  }>;
  plans: Array<{
    id: string;
    code: string;
    name: string;
  }>;
  recentChanges: Array<{
    id: string;
    action: string;
    createdAt: string;
    hotel: {
      id: string;
      name: string;
    } | null;
    actorName: string;
    summary: string;
    metadata: unknown;
  }>;
  totals: {
    features: number;
    hotelOverrides: number;
  };
};

export type PlatformHotelObservabilityResponse = {
  hotelId: string;
  hotelName: string;
  summary: {
    openFailedJobs: number;
    activeModuleAlerts: number;
    degradedEvents24h: number;
    openSupportCases: number;
    suspended: boolean;
    deleted: boolean;
  };
  failedJobs: Array<{
    jobType: string;
    label: string;
    enabled: boolean;
    lastTriggeredAt: string | null;
    lastSucceededAt: string | null;
    lastFailedAt: string | null;
    lastError: string | null;
    severity: 'info' | 'warning';
  }>;
  moduleAlerts: Array<{
    moduleKey: string;
    label: string;
    eventName: string;
    eventCount: number;
    lastEventAt: string | null;
    lastEventType: string | null;
    lastSummary: string | null;
    status: 'alerting' | 'stale' | 'healthy';
  }>;
  recentIncidents: Array<{
    id: string;
    source: 'realtime' | 'cron';
    severity: 'info' | 'warning';
    title: string;
    summary: string;
    createdAt: string;
    moduleKey: string | null;
    jobType: string | null;
  }>;
};

export type PlatformSupportCasesResponse = {
  cases: Array<{
    id: string;
    hotelId: string;
    hotelName: string;
    subject: string;
    category: string;
    requestType: 'PLAN_UPGRADE' | 'BILLING_CONTACT_CHANGE' | 'FEATURE_ACTIVATION' | null;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    status: 'OPEN' | 'TRIAGED' | 'IN_PROGRESS' | 'WAITING_ON_HOTEL' | 'RESOLVED' | 'CLOSED';
    source: 'HOTEL' | 'PLATFORM' | 'SYSTEM';
    assignedAdminId: string | null;
    assignedAdminName: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  statusCounts: Record<string, number>;
};

export type PlatformSupportCaseDetailResponse = {
  id: string;
  hotelId: string;
  hotel: {
    id: string;
    name: string;
    city: string;
    country: string;
  };
  subject: string;
  description: string;
  category: string;
  requestType: 'PLAN_UPGRADE' | 'BILLING_CONTACT_CHANGE' | 'FEATURE_ACTIVATION' | null;
  requestPayload: Record<string, unknown> | null;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'OPEN' | 'TRIAGED' | 'IN_PROGRESS' | 'WAITING_ON_HOTEL' | 'RESOLVED' | 'CLOSED';
  source: 'HOTEL' | 'PLATFORM' | 'SYSTEM';
  assignedAdmin: {
    id: string;
    name: string;
    email: string;
  } | null;
  createdBy: {
    id: string;
    name: string;
    email: string;
  } | null;
  createdAt: string;
  updatedAt: string;
  subscriptionSnapshot: unknown;
  entitlementSnapshot: unknown;
  liveEntitlements: {
    hotelId: string;
    plan: {
      id: string | null;
      code: string | null;
      name: string | null;
    } | null;
    subscriptionStatus: string;
    features: Record<string, boolean>;
    limits: Record<string, string | number | null>;
    warnings: string[];
    items: Array<{
      key: string;
      name: string | null;
      description: string | null;
      category: string | null;
      scopeType: 'MODULE' | 'SUB_FEATURE' | 'LIMIT';
      rolloutStage: 'INTERNAL' | 'BETA' | 'GA' | 'DEPRECATED';
      planRequired: string | null;
      globalEnabled: boolean;
      defaultEnabled: boolean;
      planEnabled: boolean | null;
      planLimitValue: string | null;
      overrideEnabled: boolean | null;
      overrideLimitValue: string | null;
      overrideReason: string | null;
      hotelRolloutEnabled: boolean | null;
      effectiveEnabled: boolean;
      effectiveLimitValue: string | null;
    }>;
  };
  hotelHealth: PlatformHotelDetailResponse['health'];
  hotelLifecycle: {
    onboardingStatus: PlatformHotelDetailResponse['onboardingStatus'];
    suspendedAt: string | null;
    suspensionReason: string | null;
    deletedAt: string | null;
    purgeAfterAt: string | null;
  };
  hotelSubscription: PlatformHotelDetailResponse['subscription'];
  keycards: PlatformHotelDetailResponse['keycards'];
  events: Array<{
    id: string;
    type: string;
    payload: unknown;
    createdAt: string;
    actor: {
      id: string;
      name: string;
      email: string;
    } | null;
  }>;
  comments: Array<{
    id: string;
    visibility: 'INTERNAL' | 'HOTEL_VISIBLE';
    body: string;
    createdAt: string;
    author: {
      id: string;
      name: string;
      email: string;
    } | null;
  }>;
};

export type PlatformHotelEntitlementsResponse = {
  hotelId: string;
  plan: {
    id: string | null;
    code: string | null;
    name: string | null;
  } | null;
  subscriptionStatus: string;
  features: Record<string, boolean>;
  limits: Record<string, string | number | null>;
  warnings: string[];
  items: Array<{
    key: string;
    name: string | null;
    description: string | null;
    category: string | null;
    scopeType: 'MODULE' | 'SUB_FEATURE' | 'LIMIT';
    rolloutStage: 'INTERNAL' | 'BETA' | 'GA' | 'DEPRECATED';
    planRequired: string | null;
    globalEnabled: boolean;
    defaultEnabled: boolean;
    planEnabled: boolean | null;
    planLimitValue: string | null;
    overrideEnabled: boolean | null;
    overrideLimitValue: string | null;
    overrideReason: string | null;
    hotelRolloutEnabled: boolean | null;
    effectiveEnabled: boolean;
    effectiveLimitValue: string | null;
  }>;
  recentChanges: Array<{
    id: string;
    action: string;
    createdAt: string;
    actorName: string;
    metadata: unknown;
  }>;
};
