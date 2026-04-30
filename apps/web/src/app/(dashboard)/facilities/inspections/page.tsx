'use client';

import { useState } from 'react';
import { CheckCircle2, Clock, Plus, Search, X, XCircle } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { useFacilities } from '@/hooks/facility/useFacility';
import {
  useCreateFacilityInspection,
  useFacilityInspections,
} from '@/hooks/facility/useFacilityInspection';
import { useStaff } from '@/hooks/staff/useStaff';
import Pagination from '@/components/ui/pagination';
import { usePermissions } from '@/hooks/usePermissions';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  DrawerTitle,
} from '@/components/ui/drawer';

type InspectionStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'SUBMITTED' | 'CLOSED';
type InspectionType = 'INTERNAL' | 'THIRD_PARTY' | 'REGULATORY';

const statusStyle: Record<string, string> = {
  SCHEDULED: 'bg-blue-500/15 text-blue-400',
  IN_PROGRESS: 'bg-amber-500/15 text-amber-400',
  SUBMITTED: 'bg-emerald-500/15 text-emerald-400',
  CLOSED: 'bg-slate-500/15 text-slate-400',
};

const statuses: Array<'All' | InspectionStatus> = [
  'All',
  'SCHEDULED',
  'IN_PROGRESS',
  'SUBMITTED',
  'CLOSED',
];
const inspectionTypes: Array<'All' | InspectionType> = [
  'All',
  'INTERNAL',
  'THIRD_PARTY',
  'REGULATORY',
];

const StatusIcon = ({ status }: { status: string }) => {
  if (status === 'SUBMITTED') return <CheckCircle2 size={14} className="text-emerald-400" />;
  if (status === 'IN_PROGRESS') return <Clock size={14} className="text-amber-400" />;
  if (status === 'CLOSED') return <XCircle size={14} className="text-slate-400" />;
  return <Clock size={14} className="text-blue-400" />;
};

function toDate(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toISOString().slice(0, 10);
}

function staffName(staff?: { firstName: string; lastName: string } | null) {
  if (!staff) return '—';
  return `${staff.firstName} ${staff.lastName}`.trim() || '—';
}

export default function FacilityInspectionsPage() {
  const { can } = usePermissions();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [statusFilter, setStatusFilter] = useState<'All' | InspectionStatus>('All');
  const [typeFilter, setTypeFilter] = useState<'All' | InspectionType>('All');
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    facilityId: '',
    inspectionType: 'INTERNAL',
    scheduledBy: '',
    inspectorName: '',
    inspectorOrganization: '',
    scheduledAt: '',
    findings: '',
  });

  const debouncedSearch = useDebounce(search, 400);
  const resetPage = () => setPage(1);

  const {
    data,
    isLoading,
    error: loadError,
  } = useFacilityInspections({
    search: debouncedSearch || undefined,
    page,
    limit,
    status: statusFilter === 'All' ? undefined : statusFilter,
    inspectionType: typeFilter === 'All' ? undefined : typeFilter,
  });
  const createInspection = useCreateFacilityInspection();
  const { data: facilitiesData } = useFacilities({ page: 1, limit: 100 });
  const { data: staffData } = useStaff({ page: 1, limit: 200 });

  const inspections = data?.inspections ?? [];
  const facilities = facilitiesData?.facilities ?? [];
  const staff = staffData?.staff ?? [];
  const canManageInspections = can('manage:facilities');

  const resetForm = () => {
    setForm({
      facilityId: '',
      inspectionType: 'INTERNAL',
      scheduledBy: '',
      inspectorName: '',
      inspectorOrganization: '',
      scheduledAt: '',
      findings: '',
    });
  };

  const handleCreate = async () => {
    try {
      setError(null);
      await createInspection.mutateAsync({
        facilityId: form.facilityId || undefined,
        inspectionType: form.inspectionType,
        scheduledBy: form.scheduledBy || undefined,
        inspectorName: form.inspectorName.trim() || undefined,
        inspectorOrganization: form.inspectorOrganization.trim() || undefined,
        scheduledAt: new Date(`${form.scheduledAt}T00:00:00.000Z`).toISOString(),
        findings: form.findings.trim() || undefined,
        status: 'SCHEDULED',
      });
      resetForm();
      setShowAdd(false);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? 'Failed to schedule inspection');
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Facility Inspections</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              {inspections.filter((i) => i.status === 'SCHEDULED').length} scheduled upcoming
              {isLoading && <span className="ml-2 text-xs text-slate-600">Loading...</span>}
              {(error || loadError) && (
                <span className="ml-2 text-xs text-red-400">
                  {error ??
                    (loadError instanceof Error ? loadError.message : 'Failed to load inspections')}
                </span>
              )}
            </p>
          </div>
          {canManageInspections ? (
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            >
              <Plus size={15} /> Schedule Inspection
            </button>
          ) : null}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              label: 'Total',
              count: data?.total ?? inspections.length,
              color: 'text-blue-400',
              bg: 'bg-blue-500/10 border-blue-500/20',
            },
            {
              label: 'Submitted',
              count: inspections.filter((i) => i.status === 'SUBMITTED').length,
              color: 'text-emerald-400',
              bg: 'bg-emerald-500/10 border-emerald-500/20',
            },
            {
              label: 'In Progress',
              count: inspections.filter((i) => i.status === 'IN_PROGRESS').length,
              color: 'text-amber-400',
              bg: 'bg-amber-500/10 border-amber-500/20',
            },
            {
              label: 'Scheduled',
              count: inspections.filter((i) => i.status === 'SCHEDULED').length,
              color: 'text-blue-400',
              bg: 'bg-blue-500/10 border-blue-500/20',
            },
          ].map(({ label, count, color, bg }) => (
            <div key={label} className={`${bg} border rounded-xl px-4 py-4`}>
              <p className={`text-2xl font-bold ${color}`}>{count}</p>
              <p className="text-xs text-slate-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <select
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              resetPage();
            }}
            className="bg-[#161b27] border border-[#1e2536] rounded-lg px-3 py-2 text-sm text-slate-300 outline-none focus:border-blue-500 transition-colors"
          >
            {[5, 10, 20, 50].map((n) => (
              <option key={n} value={n}>
                {n} per page
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2 bg-[#161b27] border border-[#1e2536] rounded-lg px-3 py-2 flex-1 min-w-56">
            <Search size={14} className="text-slate-500" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                resetPage();
              }}
              placeholder="Search inspections..."
              className="bg-transparent text-sm text-slate-300 placeholder:text-slate-600 outline-none flex-1"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value as 'All' | InspectionType);
              resetPage();
            }}
            className="bg-[#161b27] border border-[#1e2536] rounded-lg px-3 py-2 text-sm text-slate-300 outline-none focus:border-blue-500 transition-colors"
          >
            {inspectionTypes.map((type) => (
              <option key={type} value={type}>
                {type === 'All' ? 'All Types' : type}
              </option>
            ))}
          </select>
          <div className="flex gap-1.5 flex-wrap">
            {statuses.map((status) => (
              <button
                key={status}
                onClick={() => {
                  setStatusFilter(status);
                  resetPage();
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  statusFilter === status
                    ? 'bg-blue-600/20 border-blue-500/30 text-blue-400'
                    : 'bg-[#161b27] border-[#1e2536] text-slate-400 hover:text-slate-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-[#161b27] border border-[#1e2536] rounded-xl overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="border-b border-[#1e2536] bg-[#0f1117]/50">
              <tr>
                {[
                  '#',
                  'Facility',
                  'Type',
                  'Inspector',
                  'Scheduled By',
                  'Date',
                  'Score',
                  'Status',
                  'Notes',
                ].map((h) => (
                  <th
                    key={h}
                    className="text-xs text-slate-500 uppercase tracking-wider font-medium px-4 py-3 text-left whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {inspections.length === 0 && (
                <tr className="border-b border-[#1e2536] last:border-0 text-center">
                  <td colSpan={9} className="px-4 py-3 text-sm text-slate-500">
                    {isLoading ? 'Loading inspections...' : 'No inspections found'}
                  </td>
                </tr>
              )}
              {inspections.map((insp, i) => (
                <tr
                  key={insp.id}
                  className="border-b border-[#1e2536] last:border-0 hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-4 py-3 text-sm text-slate-500">
                    {(page - 1) * (data?.meta?.per_page ?? limit) + i + 1}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-slate-200 whitespace-nowrap">
                    {insp.facility?.name ?? insp.area ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                    {insp.inspectionType}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-400 whitespace-nowrap">
                    {insp.inspectorName ?? insp.inspectorOrganization ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                    {staffName(insp.scheduledByStaff)}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                    {toDate(insp.scheduledAt)}
                  </td>
                  <td className="px-4 py-3">
                    {Number(insp.score ?? 0) > 0 ? (
                      <span
                        className={`text-sm font-bold ${Number(insp.score) >= 80 ? 'text-emerald-400' : Number(insp.score) >= 60 ? 'text-amber-400' : 'text-red-400'}`}
                      >
                        {insp.score}%
                      </span>
                    ) : (
                      <span className="text-slate-600 text-sm">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1.5 w-fit ${statusStyle[insp.status] ?? 'bg-slate-500/15 text-slate-400'}`}
                    >
                      <StatusIcon status={insp.status} />
                      {insp.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 max-w-[220px] truncate">
                    {insp.findings || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {data?.meta && inspections.length > 0 && (
          <Pagination meta={data.meta} currentPage={page} handlePageChange={setPage} />
        )}
      </div>
      <Drawer open={showAdd && canManageInspections} onOpenChange={() => setShowAdd(false)} direction="right">
        <DrawerOverlay className="bg-black/50 backdrop-blur-sm data-[state=open]:animate-fadeIn" />
        <DrawerContent className="flex h-full w-full max-w-xl flex-col border-l border-[#1e2536] bg-[#161b27] sm:!max-w-xl">
          <DrawerHeader className="flex flex-row items-center justify-between border-b border-[#1e2536] px-5 py-4">
            <DrawerTitle className="text-base font-bold text-white">
              Schedule Inspection
            </DrawerTitle>
            <button
              onClick={() => setShowAdd(false)}
              className="text-slate-500 hover:text-slate-300"
            >
              <X size={18} />
            </button>
          </DrawerHeader>
          <div className="flex-1 overflow-y-auto p-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
                  Facility
                </label>
                <select
                  value={form.facilityId}
                  onChange={(e) => setForm({ ...form, facilityId: e.target.value })}
                  className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200"
                >
                  <option value="">Select facility</option>
                  {facilities.map((facility) => (
                    <option key={facility.id} value={facility.id}>
                      {facility.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
                  Inspection Type
                </label>
                <select
                  value={form.inspectionType}
                  onChange={(e) => setForm({ ...form, inspectionType: e.target.value })}
                  className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200"
                >
                  {inspectionTypes
                    .filter((type) => type !== 'All')
                    .map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
                  Scheduled By
                </label>
                <select
                  value={form.scheduledBy}
                  onChange={(e) => setForm({ ...form, scheduledBy: e.target.value })}
                  className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200"
                >
                  <option value="">Current staff</option>
                  {staff.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.firstName} {member.lastName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
                  Inspector
                </label>
                <input
                  value={form.inspectorName}
                  onChange={(e) => setForm({ ...form, inspectorName: e.target.value })}
                  placeholder="Inspector name"
                  className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
                  Organization
                </label>
                <input
                  value={form.inspectorOrganization}
                  onChange={(e) => setForm({ ...form, inspectorOrganization: e.target.value })}
                  placeholder="Optional"
                  className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
                  Date
                </label>
                <input
                  type="date"
                  value={form.scheduledAt}
                  onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
                  className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200"
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
                  Scope / Notes
                </label>
                <input
                  value={form.findings}
                  onChange={(e) => setForm({ ...form, findings: e.target.value })}
                  placeholder="Inspection scope or notes"
                  className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowAdd(false)}
                className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg py-2.5 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={createInspection.isPending || !form.scheduledAt}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg py-2.5 text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {createInspection.isPending ? 'Scheduling...' : 'Schedule'}
              </button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
