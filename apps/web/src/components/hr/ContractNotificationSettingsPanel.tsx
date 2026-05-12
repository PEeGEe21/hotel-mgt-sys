'use client';

import { useEffect, useState } from 'react';
import { BellRing } from 'lucide-react';
import { useHotelProfile, useUpdateHotelProfile } from '@/hooks/hotel/useHotelProfile';

const ROLE_OPTIONS = [
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'MANAGER', label: 'Manager' },
];

type NotificationFormState = {
  approvalTurnNotificationsEnabled: boolean;
  approvalTurnRoleFallbackEnabled: boolean;
  expiryDigestEnabled: boolean;
  staleApprovalDigestEnabled: boolean;
  staleSignatureDigestEnabled: boolean;
  staleApprovalReminderDays: string;
  staleSignatureReminderDays: string;
  digestRecipientRoles: string[];
};

const DEFAULT_FORM: NotificationFormState = {
  approvalTurnNotificationsEnabled: true,
  approvalTurnRoleFallbackEnabled: true,
  expiryDigestEnabled: true,
  staleApprovalDigestEnabled: true,
  staleSignatureDigestEnabled: true,
  staleApprovalReminderDays: '3',
  staleSignatureReminderDays: '3',
  digestRecipientRoles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
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

export default function ContractNotificationSettingsPanel() {
  const { data: hotelProfile } = useHotelProfile();
  const updateHotelProfile = useUpdateHotelProfile();
  const [form, setForm] = useState<NotificationFormState>(DEFAULT_FORM);

  useEffect(() => {
    const notifications = hotelProfile?.hrContractSettings?.notifications;
    if (!notifications) return;

    setForm({
      approvalTurnNotificationsEnabled: notifications.approvalTurnNotificationsEnabled ?? true,
      approvalTurnRoleFallbackEnabled: notifications.approvalTurnRoleFallbackEnabled ?? true,
      expiryDigestEnabled: notifications.expiryDigestEnabled ?? true,
      staleApprovalDigestEnabled: notifications.staleApprovalDigestEnabled ?? true,
      staleSignatureDigestEnabled: notifications.staleSignatureDigestEnabled ?? true,
      staleApprovalReminderDays: String(notifications.staleApprovalReminderDays ?? 3),
      staleSignatureReminderDays: String(notifications.staleSignatureReminderDays ?? 3),
      digestRecipientRoles: notifications.digestRecipientRoles ?? ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    });
  }, [hotelProfile?.hrContractSettings]);

  const toggleDigestRole = (role: string) => {
    setForm((current) => ({
      ...current,
      digestRecipientRoles: current.digestRecipientRoles.includes(role)
        ? current.digestRecipientRoles.filter((item) => item !== role)
        : [...current.digestRecipientRoles, role],
    }));
  };

  const handleSave = async () => {
    await updateHotelProfile.mutateAsync({
      hrContractSettings: {
        ...DEFAULT_HR_CONTRACT_SETTINGS,
        ...hotelProfile?.hrContractSettings,
        notifications: {
          approvalTurnNotificationsEnabled: form.approvalTurnNotificationsEnabled,
          approvalTurnRoleFallbackEnabled: form.approvalTurnRoleFallbackEnabled,
          expiryDigestEnabled: form.expiryDigestEnabled,
          staleApprovalDigestEnabled: form.staleApprovalDigestEnabled,
          staleSignatureDigestEnabled: form.staleSignatureDigestEnabled,
          staleApprovalReminderDays: Number(form.staleApprovalReminderDays || 3),
          staleSignatureReminderDays: Number(form.staleSignatureReminderDays || 3),
          digestRecipientRoles: form.digestRecipientRoles,
        },
      },
    });
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="rounded-2xl border border-[#1e2536] bg-[#161b27] p-5">
        <div className="mb-5">
          <h2 className="text-lg font-bold text-white">Contract Notifications</h2>
          <p className="mt-1 text-sm text-slate-500">
            Control real-time approval alerts and the reminder digests that keep HR contracts moving.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={form.approvalTurnNotificationsEnabled}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  approvalTurnNotificationsEnabled: event.target.checked,
                }))
              }
            />
            Notify approvers immediately when it becomes their turn
          </label>

          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={form.approvalTurnRoleFallbackEnabled}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  approvalTurnRoleFallbackEnabled: event.target.checked,
                }))
              }
            />
            Fall back to all eligible users in the role when no user is assigned
          </label>

          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={form.expiryDigestEnabled}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  expiryDigestEnabled: event.target.checked,
                }))
              }
            />
            Send expiry reminder digests
          </label>

          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={form.staleApprovalDigestEnabled}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  staleApprovalDigestEnabled: event.target.checked,
                }))
              }
            />
            Send stale approval digests
          </label>

          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={form.staleSignatureDigestEnabled}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  staleSignatureDigestEnabled: event.target.checked,
                }))
              }
            />
            Send stale signature digests
          </label>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
              Stale Approval Reminder Days
            </label>
            <input
              type="number"
              min="1"
              max="30"
              value={form.staleApprovalReminderDays}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  staleApprovalReminderDays: event.target.value,
                }))
              }
              className="w-full rounded-lg border border-[#1e2536] bg-[#0f1117] px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
              Stale Signature Reminder Days
            </label>
            <input
              type="number"
              min="1"
              max="30"
              value={form.staleSignatureReminderDays}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  staleSignatureReminderDays: event.target.value,
                }))
              }
              className="w-full rounded-lg border border-[#1e2536] bg-[#0f1117] px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="mt-6">
          <p className="mb-3 text-xs uppercase tracking-wider text-slate-500">
            Reminder Digest Audience
          </p>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            {ROLE_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-2 rounded-lg border border-[#1e2536] bg-[#0f1117] px-3 py-2 text-sm text-slate-300"
              >
                <input
                  type="checkbox"
                  checked={form.digestRecipientRoles.includes(option.value)}
                  onChange={() => toggleDigestRole(option.value)}
                />
                {option.label}
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            These roles receive expiry, stale approval, and stale signature digests when the notification scan runs.
          </p>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={() => void handleSave()}
            disabled={updateHotelProfile.isPending}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-60"
          >
            {updateHotelProfile.isPending ? 'Saving…' : 'Save Notification Settings'}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-[#1e2536] bg-[#161b27] p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-2xl bg-cyan-500/10 p-3 text-cyan-300">
            <BellRing size={18} />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Notification Snapshot</h3>
            <p className="mt-1 text-sm text-slate-500">
              The current operating rules for approval alerts and follow-up reminders.
            </p>
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-[#1e2536] bg-[#0f1117] p-4 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-500">Approver turn alerts</span>
            <span className="font-medium text-slate-200">
              {form.approvalTurnNotificationsEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-500">Role fallback</span>
            <span className="font-medium text-slate-200">
              {form.approvalTurnRoleFallbackEnabled ? 'Enabled' : 'Assigned user only'}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-500">Stale approval reminder</span>
            <span className="font-medium text-slate-200">{form.staleApprovalReminderDays} days</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-500">Stale signature reminder</span>
            <span className="font-medium text-slate-200">{form.staleSignatureReminderDays} days</span>
          </div>
          <div className="h-px bg-[#1e2536]" />
          <div>
            <p className="text-slate-500">Digest recipients</p>
            <p className="mt-1 font-medium text-slate-200">
              {form.digestRecipientRoles.length
                ? form.digestRecipientRoles
                    .map((role) => role.toLowerCase().split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' '))
                    .join(', ')
                : 'No digest recipients selected'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
