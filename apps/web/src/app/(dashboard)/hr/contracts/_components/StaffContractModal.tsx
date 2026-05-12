'use client';

import { useEffect, useState } from 'react';
import { Ban, Check, Download, FileText, Loader2, RefreshCw, Upload, X } from 'lucide-react';
import { Dialog, DialogContent, DialogOverlay, DialogTitle } from '@/components/ui/dialog';
import { Department } from '@/hooks/useDepartments';
import { JobTitle } from '@/hooks/useJobTitles';
import { useAuthStore } from '@/store/auth.store';
import {
  useApproveHrContract,
  useHrContract,
  useRejectHrContract,
  useRenewHrContract,
  useSignHrContract,
  useSubmitHrContract,
  useTerminateHrContract,
  useUploadHrContractDocument,
} from '@/hooks/hr/useHrContracts';
import {
  ApprovalFormState,
  RenewalFormState,
  TerminationFormState,
} from '@/types/hr/contracts.type';
import { DOCUMENT_TYPE_OPTIONS, STATUS_STYLE, TYPE_OPTIONS } from '@/lib/hr/contracts.lib';
import {
  buildApprovalForm,
  buildRenewalForm,
  buildTerminationForm,
  canRenewContract,
  canReviewContract,
  canSignContract,
  canSubmitContract,
  canTerminateContract,
  formatDate,
  formatFileSize,
  formatMoney,
  titleizeStatus,
} from '@/utils/hr/contracts-utils';
import { openHrContractDownload } from '@/hooks/useProxyActions';

function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[status] || 'bg-slate-500/15 text-slate-300'}`}
    >
      {titleizeStatus(status)}
    </span>
  );
}

type StaffContractModalProps = {
  isOpen: boolean;
  contractId: string;
  onClose: () => void;
  departments: Department[];
  jobTitles: JobTitle[];
};

export default function StaffContractModal({
  isOpen,
  contractId,
  onClose,
  departments,
  jobTitles,
}: StaffContractModalProps) {
  const [selectedDocumentType, setSelectedDocumentType] = useState('SIGNED_CONTRACT');
  const [showTerminate, setShowTerminate] = useState(false);
  const [terminationForm, setTerminationForm] =
    useState<TerminationFormState>(buildTerminationForm());
  const [showRenew, setShowRenew] = useState(false);
  const [renewalForm, setRenewalForm] = useState<RenewalFormState>(buildRenewalForm(null));
  const [approvalForm, setApprovalForm] = useState<ApprovalFormState>(buildApprovalForm());
  const currentUser = useAuthStore((state) => state.user);

  const contractQuery = useHrContract(contractId);
  const contract = contractQuery.data;
  const uploadDocument = useUploadHrContractDocument(contractId);
  const terminateContract = useTerminateHrContract(contractId);
  const renewContract = useRenewHrContract(contractId);
  const submitContract = useSubmitHrContract(contractId);
  const approveContract = useApproveHrContract(contractId);
  const signContract = useSignHrContract(contractId);
  const rejectContract = useRejectHrContract(contractId);

  useEffect(() => {
    if (!isOpen) {
      setSelectedDocumentType('SIGNED_CONTRACT');
      setShowTerminate(false);
      setTerminationForm(buildTerminationForm());
      setShowRenew(false);
      setRenewalForm(buildRenewalForm(null));
      setApprovalForm(buildApprovalForm());
      return;
    }

    if (contract) {
      setRenewalForm(buildRenewalForm(contract));
    }
  }, [isOpen, contract]);

  const visibleRenewalJobTitles = renewalForm.departmentId
    ? jobTitles.filter(
        (jobTitle) => !jobTitle.departmentId || jobTitle.departmentId === renewalForm.departmentId,
      )
    : jobTitles;
  const currentPendingApproval =
    contract?.approvals.find((approval) => approval.status === 'PENDING') || null;
  const availableDocumentTypes = new Set(
    (contract?.documents ?? []).map((document) => document.documentType),
  );
  const hasGeneratedContractPdf = availableDocumentTypes.has('CONTRACT_DOCUMENT');
  const hasSignedContractUpload = availableDocumentTypes.has('SIGNED_CONTRACT');
  const normalizedUserRole = (currentUser?.role || '').trim().toUpperCase();
  const currentUserCanReviewStep = Boolean(
    currentPendingApproval &&
      (normalizedUserRole === currentPendingApproval.role || normalizedUserRole === 'SUPER_ADMIN'),
  );

  const handleRenewJobTitleChange = (jobTitleId: string) => {
    const selected = jobTitles.find((jobTitle) => jobTitle.id === jobTitleId);
    setRenewalForm((current) => ({
      ...current,
      jobTitleId,
      departmentId: selected?.departmentId || current.departmentId,
      positionTitle: selected?.name || current.positionTitle,
    }));
  };

  const handleDocumentUpload = async (file: File | null) => {
    if (!file || !contractId) return;

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Could not read file.'));
      reader.readAsDataURL(file);
    });

    await uploadDocument.mutateAsync({
      documentType: selectedDocumentType,
      fileName: file.name,
      fileUrl: dataUrl,
      mimeType: file.type || undefined,
      fileSizeBytes: file.size || undefined,
      source: 'UPLOADED',
    });
  };

  const handleTerminate = async () => {
    await terminateContract.mutateAsync({
      terminationDate: terminationForm.terminationDate,
      reason: terminationForm.reason,
    });
    setShowTerminate(false);
    setTerminationForm(buildTerminationForm());
  };

  const handleRenew = async () => {
    const created = await renewContract.mutateAsync({
      startDate: renewalForm.startDate,
      endDate: renewalForm.endDate || undefined,
      type: renewalForm.type,
      departmentId: renewalForm.departmentId || undefined,
      positionTitle: renewalForm.positionTitle || undefined,
      salary: Number(renewalForm.salary || 0),
      currency: renewalForm.currency || 'NGN',
      probationEndDate: renewalForm.probationEndDate || undefined,
      notes: renewalForm.notes || undefined,
      status: 'ACTIVE',
    });
    setShowRenew(false);
    setApprovalForm(buildApprovalForm());
    setTerminationForm(buildTerminationForm());
    setRenewalForm(buildRenewalForm(created));
  };

  const handleSubmitForApproval = async () => {
    await submitContract.mutateAsync();
  };

  const handleApprove = async () => {
    await approveContract.mutateAsync({
      comment: approvalForm.comment || undefined,
    });
    setApprovalForm(buildApprovalForm());
  };

  const handleSign = async () => {
    await signContract.mutateAsync({
      comment: approvalForm.comment || undefined,
    });
    setApprovalForm(buildApprovalForm());
  };

  const handleReject = async () => {
    await rejectContract.mutateAsync({
      reason: approvalForm.rejectionReason,
    });
    setApprovalForm((current) => ({ ...current, rejectionReason: '' }));
  };

  const downloadContract = () => {
    openHrContractDownload(contractId);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogOverlay className="bg-black/70 backdrop-blur-sm" />
      <DialogContent
        showCloseButton={false}
        className="max-h-[92vh] w-full max-w-xl sm:!max-w-6xl overflow-y-auto rounded-2xl border border-[#1e2536] bg-[#161b27] p-6 shadow-2xl ring-0 !outline-none"
      >
        <DialogTitle className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-white">Contract Details</h2>
            <p className="mt-1 text-sm text-slate-500">{contract?.contractNo || contractId}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
            <X size={18} />
          </button>
        </DialogTitle>

        {contractQuery.isLoading ? (
          <div className="py-12 text-center">
            <Loader2 size={28} className="mx-auto mb-2 animate-spin text-slate-600" />
            <p className="text-sm text-slate-500">Loading contract…</p>
          </div>
        ) : !contract ? (
          <div className="py-12 text-center text-sm text-slate-500">Contract not found.</div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                {
                  label: 'Status',
                  value: titleizeStatus(contract.derivedStatus),
                },
                { label: 'Type', value: titleizeStatus(contract.type) },
                {
                  label: 'Salary',
                  value: formatMoney(contract.salary, contract.currency),
                },
                {
                  label: 'Duration',
                  value: contract.endDate
                    ? `${formatDate(contract.startDate)} -> ${formatDate(contract.endDate)}`
                    : 'Open-ended',
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-[#1e2536] bg-[#0f1117] px-4 py-4"
                >
                  <p className="mb-1 text-xs uppercase tracking-wider text-slate-500">
                    {item.label}
                  </p>
                  <p className="text-sm font-semibold text-slate-200">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-[#1e2536] bg-[#0f1117] p-4">
                <h3 className="mb-3 text-sm font-semibold text-white">Snapshot</h3>
                <div className="space-y-2 text-sm">
                  <p className="text-slate-300">Staff: {contract.staffNameSnapshot}</p>
                  <p className="text-slate-300">Employee Code: {contract.employeeCodeSnapshot}</p>
                  <p className="text-slate-300">Department: {contract.departmentSnapshot}</p>
                  <p className="text-slate-300">Position: {contract.positionSnapshot}</p>
                </div>
              </div>
              <div className="rounded-xl border border-[#1e2536] bg-[#0f1117] p-4">
                <h3 className="mb-3 text-sm font-semibold text-white">Notes</h3>
                <p className="whitespace-pre-wrap text-sm text-slate-400">
                  {contract.notes || 'No notes added yet.'}
                </p>
              </div>
            </div>

            {contract.renewedFromContract || contract.renewedContracts.length ? (
              <div className="rounded-xl border border-[#1e2536] bg-[#0f1117] p-4">
                <h3 className="mb-3 text-sm font-semibold text-white">Renewal Chain</h3>
                <div className="space-y-2 text-sm">
                  <p className="text-slate-300">
                    Renewed From:{' '}
                    {contract.renewedFromContract ? contract.renewedFromContract.contractNo : '—'}
                  </p>
                  <p className="text-slate-300">
                    Successor Contracts:{' '}
                    {contract.renewedContracts.length
                      ? contract.renewedContracts.map((item) => item.contractNo).join(', ')
                      : '—'}
                  </p>
                </div>
              </div>
            ) : null}

            {contract.terminationDate || contract.terminationReason ? (
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                <h3 className="mb-3 text-sm font-semibold text-white">Termination</h3>
                <div className="space-y-2 text-sm">
                  <p className="text-slate-300">
                    Termination Date: {formatDate(contract.terminationDate)}
                  </p>
                  <p className="whitespace-pre-wrap text-slate-300">
                    Reason: {contract.terminationReason || '—'}
                  </p>
                </div>
              </div>
            ) : null}

            {contract.submittedAt || contract.approvedAt || contract.signedAt || contract.rejectedAt ? (
              <div className="rounded-xl border border-[#1e2536] bg-[#0f1117] p-4">
                <h3 className="mb-3 text-sm font-semibold text-white">Approval Status</h3>
                <div className="space-y-2 text-sm">
                  <p className="text-slate-300">Submitted: {formatDate(contract.submittedAt)}</p>
                  <p className="text-slate-300">Approved: {formatDate(contract.approvedAt)}</p>
                  <p className="text-slate-300">Signed: {formatDate(contract.signedAt)}</p>
                  <p className="text-slate-300">
                    Approval Comment: {contract.approvalComment || '—'}
                  </p>
                  <p className="text-slate-300">Rejected: {formatDate(contract.rejectedAt)}</p>
                  <p className="whitespace-pre-wrap text-slate-300">
                    Rejection Reason: {contract.rejectionReason || '—'}
                  </p>
                </div>
              </div>
            ) : null}

            {contract.approvals.length ? (
              <div className="rounded-xl border border-[#1e2536] bg-[#0f1117] p-4">
                <h3 className="mb-3 text-sm font-semibold text-white">Approval Steps</h3>
                <div className="space-y-3">
                  {contract.approvals.map((approval) => (
                    <div
                      key={approval.id}
                      className="flex items-center justify-between rounded-lg border border-[#1e2536] px-3 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-200">
                          Step {approval.stepOrder}: {titleizeStatus(approval.role)}
                        </p>
                        <p className="text-xs text-slate-500">
                          {approval.routeName || 'Approval route'} ·{' '}
                          {approval.comment || 'No comment yet'}
                        </p>
                      </div>
                      <StatusPill status={approval.status} />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {canSignContract(contract.derivedStatus) ? (
              <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
                <h3 className="mb-2 text-sm font-semibold text-white">Awaiting Signature</h3>
                <p className="mb-4 text-sm text-slate-300">
                  This contract has completed approval and is waiting for the signed contract copy
                  before it becomes active.
                </p>
                <div className="mb-4 rounded-lg border border-cyan-500/20 bg-[#0f1117] px-4 py-3 text-xs text-slate-400">
                  <p>Generated PDF: {hasGeneratedContractPdf ? 'Ready' : 'Missing'}</p>
                  <p>Signed contract upload: {hasSignedContractUpload ? 'Ready' : 'Missing'}</p>
                  <p className="mt-2">
                    If activation is blocked, generate the system PDF with the download button and
                    upload the signed contract file in the documents section below.
                  </p>
                </div>
                <div className="space-y-3">
                  <textarea
                    value={approvalForm.comment}
                    onChange={(event) =>
                      setApprovalForm((current) => ({ ...current, comment: event.target.value }))
                    }
                    rows={3}
                    placeholder="Add a note about the signed copy or activation"
                    className="w-full rounded-lg border border-[#1e2536] bg-[#161b27] px-3 py-2 text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:border-cyan-500"
                  />
                  <button
                    onClick={() => void handleSign()}
                    disabled={signContract.isPending}
                    className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-cyan-500 disabled:opacity-60"
                  >
                    {signContract.isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    Mark Signed & Activate
                  </button>
                </div>
              </div>
            ) : null}

            {contract.auditLogs.length ? (
              <div className="rounded-xl border border-[#1e2536] bg-[#0f1117] p-4">
                <h3 className="mb-3 text-sm font-semibold text-white">History</h3>
                <div className="space-y-3">
                  {contract.auditLogs.map((log) => (
                    <div key={log.id} className="rounded-lg border border-[#1e2536] px-3 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-slate-200">
                          {titleizeStatus(log.action)}
                        </p>
                        <p className="text-xs text-slate-500">
                          {new Date(log.createdAt).toLocaleString('en-NG')}
                        </p>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {log.fromStatus || '—'} {'->'} {log.toStatus || '—'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="rounded-xl border border-[#1e2536] bg-[#0f1117] p-4">
              <h3 className="mb-3 text-sm font-semibold text-white">Compensation History</h3>
              <div className="space-y-3">
                {contract.compensationHistory.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-lg border border-[#1e2536] px-3 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-200">
                        {formatMoney(item.amount, item.currency)}
                      </p>
                      <p className="text-xs text-slate-500">
                        Effective {formatDate(item.effectiveFrom)}
                      </p>
                    </div>
                    <p className="text-xs text-slate-500">{item.reason || 'CONTRACT_CREATED'}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-[#1e2536] bg-[#0f1117] p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-white">Documents</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Upload supporting files and keep contract paperwork together.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedDocumentType}
                    onChange={(event) => setSelectedDocumentType(event.target.value)}
                    className="rounded-lg border border-[#1e2536] bg-[#161b27] px-3 py-2 text-xs text-slate-200 outline-none focus:border-blue-500"
                  >
                    {DOCUMENT_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-500">
                    <Upload size={13} />
                    {uploadDocument.isPending ? 'Uploading…' : 'Upload'}
                    <input
                      type="file"
                      className="hidden"
                      disabled={uploadDocument.isPending}
                      onChange={async (event) => {
                        const file = event.target.files?.[0] || null;
                        try {
                          await handleDocumentUpload(file);
                        } finally {
                          event.target.value = '';
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              <div className="space-y-3">
                {contract.documents.length ? (
                  contract.documents.map((document) => (
                    <div
                      key={document.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-[#1e2536] px-3 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-200">
                          {document.fileName}
                        </p>
                        <p className="text-xs text-slate-500">
                          {titleizeStatus(document.documentType)} · Uploaded{' '}
                          {formatDate(document.uploadedAt)}
                          {formatFileSize(document.fileSizeBytes)
                            ? ` · ${formatFileSize(document.fileSizeBytes)}`
                            : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-slate-500/15 px-2.5 py-1 text-[11px] font-medium text-slate-300">
                          {titleizeStatus(document.source)}
                        </span>
                        <button
                          onClick={() =>
                            window.open(document.fileUrl, '_blank', 'noopener,noreferrer')
                          }
                          className="rounded-lg bg-white/5 px-3 py-2 text-xs font-medium text-slate-200 transition-colors hover:bg-white/10"
                        >
                          View
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-lg border border-dashed border-[#1e2536] px-4 py-8 text-center">
                    <FileText size={20} className="mx-auto mb-2 text-slate-700" />
                    <p className="text-sm text-slate-500">No documents uploaded yet.</p>
                  </div>
                )}
              </div>
            </div>

            {canSubmitContract(contract.derivedStatus) ||
            canReviewContract(contract.derivedStatus) ? (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Approval Workflow</h3>
                    <p className="mt-1 text-xs text-slate-400">
                      Submit drafts for approval, then approve or reject pending contracts from
                      here.
                    </p>
                  </div>
                </div>

                {canSubmitContract(contract.derivedStatus) ? (
                  <div className="mt-4 space-y-3">
                    <div className="rounded-lg border border-[#1e2536] bg-[#161b27] px-4 py-3">
                      <p className="text-sm font-medium text-slate-200">Before you submit</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Make sure the required pre-approval documents are uploaded. If your hotel
                        requires the system PDF, use the download button below once to generate and
                        store it on this contract record.
                      </p>
                    </div>
                    <div className="flex justify-end">
                      <button
                        onClick={() => void handleSubmitForApproval()}
                        disabled={submitContract.isPending}
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-60"
                      >
                        <Check size={14} />
                        {submitContract.isPending ? 'Submitting…' : 'Submit for Approval'}
                      </button>
                    </div>
                  </div>
                ) : null}

                {canReviewContract(contract.derivedStatus) && !currentUserCanReviewStep ? (
                  <div className="mt-4 rounded-lg border border-[#1e2536] bg-[#161b27] px-4 py-3">
                    <p className="text-sm font-medium text-slate-200">
                      Waiting on {titleizeStatus(currentPendingApproval?.role || 'approval')}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Approval actions will appear here when it reaches that role&apos;s turn.
                    </p>
                  </div>
                ) : null}

                {canReviewContract(contract.derivedStatus) && currentUserCanReviewStep ? (
                  <div className="mt-4 grid grid-cols-1 gap-4">
                    <div>
                      <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
                        Approval Comment
                      </label>
                      <textarea
                        rows={2}
                        value={approvalForm.comment}
                        onChange={(event) =>
                          setApprovalForm((current) => ({
                            ...current,
                            comment: event.target.value,
                          }))
                        }
                        placeholder="Optional approval note"
                        className="w-full rounded-lg border border-[#1e2536] bg-[#161b27] px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
                        Rejection Reason
                      </label>
                      <textarea
                        rows={2}
                        value={approvalForm.rejectionReason}
                        onChange={(event) =>
                          setApprovalForm((current) => ({
                            ...current,
                            rejectionReason: event.target.value,
                          }))
                        }
                        placeholder="Required only when rejecting"
                        className="w-full rounded-lg border border-[#1e2536] bg-[#161b27] px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-rose-500"
                      />
                    </div>
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => void handleReject()}
                        disabled={rejectContract.isPending || !approvalForm.rejectionReason.trim()}
                        className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-500 disabled:opacity-60"
                      >
                        <Ban size={14} />
                        {rejectContract.isPending ? 'Rejecting…' : 'Reject'}
                      </button>
                      <button
                        onClick={() => void handleApprove()}
                        disabled={approveContract.isPending}
                        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-60"
                      >
                        <Check size={14} />
                        {approveContract.isPending ? 'Approving…' : 'Approve'}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {canTerminateContract(contract.derivedStatus) ? (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Terminate Contract</h3>
                    <p className="mt-1 text-xs text-slate-400">
                      Record an early contract end date and reason before moving on to any renewal.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowTerminate((current) => !current)}
                    className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-500"
                  >
                    {showTerminate ? 'Close' : 'Terminate'}
                  </button>
                </div>

                {showTerminate ? (
                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
                        Termination Date
                      </label>
                      <input
                        type="date"
                        value={terminationForm.terminationDate}
                        onChange={(event) =>
                          setTerminationForm((current) => ({
                            ...current,
                            terminationDate: event.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-[#1e2536] bg-[#161b27] px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-red-500"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
                        Reason
                      </label>
                      <textarea
                        rows={3}
                        value={terminationForm.reason}
                        onChange={(event) =>
                          setTerminationForm((current) => ({
                            ...current,
                            reason: event.target.value,
                          }))
                        }
                        placeholder="Why is this contract ending early?"
                        className="w-full rounded-lg border border-[#1e2536] bg-[#161b27] px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-red-500"
                      />
                    </div>
                    <div className="md:col-span-2 flex justify-end">
                      <button
                        onClick={() => void handleTerminate()}
                        disabled={
                          terminateContract.isPending ||
                          !terminationForm.terminationDate ||
                          !terminationForm.reason.trim()
                        }
                        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-60"
                      >
                        {terminateContract.isPending ? 'Terminating…' : 'Confirm Termination'}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {canRenewContract(contract.derivedStatus) && contract.renewedContracts.length === 0 ? (
              <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Renew Contract</h3>
                    <p className="mt-1 text-xs text-slate-400">
                      Create the next contract from this one. The current contract will be marked as
                      superseded.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowRenew((current) => !current);
                      setRenewalForm(buildRenewalForm(contract));
                    }}
                    className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-500"
                  >
                    {showRenew ? 'Close' : 'Renew'}
                  </button>
                </div>

                {showRenew ? (
                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
                        New Start Date
                      </label>
                      <input
                        type="date"
                        value={renewalForm.startDate}
                        onChange={(event) =>
                          setRenewalForm((current) => ({
                            ...current,
                            startDate: event.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-[#1e2536] bg-[#161b27] px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
                        New End Date
                      </label>
                      <input
                        type="date"
                        value={renewalForm.endDate}
                        onChange={(event) =>
                          setRenewalForm((current) => ({
                            ...current,
                            endDate: event.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-[#1e2536] bg-[#161b27] px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
                        Contract Type
                      </label>
                      <select
                        value={renewalForm.type}
                        onChange={(event) =>
                          setRenewalForm((current) => ({
                            ...current,
                            type: event.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-[#1e2536] bg-[#161b27] px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500"
                      >
                        {TYPE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
                        Department
                      </label>
                      <select
                        value={renewalForm.departmentId}
                        onChange={(event) =>
                          setRenewalForm((current) => ({
                            ...current,
                            departmentId: event.target.value,
                            jobTitleId:
                              current.jobTitleId &&
                              jobTitles.some(
                                (jobTitle) =>
                                  jobTitle.id === current.jobTitleId &&
                                  (!event.target.value ||
                                    !jobTitle.departmentId ||
                                    jobTitle.departmentId === event.target.value),
                              )
                                ? current.jobTitleId
                                : '',
                          }))
                        }
                        className="w-full rounded-lg border border-[#1e2536] bg-[#161b27] px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500"
                      >
                        <option value="">Select department</option>
                        {departments.map((department) => (
                          <option key={department.id} value={department.id}>
                            {department.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
                        Job Title
                      </label>
                      <select
                        value={renewalForm.jobTitleId}
                        onChange={(event) => handleRenewJobTitleChange(event.target.value)}
                        className="w-full rounded-lg border border-[#1e2536] bg-[#161b27] px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500"
                      >
                        <option value="">Select job title</option>
                        {visibleRenewalJobTitles.map((jobTitle) => (
                          <option key={jobTitle.id} value={jobTitle.id}>
                            {jobTitle.name}
                            {jobTitle.departmentName ? ` · ${jobTitle.departmentName}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
                        Position Snapshot
                      </label>
                      <input
                        value={renewalForm.positionTitle}
                        onChange={(event) =>
                          setRenewalForm((current) => ({
                            ...current,
                            positionTitle: event.target.value,
                          }))
                        }
                        readOnly={!!renewalForm.jobTitleId}
                        className="w-full rounded-lg border border-[#1e2536] bg-[#161b27] px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
                        Monthly Salary
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={renewalForm.salary}
                        onChange={(event) =>
                          setRenewalForm((current) => ({
                            ...current,
                            salary: event.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-[#1e2536] bg-[#161b27] px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
                        Notes
                      </label>
                      <textarea
                        rows={3}
                        value={renewalForm.notes}
                        onChange={(event) =>
                          setRenewalForm((current) => ({
                            ...current,
                            notes: event.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-[#1e2536] bg-[#161b27] px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="md:col-span-2 flex justify-end">
                      <div className="text-right">
                        <button
                          onClick={() => void handleRenew()}
                          disabled={
                            renewContract.isPending || !renewalForm.startDate || !renewalForm.salary
                          }
                          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-60"
                        >
                          {renewContract.isPending ? (
                            <span className="inline-flex items-center gap-2">
                              <RefreshCw size={14} className="animate-spin" />
                              Renewing…
                            </span>
                          ) : (
                            'Create Renewal'
                          )}
                        </button>
                        <p className="mt-2 text-xs text-slate-500">
                          If direct renewal activation is blocked, create the renewal and complete
                          its documents from the new contract record.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="flex justify-end">
              <button
                onClick={() => downloadContract()}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
              >
                <Download size={14} /> Download Contract PDF
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
