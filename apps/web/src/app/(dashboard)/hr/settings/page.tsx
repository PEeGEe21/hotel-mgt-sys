'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import ApprovalRoutesPanel from '@/components/hr/ApprovalRoutesPanel';
import ContractNotificationSettingsPanel from '@/components/hr/ContractNotificationSettingsPanel';
import ContractPolicySettingsPanel from '@/components/hr/ContractPolicySettingsPanel';
import ContractTemplateSettingsPanel from '@/components/hr/ContractTemplateSettingsPanel';
import JobTitlesPanel from '@/components/hr/JobTitlesPanel';

type SettingsTab =
  | 'approval-routes'
  | 'job-titles'
  | 'notifications'
  | 'templates'
  | 'contract-settings';

const TABS: Array<{ id: SettingsTab; label: string; description: string }> = [
  {
    id: 'approval-routes',
    label: 'Approval Routes',
    description: 'Configure contract-type and hotel-default approval chains.',
  },
  {
    id: 'job-titles',
    label: 'Job Titles',
    description: 'Manage reusable titles that staff and contracts can reference.',
  },
  {
    id: 'notifications',
    label: 'Notifications',
    description: 'Contract reminders and approval escalation settings.',
  },
  {
    id: 'templates',
    label: 'Templates',
    description: 'Contract document templates and generated paperwork rules.',
  },
  {
    id: 'contract-settings',
    label: 'Contract Settings',
    description: 'Expiry thresholds, defaults, and future HR contract controls.',
  },
];

export default function HrSettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('approval-routes');
  const [search, setSearch] = useState('');

  const visibleTabs = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return TABS;
    return TABS.filter(
      (tab) =>
        tab.label.toLowerCase().includes(query) || tab.description.toLowerCase().includes(query),
    );
  }, [search]);

  const activeTabMeta = TABS.find((tab) => tab.id === activeTab);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">HR Settings</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Keep HR contract workflows and future reporting settings organized in one place.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-[#1e2536] bg-[#161b27] px-3 py-2.5">
          <Search size={14} className="text-slate-500" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search HR settings..."
            className="w-full bg-transparent text-sm text-slate-200 outline-none placeholder:text-slate-600"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'border-blue-500/30 bg-blue-600/15 text-blue-300'
                : 'border-[#1e2536] bg-[#161b27] text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-[#1e2536] bg-[#161b27] p-5">
        <h2 className="text-lg font-bold text-white">{activeTabMeta?.label}</h2>
        <p className="mt-1 text-sm text-slate-500">{activeTabMeta?.description}</p>
      </div>

      {activeTab === 'approval-routes' ? (
        <ApprovalRoutesPanel />
      ) : activeTab === 'job-titles' ? (
        <JobTitlesPanel />
      ) : activeTab === 'templates' ? (
        <ContractTemplateSettingsPanel />
      ) : activeTab === 'contract-settings' ? (
        <ContractPolicySettingsPanel />
      ) : activeTab === 'notifications' ? (
        <ContractNotificationSettingsPanel />
      ) : (
        <div className="rounded-2xl border border-[#1e2536] bg-[#161b27] p-6">
          <p className="text-sm text-slate-400">
            This tab is reserved for the next HR settings pass.
          </p>
        </div>
      )}
    </div>
  );
}
