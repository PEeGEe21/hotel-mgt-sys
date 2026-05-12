import { DocumentTypeOption } from '@/types/hr/contracts.type';

export const STATUS_STYLE: Record<string, string> = {
  ACTIVE: 'bg-emerald-500/15 text-emerald-400',
  EXPIRED: 'bg-red-500/15 text-red-400',
  EXPIRING_SOON: 'bg-amber-500/15 text-amber-400',
  DRAFT: 'bg-slate-500/15 text-slate-400',
  PENDING: 'bg-yellow-500/15 text-yellow-300',
  PENDING_APPROVAL: 'bg-yellow-500/15 text-yellow-300',
  AWAITING_SIGNATURE: 'bg-cyan-500/15 text-cyan-300',
  TERMINATED: 'bg-red-500/15 text-red-300',
  SUPERSEDED: 'bg-violet-500/15 text-violet-300',
  APPROVED: 'bg-blue-500/15 text-blue-400',
  REJECTED: 'bg-rose-500/15 text-rose-300',
  SKIPPED: 'bg-slate-500/15 text-slate-300',
};

export const TYPE_STYLE: Record<string, string> = {
  PERMANENT: 'bg-blue-500/15 text-blue-400',
  CONTRACT: 'bg-violet-500/15 text-violet-400',
  PART_TIME: 'bg-sky-500/15 text-sky-400',
  PROBATION: 'bg-orange-500/15 text-orange-400',
};

export const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'PERMANENT', label: 'Permanent' },
  { value: 'CONTRACT', label: 'Contract' },
  { value: 'PART_TIME', label: 'Part-time' },
  { value: 'PROBATION', label: 'Probation' },
];

export const DOCUMENT_TYPE_OPTIONS: DocumentTypeOption[] = [
  { value: 'SIGNED_CONTRACT', label: 'Signed Contract' },
  { value: 'OFFER_LETTER', label: 'Offer Letter' },
  { value: 'RENEWAL_LETTER', label: 'Renewal Letter' },
  { value: 'TERMINATION_LETTER', label: 'Termination Letter' },
  { value: 'CV', label: 'CV' },
  { value: 'ID', label: 'ID / Passport' },
  { value: 'CERTIFICATE', label: 'Certificate' },
  { value: 'REFERENCE', label: 'Reference' },
  { value: 'VISA', label: 'Visa / Work Permit' },
  { value: 'OTHER', label: 'Other' },
];
