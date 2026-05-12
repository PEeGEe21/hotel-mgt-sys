'use client';

import { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useHotelProfile, useUpdateHotelProfile } from '@/hooks/hotel/useHotelProfile';
import { DOCUMENT_TYPE_OPTIONS } from '@/lib/hr/contracts.lib';

type PolicyFormState = {
  contractExpiryWarningDays: string;
  contractNumberPrefix: string;
  renewalNumberPrefix: string;
  allowSupportingDocuments: boolean;
  requireSignedContractUpload: boolean;
  requireGeneratedContractPdf: boolean;
  requiredDocumentTypes: string[];
};

const DEFAULT_FORM: PolicyFormState = {
  contractExpiryWarningDays: '60',
  contractNumberPrefix: 'CTR',
  renewalNumberPrefix: 'REN',
  allowSupportingDocuments: true,
  requireSignedContractUpload: true,
  requireGeneratedContractPdf: true,
  requiredDocumentTypes: ['SIGNED_CONTRACT'],
};

const DEFAULT_HR_CONTRACT_SETTINGS = {
  template: {
    accentColor: '#1d4ed8',
    headerTitle: 'Employment Contract',
    footerNote:
      'This generated document is the system copy of the contract summary. Signed copies and supporting documents should be attached to the contract record.',
    introductionText:
      'This employment contract records the current staff assignment, compensation, and contract terms approved by the hotel.',
    showSignatureLines: true,
  },
  documentPolicy: {
    requiredDocumentTypes: ['SIGNED_CONTRACT'],
    allowSupportingDocuments: true,
    requireSignedContractUpload: true,
    requireGeneratedContractPdf: true,
  },
  numbering: {
    contractNumberPrefix: 'CTR',
    renewalNumberPrefix: 'REN',
  },
  notifications: {
    approvalTurnNotificationsEnabled: true,
    approvalTurnRoleFallbackEnabled: true,
    expiryDigestEnabled: true,
    staleApprovalDigestEnabled: true,
    staleSignatureDigestEnabled: true,
    staleApprovalReminderDays: 3,
    staleSignatureReminderDays: 3,
    digestRecipientRoles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
  },
};

export default function ContractPolicySettingsPanel() {
  const { data: hotelProfile } = useHotelProfile();
  const updateHotelProfile = useUpdateHotelProfile();
  const [form, setForm] = useState<PolicyFormState>(DEFAULT_FORM);

  useEffect(() => {
    if (!hotelProfile) return;
    setForm({
      contractExpiryWarningDays: String(hotelProfile.contractExpiryWarningDays ?? 60),
      contractNumberPrefix:
        hotelProfile.hrContractSettings?.numbering.contractNumberPrefix ?? 'CTR',
      renewalNumberPrefix:
        hotelProfile.hrContractSettings?.numbering.renewalNumberPrefix ?? 'REN',
      allowSupportingDocuments:
        hotelProfile.hrContractSettings?.documentPolicy.allowSupportingDocuments ?? true,
      requireSignedContractUpload:
        hotelProfile.hrContractSettings?.documentPolicy.requireSignedContractUpload ?? true,
      requireGeneratedContractPdf:
        hotelProfile.hrContractSettings?.documentPolicy.requireGeneratedContractPdf ?? true,
      requiredDocumentTypes:
        hotelProfile.hrContractSettings?.documentPolicy.requiredDocumentTypes ?? ['SIGNED_CONTRACT'],
    });
  }, [hotelProfile]);

  const toggleRequiredDocument = (documentType: string) => {
    setForm((current) => ({
      ...current,
      requiredDocumentTypes: current.requiredDocumentTypes.includes(documentType)
        ? current.requiredDocumentTypes.filter((item) => item !== documentType)
        : [...current.requiredDocumentTypes, documentType],
    }));
  };

  const handleSave = async () => {
    await updateHotelProfile.mutateAsync({
      contractExpiryWarningDays: Number(form.contractExpiryWarningDays || 60),
      hrContractSettings: {
        ...DEFAULT_HR_CONTRACT_SETTINGS,
        ...hotelProfile?.hrContractSettings,
        numbering: {
          contractNumberPrefix: form.contractNumberPrefix,
          renewalNumberPrefix: form.renewalNumberPrefix,
        },
        documentPolicy: {
          requiredDocumentTypes: form.requiredDocumentTypes,
          allowSupportingDocuments: form.allowSupportingDocuments,
          requireSignedContractUpload: form.requireSignedContractUpload,
          requireGeneratedContractPdf: form.requireGeneratedContractPdf,
        },
      },
    });
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="rounded-2xl border border-[#1e2536] bg-[#161b27] p-5">
        <div className="mb-5">
          <h2 className="text-lg font-bold text-white">Document Policy</h2>
          <p className="mt-1 text-sm text-slate-500">
            Set the numbering prefixes, expiry reminder window, and baseline document rules HR
            should follow for contracts.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
              Expiry Warning Days
            </label>
            <input
              type="number"
              min="1"
              max="365"
              value={form.contractExpiryWarningDays}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  contractExpiryWarningDays: event.target.value,
                }))
              }
              className="w-full rounded-lg border border-[#1e2536] bg-[#0f1117] px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
              Contract Prefix
            </label>
            <input
              value={form.contractNumberPrefix}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  contractNumberPrefix: event.target.value.toUpperCase(),
                }))
              }
              className="w-full rounded-lg border border-[#1e2536] bg-[#0f1117] px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
              Renewal Prefix
            </label>
            <input
              value={form.renewalNumberPrefix}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  renewalNumberPrefix: event.target.value.toUpperCase(),
                }))
              }
              className="w-full rounded-lg border border-[#1e2536] bg-[#0f1117] px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={form.allowSupportingDocuments}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  allowSupportingDocuments: event.target.checked,
                }))
              }
            />
            Allow supporting document uploads
          </label>

          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={form.requireSignedContractUpload}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  requireSignedContractUpload: event.target.checked,
                }))
              }
            />
            Require signed contract upload
          </label>

          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={form.requireGeneratedContractPdf}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  requireGeneratedContractPdf: event.target.checked,
                }))
              }
            />
            Require generated system PDF
          </label>
        </div>

        <div className="mt-6">
          <p className="mb-3 text-xs uppercase tracking-wider text-slate-500">
            Required Document Types
          </p>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {DOCUMENT_TYPE_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-2 rounded-lg border border-[#1e2536] bg-[#0f1117] px-3 py-2 text-sm text-slate-300"
              >
                <input
                  type="checkbox"
                  checked={form.requiredDocumentTypes.includes(option.value)}
                  onChange={() => toggleRequiredDocument(option.value)}
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={() => void handleSave()}
            disabled={updateHotelProfile.isPending}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-60"
          >
            {updateHotelProfile.isPending ? 'Saving…' : 'Save Policy Settings'}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-[#1e2536] bg-[#161b27] p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-2xl bg-emerald-500/10 p-3 text-emerald-300">
            <ShieldCheck size={18} />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Policy Snapshot</h3>
            <p className="mt-1 text-sm text-slate-500">
              What HR will see as the default operating rule set.
            </p>
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-[#1e2536] bg-[#0f1117] p-4 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-500">Expiry warning</span>
            <span className="font-medium text-slate-200">{form.contractExpiryWarningDays} days</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-500">Numbering</span>
            <span className="font-medium text-slate-200">
              {form.contractNumberPrefix}- / {form.renewalNumberPrefix}-
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-500">Supporting files</span>
            <span className="font-medium text-slate-200">
              {form.allowSupportingDocuments ? 'Allowed' : 'Restricted'}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-500">Signed copy</span>
            <span className="font-medium text-slate-200">
              {form.requireSignedContractUpload ? 'Required' : 'Optional'}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-500">Generated PDF</span>
            <span className="font-medium text-slate-200">
              {form.requireGeneratedContractPdf ? 'Required' : 'Optional'}
            </span>
          </div>
          <div>
            <p className="text-slate-500">Required document types</p>
            <p className="mt-1 font-medium text-slate-200">
              {form.requiredDocumentTypes.length
                ? form.requiredDocumentTypes.join(', ')
                : 'No explicit required types'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
