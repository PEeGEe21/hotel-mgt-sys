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

function normalizeOverview(data: any, range: ReportRange): ReportsOverview {
  return {
    range: data?.range ?? { from: range.from ?? '', to: range.to ?? '' },
    summary: {
      revenueTotal: typeof data?.summary?.revenueTotal === 'number' ? data.summary.revenueTotal : 0,
      occupancyRate:
        typeof data?.summary?.occupancyRate === 'number' ? data.summary.occupancyRate : 0,
      occupiedRooms:
        typeof data?.summary?.occupiedRooms === 'number' ? data.summary.occupiedRooms : 0,
      totalRooms: typeof data?.summary?.totalRooms === 'number' ? data.summary.totalRooms : 0,
      adr: typeof data?.summary?.adr === 'number' ? data.summary.adr : 0,
      outstandingFolios:
        typeof data?.summary?.outstandingFolios === 'number' ? data.summary.outstandingFolios : 0,
      outstandingCount:
        typeof data?.summary?.outstandingCount === 'number' ? data.summary.outstandingCount : 0,
    },
    revenueChart: Array.isArray(data?.revenueChart) ? data.revenueChart : [],
    guestSourceData: Array.isArray(data?.guestSourceData) ? data.guestSourceData : [],
  };
}

export function useRevenueReport(range: ReportRange = {}, options: ReportQueryOptions = {}) {
  return useQuery<RevenueReport>({
    queryKey: ['reports', 'revenue', range],
    queryFn: async () => {
      const { data } = await api.get(`/reports/revenue?${buildParams(range)}`);
      return {
        range: data?.range ?? { from: range.from ?? '', to: range.to ?? '' },
        summary: {
          invoiceTotal: typeof data?.summary?.invoiceTotal === 'number' ? data.summary.invoiceTotal : 0,
          paidAmount: typeof data?.summary?.paidAmount === 'number' ? data.summary.paidAmount : 0,
          outstanding: typeof data?.summary?.outstanding === 'number' ? data.summary.outstanding : 0,
          count: typeof data?.summary?.count === 'number' ? data.summary.count : 0,
          byStream: {
            rooms: typeof data?.summary?.byStream?.rooms === 'number' ? data.summary.byStream.rooms : 0,
            fnb: typeof data?.summary?.byStream?.fnb === 'number' ? data.summary.byStream.fnb : 0,
            events: typeof data?.summary?.byStream?.events === 'number' ? data.summary.byStream.events : 0,
          },
        },
        byType: Array.isArray(data?.byType) ? data.byType : [],
        byStatus: Array.isArray(data?.byStatus) ? data.byStatus : [],
        daily: Array.isArray(data?.daily) ? data.daily : [],
        streamDaily: Array.isArray(data?.streamDaily) ? data.streamDaily : [],
        rows: Array.isArray(data?.rows) ? data.rows : [],
      };
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
      return normalizeOverview(data, range);
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
      return {
        range: data?.range ?? { from: range.from ?? '', to: range.to ?? '' },
        summary: {
          totalCost: typeof data?.summary?.totalCost === 'number' ? data.summary.totalCost : 0,
          totalQuantity: typeof data?.summary?.totalQuantity === 'number' ? data.summary.totalQuantity : 0,
          count: typeof data?.summary?.count === 'number' ? data.summary.count : 0,
          costRatio: typeof data?.summary?.costRatio === 'number' ? data.summary.costRatio : 0,
          grossProfit: typeof data?.summary?.grossProfit === 'number' ? data.summary.grossProfit : 0,
        },
        byCategory: Array.isArray(data?.byCategory) ? data.byCategory : [],
        byItem: Array.isArray(data?.byItem) ? data.byItem : [],
        daily: Array.isArray(data?.daily) ? data.daily : [],
        expenseRows: Array.isArray(data?.expenseRows) ? data.expenseRows : [],
        rows: Array.isArray(data?.rows) ? data.rows : [],
      };
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
      const rows = Array.isArray(data?.rows) ? data.rows : [];
      return {
        range: data?.range ?? { from: filters.from ?? '', to: filters.to ?? '' },
        summary: {
          outstanding: typeof data?.summary?.outstanding === 'number' ? data.summary.outstanding : 0,
          charges: typeof data?.summary?.charges === 'number' ? data.summary.charges : 0,
          paidAmount: typeof data?.summary?.paidAmount === 'number' ? data.summary.paidAmount : 0,
          count: typeof data?.summary?.count === 'number' ? data.summary.count : 0,
        },
        rows,
        total: typeof data?.total === 'number' ? data.total : rows.length,
        page: typeof data?.page === 'number' ? data.page : filters.page ?? 1,
        limit: typeof data?.limit === 'number' ? data.limit : filters.limit ?? rows.length,
        totalPages: typeof data?.totalPages === 'number' ? data.totalPages : 1,
      };
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
      return {
        range: data?.range ?? { from: range.from ?? '', to: range.to ?? '' },
        summary: {
          totalGuests: typeof data?.summary?.totalGuests === 'number' ? data.summary.totalGuests : 0,
          inHouse: typeof data?.summary?.inHouse === 'number' ? data.summary.inHouse : 0,
          vipGuests: typeof data?.summary?.vipGuests === 'number' ? data.summary.vipGuests : 0,
          repeatGuests:
            typeof data?.summary?.repeatGuests === 'number' ? data.summary.repeatGuests : 0,
          avgStayNights: data?.summary?.avgStayNights ?? '0.0',
        },
        sourceData: Array.isArray(data?.sourceData) ? data.sourceData : [],
        nationalityMix: Array.isArray(data?.nationalityMix) ? data.nationalityMix : [],
        reservationStatusRows: Array.isArray(data?.reservationStatusRows)
          ? data.reservationStatusRows
          : [],
        guestTrend: Array.isArray(data?.guestTrend) ? data.guestTrend : [],
        bookingSourceTrend: Array.isArray(data?.bookingSourceTrend) ? data.bookingSourceTrend : [],
      };
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
      return {
        range: data?.range ?? { from: range.from ?? '', to: range.to ?? '' },
        summary: {
          totalStaff: typeof data?.summary?.totalStaff === 'number' ? data.summary.totalStaff : 0,
          attendanceRate:
            typeof data?.summary?.attendanceRate === 'number' ? data.summary.attendanceRate : 0,
          avgHoursWorked: data?.summary?.avgHoursWorked ?? '0.0',
          lateArrivals:
            typeof data?.summary?.lateArrivals === 'number' ? data.summary.lateArrivals : 0,
        },
        attendanceWeek: Array.isArray(data?.attendanceWeek) ? data.attendanceWeek : [],
        departmentRows: Array.isArray(data?.departmentRows) ? data.departmentRows : [],
      };
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
      return {
        range: data?.range ?? { from: range.from ?? '', to: range.to ?? '' },
        summary: {
          totalItems: typeof data?.summary?.totalItems === 'number' ? data.summary.totalItems : 0,
          lowStockCount:
            typeof data?.summary?.lowStockCount === 'number' ? data.summary.lowStockCount : 0,
          inventoryValue:
            typeof data?.summary?.inventoryValue === 'number' ? data.summary.inventoryValue : 0,
          turnoverRate:
            typeof data?.summary?.turnoverRate === 'number' ? data.summary.turnoverRate : 0,
        },
        inventoryAlertRows: Array.isArray(data?.inventoryAlertRows) ? data.inventoryAlertRows : [],
      };
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
      return {
        range: data?.range ?? { from: range.from ?? '', to: range.to ?? '' },
        summary: {
          occupancyRate:
            typeof data?.summary?.occupancyRate === 'number' ? data.summary.occupancyRate : 0,
          occupiedRooms:
            typeof data?.summary?.occupiedRooms === 'number' ? data.summary.occupiedRooms : 0,
          checkedIn: typeof data?.summary?.checkedIn === 'number' ? data.summary.checkedIn : 0,
          adr: typeof data?.summary?.adr === 'number' ? data.summary.adr : 0,
          revPar: typeof data?.summary?.revPar === 'number' ? data.summary.revPar : 0,
        },
        occupancyData: Array.isArray(data?.occupancyData) ? data.occupancyData : [],
        roomTypeRevenue: Array.isArray(data?.roomTypeRevenue) ? data.roomTypeRevenue : [],
      };
    },
    enabled: options.enabled ?? true,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}
