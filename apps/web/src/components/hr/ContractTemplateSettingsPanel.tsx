'use client';

import { useEffect, useState } from 'react';
import { FileText } from 'lucide-react';
import { useHotelProfile, useUpdateHotelProfile } from '@/hooks/hotel/useHotelProfile';

type TemplateFormState = {
  accentColor: string;
  headerTitle: string;
  footerNote: string;
  introductionText: string;
  showSignatureLines: boolean;
};

const DEFAULT_FORM: TemplateFormState = {
  accentColor: '#1d4ed8',
  headerTitle: 'Employment Contract',
  footerNote:
    'This generated document is the system copy of the contract summary. Signed copies and supporting documents should be attached to the contract record.',
  introductionText:
    'This employment contract records the current staff assignment, compensation, and contract terms approved by the hotel.',
  showSignatureLines: true,
};

const DEFAULT_HR_CONTRACT_SETTINGS = {
  template: DEFAULT_FORM,
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

export default function ContractTemplateSettingsPanel() {
  const { data: hotelProfile } = useHotelProfile();
  const updateHotelProfile = useUpdateHotelProfile();
  const [form, setForm] = useState<TemplateFormState>(DEFAULT_FORM);

  useEffect(() => {
    if (!hotelProfile?.hrContractSettings?.template) return;
    setForm(hotelProfile.hrContractSettings.template);
  }, [hotelProfile?.hrContractSettings]);

  const handleSave = async () => {
    await updateHotelProfile.mutateAsync({
      hrContractSettings: {
        ...DEFAULT_HR_CONTRACT_SETTINGS,
        ...hotelProfile?.hrContractSettings,
        template: form,
      },
    });
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="rounded-2xl border border-[#1e2536] bg-[#161b27] p-5">
        <div className="mb-5">
          <h2 className="text-lg font-bold text-white">Contract Template</h2>
          <p className="mt-1 text-sm text-slate-500">
            Control the generated contract PDF title, intro copy, footer, and signature section.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
              Accent Color
            </label>
            <div className="flex items-center gap-3 rounded-lg border border-[#1e2536] bg-[#0f1117] px-3 py-2.5">
              <input
                type="color"
                value={form.accentColor}
                onChange={(event) =>
                  setForm((current) => ({ ...current, accentColor: event.target.value }))
                }
                className="h-8 w-10 rounded border-0 bg-transparent p-0"
              />
              <input
                value={form.accentColor}
                onChange={(event) =>
                  setForm((current) => ({ ...current, accentColor: event.target.value }))
                }
                className="w-full bg-transparent text-sm text-slate-200 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
              Header Title
            </label>
            <input
              value={form.headerTitle}
              onChange={(event) =>
                setForm((current) => ({ ...current, headerTitle: event.target.value }))
              }
              className="w-full rounded-lg border border-[#1e2536] bg-[#0f1117] px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="mt-5">
          <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
            Introduction Text
          </label>
          <textarea
            rows={4}
            value={form.introductionText}
            onChange={(event) =>
              setForm((current) => ({ ...current, introductionText: event.target.value }))
            }
            className="w-full rounded-lg border border-[#1e2536] bg-[#0f1117] px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500"
          />
        </div>

        <div className="mt-5">
          <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
            Footer Note
          </label>
          <textarea
            rows={4}
            value={form.footerNote}
            onChange={(event) =>
              setForm((current) => ({ ...current, footerNote: event.target.value }))
            }
            className="w-full rounded-lg border border-[#1e2536] bg-[#0f1117] px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500"
          />
        </div>

        <div className="mt-5">
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={form.showSignatureLines}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  showSignatureLines: event.target.checked,
                }))
              }
            />
            Show employee and hotel signature lines on generated PDFs
          </label>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={() => void handleSave()}
            disabled={updateHotelProfile.isPending}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-60"
          >
            {updateHotelProfile.isPending ? 'Saving…' : 'Save Template Settings'}
          </button>
        </div>
      </div>

      <div
        className="rounded-2xl border border-[#1e2536] p-5"
        style={{
          background: `linear-gradient(145deg, ${form.accentColor}16, rgba(15,17,23,0.96) 38%)`,
        }}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Preview</p>
            <h3 className="mt-2 text-lg font-bold text-white">{form.headerTitle}</h3>
          </div>
          <div
            className="flex h-11 w-11 items-center justify-center rounded-2xl"
            style={{ backgroundColor: `${form.accentColor}26` }}
          >
            <FileText size={18} style={{ color: form.accentColor }} />
          </div>
        </div>

        <div className="rounded-xl border border-[#1e2536] bg-[#0f1117] p-4">
          <p className="text-sm text-slate-300">{form.introductionText}</p>
          <div className="my-4 h-px bg-[#1e2536]" />
          <div className="space-y-2 text-sm text-slate-400">
            <p>Contract Summary</p>
            <p>Employee Snapshot</p>
            <p>Compensation</p>
            <p>Terms and Notes</p>
          </div>
          {form.showSignatureLines ? (
            <div className="mt-5 space-y-3 text-sm text-slate-400">
              <p>Employee: ____________________</p>
              <p>Hotel Representative: __________</p>
            </div>
          ) : null}
          <div className="mt-5 h-px bg-[#1e2536]" />
          <p className="mt-4 text-xs text-slate-500">{form.footerNote}</p>
        </div>
      </div>
    </div>
  );
}
