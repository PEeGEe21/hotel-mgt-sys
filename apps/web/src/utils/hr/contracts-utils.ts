import { HrContract } from '@/hooks/hr/useHrContracts';
import {
  ApprovalFormState,
  CreateFormState,
  RenewalFormState,
  TerminationFormState,
} from '@/types/hr/contracts.type';

export function buildDefaultForm(): CreateFormState {
  return {
    staffId: '',
    departmentId: '',
    jobTitleId: '',
    positionTitle: '',
    type: 'CONTRACT',
    startDate: '',
    endDate: '',
    salary: '',
    currency: 'NGN',
    probationEndDate: '',
    notes: '',
  };
}

export function buildTerminationForm(): TerminationFormState {
  return {
    terminationDate: new Date().toISOString().slice(0, 10),
    reason: '',
  };
}

export function buildRenewalForm(contract?: HrContract | null): RenewalFormState {
  return {
    startDate: '',
    endDate: '',
    type: contract?.type || 'CONTRACT',
    departmentId: contract?.department?.id || '',
    jobTitleId: '',
    positionTitle: contract?.positionSnapshot || '',
    salary: contract ? String(contract.salary) : '',
    currency: contract?.currency || 'NGN',
    probationEndDate: '',
    notes: contract?.notes || '',
  };
}

export function buildApprovalForm(): ApprovalFormState {
  return {
    comment: '',
    rejectionReason: '',
  };
}

export function formatMoney(amount: number, currency = 'NGN') {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function titleizeStatus(status: string) {
  return status
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function formatDate(date: string | null | undefined) {
  if (!date) return '—';
  return new Date(date).toISOString().slice(0, 10);
}

export function formatFileSize(bytes?: number | null) {
  if (!bytes || bytes <= 0) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function canTerminateContract(status: string) {
  return status === 'ACTIVE' || status === 'EXPIRING_SOON' || status === 'AWAITING_SIGNATURE';
}

export function canRenewContract(status: string) {
  return status === 'ACTIVE' || status === 'EXPIRING_SOON' || status === 'EXPIRED';
}

export function canSubmitContract(status: string) {
  return status === 'DRAFT' || status === 'REJECTED';
}

export function canReviewContract(status: string) {
  return status === 'PENDING_APPROVAL';
}

export function canSignContract(status: string) {
  return status === 'AWAITING_SIGNATURE';
}
