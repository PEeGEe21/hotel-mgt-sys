'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import openToast from '@/components/ToastComponent';

export type HrContractStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'AWAITING_SIGNATURE'
  | 'ACTIVE'
  | 'EXPIRING_SOON'
  | 'EXPIRED'
  | 'TERMINATED'
  | 'SUPERSEDED'
  | 'APPROVED'
  | 'REJECTED';

export type HrContractType = 'PERMANENT' | 'CONTRACT' | 'PART_TIME' | 'PROBATION';

export type HrContract = {
  id: string;
  contractNo: string;
  type: string;
  status: string;
  derivedStatus: HrContractStatus;
  startDate: string;
  endDate: string | null;
  salary: number;
  currency: string;
  positionTitle: string;
  positionSnapshot: string;
  staffNameSnapshot: string;
  employeeCodeSnapshot: string;
  departmentSnapshot: string;
  notes?: string | null;
  renewedFromContractId?: string | null;
  probationEndDate?: string | null;
  submittedAt?: string | null;
  submittedByUserId?: string | null;
  approvedAt?: string | null;
  approvedByUserId?: string | null;
  approvalComment?: string | null;
  signedAt?: string | null;
  signedByUserId?: string | null;
  activatedAt?: string | null;
  rejectedAt?: string | null;
  rejectedByUserId?: string | null;
  rejectionReason?: string | null;
  terminationDate?: string | null;
  terminationReason?: string | null;
  terminatedByUserId?: string | null;
  createdAt: string;
  updatedAt: string;
  staff?: {
    id: string;
    firstName: string;
    lastName: string;
    employeeCode: string;
  } | null;
  department?: { id: string; name: string } | null;
  latestCompensation?: {
    amount: number;
    currency: string;
    effectiveFrom: string;
    effectiveTo?: string | null;
  } | null;
  documents?: Array<{
    id: string;
    documentType: string;
    source: string;
    fileName: string;
    fileUrl: string;
    storageKey?: string | null;
    mimeType?: string | null;
    fileSizeBytes?: number | null;
    uploadedByUserId?: string | null;
    uploadedAt: string;
  }>;
};

export type HrContractDetail = HrContract & {
  renewedFromContract?: {
    id: string;
    contractNo: string;
  } | null;
  renewedContracts: Array<{
    id: string;
    contractNo: string;
    status: string;
    startDate: string;
  }>;
  approvals: Array<{
    id: string;
    routeName?: string | null;
    stepOrder: number;
    role: string;
    required: boolean;
    assignedUserId?: string | null;
    status: string;
    comment?: string | null;
    actedAt?: string | null;
    actedByUserId?: string | null;
    createdAt: string;
  }>;
  auditLogs: Array<{
    id: string;
    actorUserId?: string | null;
    action: string;
    fromStatus?: string | null;
    toStatus?: string | null;
    metadata?: Record<string, unknown> | null;
    createdAt: string;
  }>;
  documents: Array<{
    id: string;
    documentType: string;
    source: string;
    fileName: string;
    fileUrl: string;
    storageKey?: string | null;
    mimeType?: string | null;
    fileSizeBytes?: number | null;
    uploadedByUserId?: string | null;
    uploadedAt: string;
  }>;
  compensationHistory: Array<{
    id: string;
    amount: number;
    currency: string;
    effectiveFrom: string;
    effectiveTo?: string | null;
    reason?: string | null;
    createdAt: string;
  }>;
};

export type HrContractsResponse = {
  contracts: HrContract[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  stats: {
    active: number;
    expiringSoon: number;
    expired: number;
    draft: number;
  };
  settings: {
    contractExpiryWarningDays: number;
  };
};

export type HrContractsOverviewResponse = {
  generatedAt: string;
  settings: {
    contractExpiryWarningDays: number;
  };
  summary: {
    totalStaff: number;
    activeContracts: number;
    pendingApprovals: number;
    monthlyCommitment: number;
    expiringSoon: number;
    terminatedLast30Days: number;
    renewalsLast90Days: number;
    approvalBacklogOver3Days: number;
    contractCoveragePct: number;
  };
  headcountByDepartment: Array<{
    department: string;
    staffCount: number;
    activeContracts: number;
    monthlyCommitment: number;
    staffSharePct: number;
    commitmentSharePct: number;
  }>;
  contractStatusDistribution: Array<{
    status: string;
    label: string;
    count: number;
    sharePct: number;
  }>;
  contractTypeDistribution: Array<{
    type: string;
    label: string;
    count: number;
    monthlyCommitment: number;
    sharePct: number;
  }>;
  compensationTrend: Array<{
    month: string;
    label: string;
    totalAmount: number;
    changeCount: number;
    barPct: number;
  }>;
  expiringContracts: Array<{
    id: string;
    contractNo: string;
    staffNameSnapshot: string;
    departmentSnapshot: string;
    positionSnapshot: string;
    endDate: string | null;
    daysToExpiry: number | null;
  }>;
  approvalQueue: Array<{
    id: string;
    contractNo: string;
    staffNameSnapshot: string;
    departmentSnapshot: string;
    submittedAt: string | null;
    pendingDays: number | null;
    pendingRole: string | null;
    pendingStepOrder: number | null;
    rejectionReason: string | null;
  }>;
  approvalPerformance: Array<{
    role: string;
    label: string;
    openCount: number;
    backlogCount: number;
    completedStepsLast30Days: number;
    averagePendingDays: number;
  }>;
  departmentContractHealth: Array<{
    department: string;
    liveContracts: number;
    expiringSoon: number;
    pendingApprovals: number;
    awaitingSignature: number;
    terminationsLast90Days: number;
  }>;
  documentCompliance: {
    fullyCompliantLiveContracts: number;
    contractsMissingGeneratedPdf: number;
    contractsMissingSignedCopy: number;
    contractsWithMissingRequiredDocs: number;
    flaggedContracts: Array<{
      id: string;
      contractNo: string;
      staffNameSnapshot: string;
      departmentSnapshot: string;
      derivedStatus: string;
      missingDocumentLabels: string[];
    }>;
  };
  recentActivity: Array<{
    id: string;
    contractId: string;
    contractNo: string | null;
    staffNameSnapshot: string | null;
    action: string;
    actionLabel: string;
    fromStatus: string | null;
    toStatus: string | null;
    createdAt: string;
  }>;
};

export type HrContractAuditLogFilters = {
  search?: string;
  action?: string;
  page?: number;
  limit?: number;
};

export type HrContractAuditLogsResponse = {
  logs: Array<{
    id: string;
    contractId: string;
    actorUserId?: string | null;
    action: string;
    actionLabel: string;
    fromStatus?: string | null;
    toStatus?: string | null;
    metadata?: Record<string, unknown> | null;
    createdAt: string;
    contract?: {
      id: string;
      contractNo: string;
      staffNameSnapshot: string;
      departmentSnapshot: string;
      positionSnapshot: string;
      type: string;
      status: string;
    } | null;
  }>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  filters: {
    actions: string[];
    statuses: string[];
  };
};

export type HrContractFilters = {
  search?: string;
  status?: string;
  type?: string;
  departmentId?: string;
  staffId?: string;
  page?: number;
  limit?: number;
};

export type CreateHrContractInput = {
  staffId: string;
  departmentId?: string;
  positionTitle?: string;
  type: string;
  startDate: string;
  endDate?: string;
  salary: number;
  currency?: string;
  probationEndDate?: string;
  reportingManagerStaffId?: string;
  notes?: string;
  status?: string;
};

export type UpdateHrContractInput = Partial<CreateHrContractInput>;

export type UploadHrContractDocumentInput = {
  documentType: string;
  fileName: string;
  fileUrl: string;
  mimeType?: string;
  fileSizeBytes?: number;
  source?: string;
};

export type TerminateHrContractInput = {
  terminationDate: string;
  reason: string;
};

export type RenewHrContractInput = {
  startDate: string;
  endDate?: string;
  type?: string;
  positionTitle?: string;
  departmentId?: string;
  salary?: number;
  currency?: string;
  probationEndDate?: string;
  notes?: string;
  status?: string;
};

export type ApproveHrContractInput = {
  comment?: string;
};

export type SignHrContractInput = {
  comment?: string;
};

export type RejectHrContractInput = {
  reason: string;
};

export type HrContractApprovalRoute = {
  id: string;
  hotelId?: string | null;
  contractType?: string | null;
  isDefault: boolean;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  steps: Array<{
    id?: string;
    stepOrder: number;
    role: string;
    required: boolean;
    userId?: string | null;
  }>;
};

export type UpsertHrContractApprovalRouteInput = {
  name: string;
  contractType?: string;
  isDefault?: boolean;
  isActive?: boolean;
  steps: Array<{
    stepOrder: number;
    role: string;
    required?: boolean;
    userId?: string;
  }>;
};

export function useHrContracts(filters: HrContractFilters = {}) {
  return useQuery<HrContractsResponse>({
    queryKey: ['hr-contracts', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.search) params.set('search', filters.search);
      if (filters.status) params.set('status', filters.status);
      if (filters.type) params.set('type', filters.type);
      if (filters.departmentId) params.set('departmentId', filters.departmentId);
      if (filters.staffId) params.set('staffId', filters.staffId);
      if (filters.page) params.set('page', String(filters.page));
      if (filters.limit) params.set('limit', String(filters.limit));
      const { data } = await api.get(`/hr/contracts?${params.toString()}`);
      const contracts = Array.isArray(data?.contracts) ? data.contracts : [];
      return {
        contracts,
        total: typeof data?.total === 'number' ? data.total : contracts.length,
        page: typeof data?.page === 'number' ? data.page : filters.page ?? 1,
        limit: typeof data?.limit === 'number' ? data.limit : filters.limit ?? contracts.length,
        totalPages: typeof data?.totalPages === 'number' ? data.totalPages : 1,
        stats: {
          active: typeof data?.stats?.active === 'number' ? data.stats.active : 0,
          expiringSoon: typeof data?.stats?.expiringSoon === 'number' ? data.stats.expiringSoon : 0,
          expired: typeof data?.stats?.expired === 'number' ? data.stats.expired : 0,
          draft: typeof data?.stats?.draft === 'number' ? data.stats.draft : 0,
        },
        settings: {
          contractExpiryWarningDays:
            typeof data?.settings?.contractExpiryWarningDays === 'number'
              ? data.settings.contractExpiryWarningDays
              : 30,
        },
      };
    },
    staleTime: 20_000,
    placeholderData: keepPreviousData,
  });
}

export function useHrContract(id: string) {
  return useQuery<HrContractDetail>({
    queryKey: ['hr-contracts', id],
    queryFn: async () => {
      const { data } = await api.get(`/hr/contracts/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useHrContractApprovalRoutes() {
  return useQuery<{ routes: HrContractApprovalRoute[]; fallback: HrContractApprovalRoute }>({
    queryKey: ['hr-contract-approval-routes'],
    queryFn: async () => {
      const { data } = await api.get('/hr/contracts/approval-routes');
      return {
        routes: Array.isArray(data?.routes) ? data.routes : [],
        fallback:
          data?.fallback ??
          ({
            id: 'fallback',
            name: 'Default Approval Route',
            isDefault: true,
            isActive: true,
            createdAt: '',
            updatedAt: '',
            steps: [],
          } as HrContractApprovalRoute),
      };
    },
  });
}

export function useHrContractsOverview() {
  return useQuery<HrContractsOverviewResponse>({
    queryKey: ['hr-contracts-overview'],
    queryFn: async () => {
      const { data } = await api.get('/hr/contracts/overview');
      return {
        generatedAt: data?.generatedAt ?? '',
        settings: {
          contractExpiryWarningDays:
            typeof data?.settings?.contractExpiryWarningDays === 'number'
              ? data.settings.contractExpiryWarningDays
              : 30,
        },
        summary: {
          totalStaff: typeof data?.summary?.totalStaff === 'number' ? data.summary.totalStaff : 0,
          activeContracts:
            typeof data?.summary?.activeContracts === 'number' ? data.summary.activeContracts : 0,
          pendingApprovals:
            typeof data?.summary?.pendingApprovals === 'number' ? data.summary.pendingApprovals : 0,
          monthlyCommitment:
            typeof data?.summary?.monthlyCommitment === 'number' ? data.summary.monthlyCommitment : 0,
          expiringSoon:
            typeof data?.summary?.expiringSoon === 'number' ? data.summary.expiringSoon : 0,
          terminatedLast30Days:
            typeof data?.summary?.terminatedLast30Days === 'number'
              ? data.summary.terminatedLast30Days
              : 0,
          renewalsLast90Days:
            typeof data?.summary?.renewalsLast90Days === 'number'
              ? data.summary.renewalsLast90Days
              : 0,
          approvalBacklogOver3Days:
            typeof data?.summary?.approvalBacklogOver3Days === 'number'
              ? data.summary.approvalBacklogOver3Days
              : 0,
          contractCoveragePct:
            typeof data?.summary?.contractCoveragePct === 'number'
              ? data.summary.contractCoveragePct
              : 0,
        },
        headcountByDepartment: Array.isArray(data?.headcountByDepartment) ? data.headcountByDepartment : [],
        contractStatusDistribution: Array.isArray(data?.contractStatusDistribution)
          ? data.contractStatusDistribution
          : [],
        contractTypeDistribution: Array.isArray(data?.contractTypeDistribution)
          ? data.contractTypeDistribution
          : [],
        compensationTrend: Array.isArray(data?.compensationTrend) ? data.compensationTrend : [],
        expiringContracts: Array.isArray(data?.expiringContracts) ? data.expiringContracts : [],
        approvalQueue: Array.isArray(data?.approvalQueue) ? data.approvalQueue : [],
        approvalPerformance: Array.isArray(data?.approvalPerformance) ? data.approvalPerformance : [],
        departmentContractHealth: Array.isArray(data?.departmentContractHealth)
          ? data.departmentContractHealth
          : [],
        documentCompliance: {
          fullyCompliantLiveContracts:
            typeof data?.documentCompliance?.fullyCompliantLiveContracts === 'number'
              ? data.documentCompliance.fullyCompliantLiveContracts
              : 0,
          contractsMissingGeneratedPdf:
            typeof data?.documentCompliance?.contractsMissingGeneratedPdf === 'number'
              ? data.documentCompliance.contractsMissingGeneratedPdf
              : 0,
          contractsMissingSignedCopy:
            typeof data?.documentCompliance?.contractsMissingSignedCopy === 'number'
              ? data.documentCompliance.contractsMissingSignedCopy
              : 0,
          contractsWithMissingRequiredDocs:
            typeof data?.documentCompliance?.contractsWithMissingRequiredDocs === 'number'
              ? data.documentCompliance.contractsWithMissingRequiredDocs
              : 0,
          flaggedContracts: Array.isArray(data?.documentCompliance?.flaggedContracts)
            ? data.documentCompliance.flaggedContracts
            : [],
        },
        recentActivity: Array.isArray(data?.recentActivity) ? data.recentActivity : [],
      };
    },
    staleTime: 20_000,
  });
}

export function useHrContractAuditLogs(filters: HrContractAuditLogFilters = {}) {
  return useQuery<HrContractAuditLogsResponse>({
    queryKey: ['hr-contract-audit-logs', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.search) params.set('search', filters.search);
      if (filters.action) params.set('action', filters.action);
      if (filters.page) params.set('page', String(filters.page));
      if (filters.limit) params.set('limit', String(filters.limit));
      const { data } = await api.get(`/hr/contracts/audit-logs?${params.toString()}`);
      const logs = Array.isArray(data?.logs) ? data.logs : [];
      return {
        logs,
        total: typeof data?.total === 'number' ? data.total : logs.length,
        page: typeof data?.page === 'number' ? data.page : filters.page ?? 1,
        limit: typeof data?.limit === 'number' ? data.limit : filters.limit ?? logs.length,
        totalPages: typeof data?.totalPages === 'number' ? data.totalPages : 1,
        filters: {
          actions: Array.isArray(data?.filters?.actions) ? data.filters.actions : [],
          statuses: Array.isArray(data?.filters?.statuses) ? data.filters.statuses : [],
        },
      };
    },
    staleTime: 20_000,
    placeholderData: keepPreviousData,
  });
}

export function useRunHrContractNotificationsScan() {
  return useMutation({
    mutationFn: () =>
      api.post('/hr/contracts/scan/notifications').then((response) => response.data),
    onSuccess: () => {
      openToast('success', 'Contract notifications scan completed');
    },
    onError: (error: any) =>
      openToast('error', error?.response?.data?.message ?? 'Could not run notifications scan'),
  });
}

export function useCreateHrContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateHrContractInput) =>
      api.post('/hr/contracts', dto).then((response) => response.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hr-contracts'] });
      qc.invalidateQueries({ queryKey: ['hr-contracts-overview'] });
      openToast('success', 'Contract created');
    },
    onError: (error: any) =>
      openToast('error', error?.response?.data?.message ?? 'Could not create contract'),
  });
}

export function useUpdateHrContract(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: UpdateHrContractInput) =>
      api.patch(`/hr/contracts/${id}`, dto).then((response) => response.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hr-contracts'] });
      qc.invalidateQueries({ queryKey: ['hr-contracts', id] });
      qc.invalidateQueries({ queryKey: ['hr-contracts-overview'] });
      openToast('success', 'Contract updated');
    },
    onError: (error: any) =>
      openToast('error', error?.response?.data?.message ?? 'Could not update contract'),
  });
}

export function useUploadHrContractDocument(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: UploadHrContractDocumentInput) =>
      api.post(`/hr/contracts/${id}/documents`, dto).then((response) => response.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hr-contracts', id] });
      qc.invalidateQueries({ queryKey: ['hr-contracts-overview'] });
      openToast('success', 'Document uploaded');
    },
    onError: (error: any) =>
      openToast('error', error?.response?.data?.message ?? 'Could not upload document'),
  });
}

export function useTerminateHrContract(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: TerminateHrContractInput) =>
      api.post(`/hr/contracts/${id}/terminate`, dto).then((response) => response.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hr-contracts'] });
      qc.invalidateQueries({ queryKey: ['hr-contracts', id] });
      qc.invalidateQueries({ queryKey: ['hr-contracts-overview'] });
      openToast('success', 'Contract terminated');
    },
    onError: (error: any) =>
      openToast('error', error?.response?.data?.message ?? 'Could not terminate contract'),
  });
}

export function useRenewHrContract(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: RenewHrContractInput) =>
      api.post(`/hr/contracts/${id}/renew`, dto).then((response) => response.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hr-contracts'] });
      qc.invalidateQueries({ queryKey: ['hr-contracts', id] });
      qc.invalidateQueries({ queryKey: ['hr-contracts-overview'] });
      openToast('success', 'Contract renewed');
    },
    onError: (error: any) =>
      openToast('error', error?.response?.data?.message ?? 'Could not renew contract'),
  });
}

export function useSubmitHrContract(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post(`/hr/contracts/${id}/submit`).then((response) => response.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hr-contracts'] });
      qc.invalidateQueries({ queryKey: ['hr-contracts', id] });
      qc.invalidateQueries({ queryKey: ['hr-contracts-overview'] });
      openToast('success', 'Contract submitted for approval');
    },
    onError: (error: any) =>
      openToast('error', error?.response?.data?.message ?? 'Could not submit contract'),
  });
}

export function useApproveHrContract(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: ApproveHrContractInput) =>
      api.post(`/hr/contracts/${id}/approve`, dto).then((response) => response.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hr-contracts'] });
      qc.invalidateQueries({ queryKey: ['hr-contracts', id] });
      qc.invalidateQueries({ queryKey: ['hr-contracts-overview'] });
      openToast('success', 'Contract approved');
    },
    onError: (error: any) =>
      openToast('error', error?.response?.data?.message ?? 'Could not approve contract'),
  });
}

export function useSignHrContract(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: SignHrContractInput) =>
      api.post(`/hr/contracts/${id}/sign`, dto).then((response) => response.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hr-contracts'] });
      qc.invalidateQueries({ queryKey: ['hr-contracts', id] });
      qc.invalidateQueries({ queryKey: ['hr-contracts-overview'] });
      openToast('success', 'Contract marked as signed');
    },
    onError: (error: any) =>
      openToast('error', error?.response?.data?.message ?? 'Could not mark contract as signed'),
  });
}

export function useRejectHrContract(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: RejectHrContractInput) =>
      api.post(`/hr/contracts/${id}/reject`, dto).then((response) => response.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hr-contracts'] });
      qc.invalidateQueries({ queryKey: ['hr-contracts', id] });
      qc.invalidateQueries({ queryKey: ['hr-contracts-overview'] });
      openToast('success', 'Contract rejected');
    },
    onError: (error: any) =>
      openToast('error', error?.response?.data?.message ?? 'Could not reject contract'),
  });
}

export function useCreateHrContractApprovalRoute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: UpsertHrContractApprovalRouteInput) =>
      api.post('/hr/contracts/approval-routes', dto).then((response) => response.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hr-contract-approval-routes'] });
      openToast('success', 'Approval route created');
    },
    onError: (error: any) =>
      openToast('error', error?.response?.data?.message ?? 'Could not create approval route'),
  });
}

export function useUpdateHrContractApprovalRoute(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: UpsertHrContractApprovalRouteInput) =>
      api.patch(`/hr/contracts/approval-routes/${id}`, dto).then((response) => response.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hr-contract-approval-routes'] });
      openToast('success', 'Approval route updated');
    },
    onError: (error: any) =>
      openToast('error', error?.response?.data?.message ?? 'Could not update approval route'),
  });
}
