'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export type FacilityReportsFilters = {
  dateFrom?: string;
  dateTo?: string;
};

export type FacilityReportCard = {
  label: string;
  value: string;
  sub: string;
  color: string;
  bg: string;
  icon: 'facilities' | 'complaints' | 'inspections' | 'maintenance' | 'requisitions' | 'spend';
};

export type FacilityHealthRow = {
  name: string;
  complaints: number;
  inspections: number;
  maintenance: number;
  score: number;
  health: string;
};

type FacilityReportsResponse = {
  summary: {
    facilities: { total: number; active: number; inactive: number; maintenance: number };
    complaints: { total: number; open: number; resolved: number };
    inspections: { total: number; submitted: number; scheduled: number };
    maintenance: { total: number; active: number; closed: number; spend: number };
    requisitions: { total: number; pending: number; approved: number; fulfilled: number };
  };
  facilityHealth: FacilityHealthRow[];
  grouped: {
    type: Array<{ group: string; count: number }>;
    location: Array<{ group: string; count: number }>;
    department: Array<{ group: string; count: number }>;
  };
};

export type FacilityReportsData = {
  summaryCards: FacilityReportCard[];
  facilityHealth: FacilityHealthRow[];
  grouped: {
    type: Array<[string, number]>;
    location: Array<[string, number]>;
    department: Array<[string, number]>;
  };
};

export function useFacilityReports(filters: FacilityReportsFilters = {}) {
  return useQuery<FacilityReportsData>({
    queryKey: ['facility-reports', filters],
    queryFn: async () => {
      const { data } = await api.get<FacilityReportsResponse>('/facilities/reports/summary', {
        params: {
          dateFrom: filters.dateFrom || undefined,
          dateTo: filters.dateTo || undefined,
        },
      });

      return {
        summaryCards: [
          {
            label: 'Total Facilities',
            value: `${data.summary.facilities.total}`,
            sub: `${data.summary.facilities.active} Active · ${data.summary.facilities.inactive} Inactive · ${data.summary.facilities.maintenance} Maintenance`,
            color: 'text-blue-400',
            bg: 'bg-blue-500/10 border-blue-500/20',
            icon: 'facilities',
          },
          {
            label: 'Complaints',
            value: `${data.summary.complaints.total}`,
            sub: `${data.summary.complaints.open} Open · ${data.summary.complaints.resolved} Resolved`,
            color: 'text-orange-400',
            bg: 'bg-orange-500/10 border-orange-500/20',
            icon: 'complaints',
          },
          {
            label: 'Inspections',
            value: `${data.summary.inspections.total}`,
            sub: `${data.summary.inspections.submitted} Submitted · ${data.summary.inspections.scheduled} Scheduled`,
            color: 'text-violet-400',
            bg: 'bg-violet-500/10 border-violet-500/20',
            icon: 'inspections',
          },
          {
            label: 'Maintenance Tasks',
            value: `${data.summary.maintenance.total}`,
            sub: `${data.summary.maintenance.closed} Closed · ${data.summary.maintenance.active} Active`,
            color: 'text-emerald-400',
            bg: 'bg-emerald-500/10 border-emerald-500/20',
            icon: 'maintenance',
          },
          {
            label: 'Requisitions',
            value: `${data.summary.requisitions.total}`,
            sub: `${data.summary.requisitions.pending} Pending · ${data.summary.requisitions.approved} Approved · ${data.summary.requisitions.fulfilled} Fulfilled`,
            color: 'text-amber-400',
            bg: 'bg-amber-500/10 border-amber-500/20',
            icon: 'requisitions',
          },
          {
            label: 'Maintenance Spend',
            value: `₦${Math.round(data.summary.maintenance.spend / 1000)}k`,
            sub: 'Resolved work',
            color: 'text-pink-400',
            bg: 'bg-pink-500/10 border-pink-500/20',
            icon: 'spend',
          },
        ],
        facilityHealth: data.facilityHealth,
        grouped: {
          type: data.grouped.type.map((row) => [row.group, row.count]),
          location: data.grouped.location.map((row) => [row.group, row.count]),
          department: data.grouped.department.map((row) => [row.group, row.count]),
        },
      };
    },
    staleTime: 60_000,
  });
}
