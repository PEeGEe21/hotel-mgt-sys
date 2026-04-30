'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export type ReportRange = {
  from?: string;
  to?: string;
};

type ReportQueryOptions = {
  enabled?: boolean;
};

export type RevenueReportRow = {
  id: string;
  invoiceNo: string;
  issuedAt: string;
  type: string;
  paymentStatus: string;
  invoiceTotal: number;
  paidAmount: number;
  balance: number;
};

export type RevenueReport = {
  range: { from: string; to: string };
  summary: {
    invoiceTotal: number;
    paidAmount: number;
    outstanding: number;
    count: number;
    byStream: {
      rooms: number;
      fnb: number;
      events: number;
    };
  };
  byType: {
    type: string;
    invoiceTotal: number;
    paidAmount: number;
    balance: number;
    count: number;
  }[];
  byStatus: {
    status: string;
    invoiceTotal: number;
    paidAmount: number;
    balance: number;
    count: number;
  }[];
  daily: {
    date: string;
    invoiceTotal: number;
    paidAmount: number;
    balance: number;
    count: number;
  }[];
  streamDaily: {
    month: string;
    rooms: number;
    fnb: number;
    events: number;
    total: number;
    momChange: number | null;
  }[];
  rows: RevenueReportRow[];
};

export type ReportsOverview = {
  range: { from: string; to: string };
  summary: {
    revenueTotal: number;
    occupancyRate: number;
    occupiedRooms: number;
    totalRooms: number;
    adr: number;
    outstandingFolios: number;
    outstandingCount: number;
  };
  revenueChart: {
    month: string;
    rooms: number;
    fnb: number;
    events: number;
    total: number;
  }[];
  guestSourceData: {
    name: string;
    value: number;
    color: string;
  }[];
};

export type GuestsInsightsReport = {
  range: { from: string; to: string };
  summary: {
    totalGuests: number;
    inHouse: number;
    vipGuests: number;
    repeatGuests: number;
    avgStayNights: string;
  };
  sourceData: { name: string; value: number; color: string }[];
  nationalityMix: { country: string; pct: number; color: string }[];
  reservationStatusRows: { status: string; count: number; revenue: number; avg: string; pct: number }[];
  guestTrend: {
    period: string;
    totalGuests: number;
    repeatGuests: number;
    vipGuests: number;
    avgStayNights: number;
  }[];
  bookingSourceTrend: {
    period: string;
    direct: number;
    ota: number;
    walkIn: number;
    other: number;
  }[];
};

export type StaffInsightsReport = {
  range: { from: string; to: string };
  summary: {
    totalStaff: number;
    attendanceRate: number;
    avgHoursWorked: string;
    lateArrivals: number;
  };
  attendanceWeek: { day: string; present: number; late: number; absent: number }[];
  departmentRows: { dept: string; count: number; present: number; rate: number; hours: string }[];
};

export type InventoryInsightsReport = {
  range: { from: string; to: string };
  summary: {
    totalItems: number;
    lowStockCount: number;
    inventoryValue: number;
    turnoverRate: number;
  };
  inventoryAlertRows: { item: string; current: number; par: number; unit: string; category: string }[];
};

export type OccupancyInsightsReport = {
  range: { from: string; to: string };
  summary: {
    occupancyRate: number;
    occupiedRooms: number;
    checkedIn: number;
    adr: number;
    revPar: number;
  };
  occupancyData: { month: string; occupancy: number; adr: number; revpar: number }[];
  roomTypeRevenue: { type: string; revenue: number; nights: number; adr: number }[];
};

export type CogsReport = {
  range: { from: string; to: string };
  summary: {
    totalCost: number;
    totalQuantity: number;
    count: number;
    costRatio: number;
    grossProfit: number;
  };
  byCategory: {
    category: string;
    cost: number;
    quantity: number;
    count: number;
  }[];
  byItem: {
    itemId: string;
    name: string;
    sku: string;
    category: string;
    unit: string;
    cost: number;
    quantity: number;
    count: number;
  }[];
  daily: {
    date: string;
    cost: number;
    quantity: number;
    count: number;
  }[];
  expenseRows: {
    month: string;
    payroll: number;
    supplies: number;
    utilities: number;
    maintenance: number;
    marketing: number;
    total: number;
  }[];
  rows: {
    id: string;
    createdAt: string;
    sourceId: string | null;
    quantity: number;
    itemName: string;
    itemSku: string;
    itemCategory: string;
    itemUnit: string;
    unitCost: number;
    cost: number;
    note: string | null;
  }[];
};

export type OutstandingFoliosReport = {
  range: { from: string; to: string } | null;
  summary: {
    outstanding: number;
    charges: number;
    paidAmount: number;
    count: number;
  };
  rows: {
    id: string;
    reservationNo: string;
    checkIn: string;
    checkOut: string;
    status: string;
    paymentStatus: string;
    charges: number;
    paidAmount: number;
    outstanding: number;
    folioItemCount: number;
    guest: { firstName: string; lastName: string } | null;
    room: { number: string; type: string } | null;
  }[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

function buildParams(range: ReportRange) {
  const params = new URLSearchParams();
  if (range.from) params.set('from', range.from);
  if (range.to) params.set('to', range.to);
  return params;
}

export function useRevenueReport(range: ReportRange = {}, options: ReportQueryOptions = {}) {
  return useQuery<RevenueReport>({
    queryKey: ['reports', 'revenue', range],
    queryFn: async () => {
      const { data } = await api.get(`/reports/revenue?${buildParams(range)}`);
      return data;
    },
    enabled: options.enabled ?? true,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

export function useReportsOverview(range: ReportRange = {}, options: ReportQueryOptions = {}) {
  return useQuery<ReportsOverview>({
    queryKey: ['reports', 'overview', range],
    queryFn: async () => {
      const { data } = await api.get(`/reports/overview?${buildParams(range)}`);
      return data;
    },
    enabled: options.enabled ?? true,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

export function useCogsReport(range: ReportRange = {}, options: ReportQueryOptions = {}) {
  return useQuery<CogsReport>({
    queryKey: ['reports', 'cogs', range],
    queryFn: async () => {
      const { data } = await api.get(`/reports/cogs?${buildParams(range)}`);
      return data;
    },
    enabled: options.enabled ?? true,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

export function useOutstandingFoliosReport(
  filters: ReportRange & { search?: string; page?: number; limit?: number } = {},
  options: ReportQueryOptions = {},
) {
  return useQuery<OutstandingFoliosReport>({
    queryKey: ['reports', 'outstanding-folios', filters],
    queryFn: async () => {
      const params = buildParams(filters);
      if (filters.search) params.set('search', filters.search);
      if (filters.page) params.set('page', String(filters.page));
      if (filters.limit) params.set('limit', String(filters.limit));
      const { data } = await api.get(`/reports/outstanding-folios?${params}`);
      return data;
    },
    enabled: options.enabled ?? true,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

export function useGuestInsightsReport(range: ReportRange = {}, options: ReportQueryOptions = {}) {
  return useQuery<GuestsInsightsReport>({
    queryKey: ['reports', 'guests', range],
    queryFn: async () => {
      const { data } = await api.get(`/reports/guests?${buildParams(range)}`);
      return data;
    },
    enabled: options.enabled ?? true,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

export function useStaffInsightsReport(range: ReportRange = {}, options: ReportQueryOptions = {}) {
  return useQuery<StaffInsightsReport>({
    queryKey: ['reports', 'staff', range],
    queryFn: async () => {
      const { data } = await api.get(`/reports/staff?${buildParams(range)}`);
      return data;
    },
    enabled: options.enabled ?? true,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

export function useInventoryInsightsReport(range: ReportRange = {}, options: ReportQueryOptions = {}) {
  return useQuery<InventoryInsightsReport>({
    queryKey: ['reports', 'inventory', range],
    queryFn: async () => {
      const { data } = await api.get(`/reports/inventory?${buildParams(range)}`);
      return data;
    },
    enabled: options.enabled ?? true,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

export function useOccupancyInsightsReport(range: ReportRange = {}, options: ReportQueryOptions = {}) {
  return useQuery<OccupancyInsightsReport>({
    queryKey: ['reports', 'occupancy', range],
    queryFn: async () => {
      const { data } = await api.get(`/reports/occupancy?${buildParams(range)}`);
      return data;
    },
    enabled: options.enabled ?? true,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}
