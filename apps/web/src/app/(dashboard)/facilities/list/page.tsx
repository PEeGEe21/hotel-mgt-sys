'use client';

import { useState } from 'react';
import { Building2, MapPin, Layers, Users } from 'lucide-react';
import { Facility, useFacilities } from '@/hooks/facility/useFacility';
import { type FacilityFormValues } from './_components/facility/ManageFacilityModal';
import FacilityDepartmentsTab from './_components/facilityDepartment/FacilityDepartmentsTab';
import FacilityTypesTab from './_components/facilityType/FacilityTypesTab';
import FacilityLocationsTab from './_components/facilityLocation/FacilityLocationTab';
import FacilityListTab from './_components/facility/FacilityListTab';

function toFacilityStatus(value?: string | null) {
  if (value === 'Active') return 'ACTIVE';
  if (value === 'Inactive') return 'INACTIVE';
  if (value === 'Under Maintenance') return 'MAINTENANCE';
  return value ?? 'ACTIVE';
}

// ─── Main Page ────────────────────────────────────────────────────────────────
type Tab = 'list' | 'types' | 'locations' | 'departments';

export default function FacilitiesPage() {
  const [tab, setTab] = useState<Tab>('list');
  const {
    data: statsData,
    isLoading: statsLoading,
    error: statsError,
  } = useFacilities({ page: 1, limit: 1 });
  const stats = statsData?.stats;
  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: 'list', label: 'Facility List', icon: Building2 },
    { key: 'types', label: 'Facility Types', icon: Layers },
    { key: 'locations', label: 'Facility Locations', icon: MapPin },
    { key: 'departments', label: 'Facility Departments', icon: Users },
  ];

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Facility Management</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Manage hotel facilities, types, locations and departments
              {statsLoading && <span className="ml-2 text-xs text-slate-600">Loading…</span>}
              {statsError && (
                <span className="ml-2 text-xs text-red-400">
                  {statsError instanceof Error ? statsError.message : 'Failed to load stats'}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <span className="bg-blue-500/15 text-blue-400 border border-blue-500/20 px-3 py-1.5 rounded-lg font-semibold">
              {stats?.total ?? 0} Total
            </span>
            <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-lg font-semibold">
              {stats?.active ?? 0} Active
            </span>
            <span className="bg-amber-500/15 text-amber-400 border border-amber-500/20 px-3 py-1.5 rounded-lg font-semibold">
              {stats?.maintenance ?? 0} Maintenance
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 bg-[#161b27] border border-[#1e2536] rounded-xl p-1 w-fit flex-wrap">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap border ${
                tab === key
                  ? 'bg-blue-600/20 text-blue-400 border-blue-500/20'
                  : 'text-slate-400 hover:text-slate-200 border-transparent'
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {tab === 'list' && <FacilityListTab />}
        {tab === 'types' && <FacilityTypesTab />}
        {tab === 'locations' && <FacilityLocationsTab />}
        {tab === 'departments' && <FacilityDepartmentsTab />}
      </div>
    </>
  );
}
