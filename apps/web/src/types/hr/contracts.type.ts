export type ContractFilter =
  | 'All'
  | 'ACTIVE'
  | 'EXPIRING_SOON'
  | 'EXPIRED'
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'AWAITING_SIGNATURE'
  | 'REJECTED';

export type CreateFormState = {
  staffId: string;
  departmentId: string;
  jobTitleId: string;
  positionTitle: string;
  type: string;
  startDate: string;
  endDate: string;
  salary: string;
  currency: string;
  probationEndDate: string;
  notes: string;
};

export type DocumentTypeOption = {
  value: string;
  label: string;
};

export type TerminationFormState = {
  terminationDate: string;
  reason: string;
};

export type RenewalFormState = {
  startDate: string;
  endDate: string;
  type: string;
  departmentId: string;
  jobTitleId: string;
  positionTitle: string;
  salary: string;
  currency: string;
  probationEndDate: string;
  notes: string;
};

export type ApprovalFormState = {
  comment: string;
  rejectionReason: string;
};
