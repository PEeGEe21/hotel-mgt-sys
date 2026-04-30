'use client';

import { useEffect, useState } from 'react';
import { ChevronRight, Plus, Search, X } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { useFacilities } from '@/hooks/facility/useFacility';
import {
  FacilityMaintenanceRequest,
  useCreateFacilityMaintenance,
  useFacilityMaintenance,
  useUpdateFacilityMaintenance,
} from '@/hooks/facility/useFacilityMaintenance';
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

type MaintenanceStatus =
  | 'OPEN'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'PENDING_PARTS'
  | 'RESOLVED'
  | 'CLOSED';
type MaintenancePriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

const statusStyle: Record<string, string> = {
  OPEN: 'bg-blue-500/15 text-blue-400',
  ASSIGNED: 'bg-indigo-500/15 text-indigo-400',
  IN_PROGRESS: 'bg-amber-500/15 text-amber-400',
  PENDING_PARTS: 'bg-orange-500/15 text-orange-400',
  RESOLVED: 'bg-emerald-500/15 text-emerald-400',
  CLOSED: 'bg-slate-500/15 text-slate-400',
};

const priorityStyle: Record<string, string> = {
  LOW: 'bg-slate-500/15 text-slate-400',
  NORMAL: 'bg-amber-500/15 text-amber-400',
  HIGH: 'bg-orange-500/15 text-orange-400',
  URGENT: 'bg-red-500/15 text-red-400',
};

const categories = [
  'PLUMBING',
  'ELECTRICAL',
  'HVAC',
  'FURNITURE',
  'EQUIPMENT',
  'STRUCTURAL',
  'OTHER',
];
const priorities: MaintenancePriority[] = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];
const statuses: Array<'All' | MaintenanceStatus> = [
  'All',
  'OPEN',
  'ASSIGNED',
  'IN_PROGRESS',
  'PENDING_PARTS',
  'RESOLVED',
  'CLOSED',
];

const inputCls =
  'w-full rounded-lg border border-[#1e2536] bg-[#0f1117] px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none transition-colors focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-60';

function toDate(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toISOString().slice(0, 10);
}

function toDateTime(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString();
}

function staffName(staff?: { firstName: string; lastName: string } | null) {
  if (!staff) return '—';
  return `${staff.firstName} ${staff.lastName}`.trim() || '—';
}

function maintenanceCost(request: FacilityMaintenanceRequest) {
  return Number(request.totalCost ?? 0);
}

export default function FacilityMaintenancePage() {
  const { can } = usePermissions();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [filter, setFilter] = useState<'All' | MaintenanceStatus>('All');
  const [showAdd, setShowAdd] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedMaintenanceId, setSelectedMaintenanceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: '',
    facilityId: '',
    assignedTo: '',
    category: 'OTHER',
    priority: 'NORMAL',
    estimatedMins: '',
    totalCost: '',
    description: '',
  });
  const [detailForm, setDetailForm] = useState({
    title: '',
    facilityId: '',
    assignedTo: '',
    category: 'OTHER',
    priority: 'NORMAL',
    estimatedMins: '',
    actualMins: '',
    totalCost: '',
    description: '',
    notes: '',
    status: 'OPEN',
  });

  const debouncedSearch = useDebounce(search, 400);
  const resetPage = () => setPage(1);

  const {
    data,
    isLoading,
    error: loadError,
  } = useFacilityMaintenance({
    search: debouncedSearch || undefined,
    page,
    limit,
    status: filter === 'All' ? undefined : filter,
  });
  const createMaintenance = useCreateFacilityMaintenance();
  const { data: facilitiesData } = useFacilities({ page: 1, limit: 100 });
  const { data: staffData } = useStaff({ page: 1, limit: 200 });

  const records = data?.maintenanceRequests ?? [];
  const facilities = facilitiesData?.facilities ?? [];
  const staff = staffData?.staff ?? [];
  const selectedMaintenance =
    records.find((request) => request.id === selectedMaintenanceId) ?? null;
  const updateMaintenance = useUpdateFacilityMaintenance(selectedMaintenance?.id ?? '');
  const canCreateMaintenance = can('create:facilities');
  const canManageMaintenance = can('manage:facilities');

  useEffect(() => {
    if (!selectedMaintenance || !showDetails) return;
    setDetailForm({
      title: selectedMaintenance.title ?? '',
      facilityId: selectedMaintenance.facilityId ?? '',
      assignedTo: selectedMaintenance.assignedTo ?? '',
      category: selectedMaintenance.category ?? 'OTHER',
      priority: selectedMaintenance.priority ?? 'NORMAL',
      estimatedMins: selectedMaintenance.estimatedMins?.toString() ?? '',
      actualMins: selectedMaintenance.actualMins?.toString() ?? '',
      totalCost:
        selectedMaintenance.totalCost != null ? String(selectedMaintenance.totalCost) : '',
      description: selectedMaintenance.description ?? '',
      notes: selectedMaintenance.notes ?? '',
      status: selectedMaintenance.status ?? 'OPEN',
    });
    setError(null);
  }, [selectedMaintenance, showDetails]);

  const activeCount = records.filter((r) => !['RESOLVED', 'CLOSED'].includes(r.status)).length;
  const totalCost = records
    .filter((r) => ['RESOLVED', 'CLOSED'].includes(r.status))
    .reduce((sum, r) => sum + maintenanceCost(r), 0);

  const resetForm = () => {
    setForm({
      title: '',
      facilityId: '',
      assignedTo: '',
      category: 'OTHER',
      priority: 'NORMAL',
      estimatedMins: '',
      totalCost: '',
      description: '',
    });
  };

  const handleCreate = async () => {
    try {
      setError(null);
      await createMaintenance.mutateAsync({
        title: form.title.trim(),
        facilityId: form.facilityId || undefined,
        assignedTo: form.assignedTo || undefined,
        category: form.category,
        priority: form.priority,
        estimatedMins: form.estimatedMins ? Number(form.estimatedMins) : undefined,
        totalCost: form.totalCost ? Number(form.totalCost) : undefined,
        description: form.description.trim(),
        status: form.assignedTo ? 'ASSIGNED' : 'OPEN',
      });
      resetForm();
      setShowAdd(false);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? 'Failed to create maintenance request');
    }
  };

  const handleUpdate = async () => {
    if (!selectedMaintenance || !canManageMaintenance) return;
    if (!detailForm.title.trim() || !detailForm.description.trim()) {
      setError('Title and description are required.');
      return;
    }

    try {
      setError(null);
      const now = new Date().toISOString();
      const nextStatus = detailForm.status as MaintenanceStatus;
      await updateMaintenance.mutateAsync({
        title: detailForm.title.trim(),
        facilityId: detailForm.facilityId || undefined,
        assignedTo: detailForm.assignedTo || undefined,
        category: detailForm.category,
        priority: detailForm.priority,
        estimatedMins: detailForm.estimatedMins ? Number(detailForm.estimatedMins) : undefined,
        actualMins: detailForm.actualMins ? Number(detailForm.actualMins) : undefined,
        totalCost: detailForm.totalCost ? Number(detailForm.totalCost) : undefined,
        description: detailForm.description.trim(),
        notes: detailForm.notes.trim() || undefined,
        status: nextStatus,
        assignedAt:
          (detailForm.assignedTo && !selectedMaintenance.assignedAt) || nextStatus === 'ASSIGNED'
            ? selectedMaintenance.assignedAt ?? now
            : undefined,
        startedAt:
          nextStatus === 'IN_PROGRESS'
            ? selectedMaintenance.startedAt ?? now
            : undefined,
        resolvedAt:
          nextStatus === 'RESOLVED' || nextStatus === 'CLOSED'
            ? selectedMaintenance.resolvedAt ?? now
            : undefined,
        closedAt: nextStatus === 'CLOSED' ? selectedMaintenance.closedAt ?? now : undefined,
      } as any);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? 'Failed to update maintenance');
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Facility Maintenance</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              {activeCount} active maintenance tasks
              {isLoading && <span className="ml-2 text-xs text-slate-600">Loading...</span>}
              {(error || loadError) && (
                <span className="ml-2 text-xs text-red-400">
                  {error ??
                    (loadError instanceof Error ? loadError.message : 'Failed to load maintenance')}
                </span>
              )}
            </p>
          </div>
          {canCreateMaintenance ? (
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
            >
              <Plus size={15} /> New Request
            </button>
          ) : null}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              label: 'Open',
              count: records.filter((r) => r.status === 'OPEN').length,
              color: 'text-blue-400',
              bg: 'bg-blue-500/10 border-blue-500/20',
            },
            {
              label: 'In Progress',
              count: records.filter((r) => r.status === 'IN_PROGRESS').length,
              color: 'text-amber-400',
              bg: 'bg-amber-500/10 border-amber-500/20',
            },
            {
              label: 'Resolved',
              count: records.filter((r) => r.status === 'RESOLVED').length,
              color: 'text-emerald-400',
              bg: 'bg-emerald-500/10 border-emerald-500/20',
            },
            {
              label: 'Total Cost (Done)',
              count: `₦${(totalCost / 1000).toFixed(0)}k`,
              color: 'text-violet-400',
              bg: 'bg-violet-500/10 border-violet-500/20',
            },
          ].map(({ label, count, color, bg }) => (
            <div key={label} className={`${bg} border rounded-xl px-4 py-4`}>
              <p className={`text-xl font-bold ${color}`}>{count}</p>
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
              placeholder="Search maintenance records..."
              className="bg-transparent text-sm text-slate-300 placeholder:text-slate-600 outline-none flex-1"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {statuses.map((status) => (
              <button
                key={status}
                onClick={() => {
                  setFilter(status);
                  resetPage();
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  filter === status
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
          <table className="w-full min-w-[980px]">
            <thead className="border-b border-[#1e2536] bg-[#0f1117]/50">
              <tr>
                {[
                  '#',
                  'Task',
                  'Category',
                  'Facility',
                  'Assigned To',
                  'Requested',
                  'Completed',
                  'Priority',
                  'Status',
                  'Cost',
                  '',
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
              {records.length === 0 && (
                <tr className="border-b border-[#1e2536] last:border-0 text-center">
                  <td colSpan={11} className="px-4 py-3 text-sm text-slate-500">
                    {isLoading
                      ? 'Loading maintenance requests...'
                      : 'No maintenance requests found'}
                  </td>
                </tr>
              )}
              {records.map((r, i) => (
                <tr
                  key={r.id}
                  onClick={() => {
                    setSelectedMaintenanceId(r.id);
                    setShowDetails(true);
                  }}
                  className="cursor-pointer border-b border-[#1e2536] last:border-0 transition-colors hover:bg-white/[0.02]"
                >
                  <td className="px-4 py-3 text-sm text-slate-500">
                    {(page - 1) * (data?.meta?.per_page ?? limit) + i + 1}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-slate-200">{r.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5 max-w-[180px] truncate">
                      {r.description}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                    {r.category}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-400 whitespace-nowrap">
                    {r.facility?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-400 whitespace-nowrap">
                    {staffName(r.assignedToStaff)}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                    {toDate(r.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                    {toDate(r.resolvedAt ?? r.closedAt)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${priorityStyle[r.priority] ?? 'bg-slate-500/15 text-slate-400'}`}
                    >
                      {r.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${statusStyle[r.status] ?? 'bg-slate-500/15 text-slate-400'}`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-300 whitespace-nowrap">
                    ₦{maintenanceCost(r).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <ChevronRight size={16} className="text-slate-600" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {data?.meta && records.length > 0 && (
          <Pagination meta={data.meta} currentPage={page} handlePageChange={setPage} />
        )}
      </div>

      <Drawer
        open={showAdd && canCreateMaintenance}
        onOpenChange={() => setShowAdd(false)}
        direction="right"
      >
        <DrawerOverlay className="bg-black/50 backdrop-blur-sm data-[state=open]:animate-fadeIn" />
        <DrawerContent className="flex h-full w-full max-w-xl flex-col border-l border-[#1e2536] bg-[#161b27] sm:!max-w-xl">
          <DrawerHeader className="flex flex-row items-center justify-between border-b border-[#1e2536] px-5 py-4">
            <DrawerTitle className="text-base font-bold text-white">
              New Maintenance Request
            </DrawerTitle>
            <button onClick={() => setShowAdd(false)} className="text-slate-500 hover:text-slate-300">
              <X size={18} />
            </button>
          </DrawerHeader>
          <div className="flex-1 overflow-y-auto p-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
                  Task Title
                </label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="What needs fixing?"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
                  Facility
                </label>
                <select
                  value={form.facilityId}
                  onChange={(e) => setForm({ ...form, facilityId: e.target.value })}
                  className={inputCls}
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
                  Assigned To
                </label>
                <select
                  value={form.assignedTo}
                  onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
                  className={inputCls}
                >
                  <option value="">Unassigned</option>
                  {staff.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.firstName} {member.lastName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
                  Category
                </label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className={inputCls}
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
                  Priority
                </label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  className={inputCls}
                >
                  {priorities.map((priority) => (
                    <option key={priority} value={priority}>
                      {priority}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
                  Estimated Mins
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.estimatedMins}
                  onChange={(e) => setForm({ ...form, estimatedMins: e.target.value })}
                  placeholder="0"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
                  Estimated Cost (₦)
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.totalCost}
                  onChange={(e) => setForm({ ...form, totalCost: e.target.value })}
                  placeholder="0"
                  className={inputCls}
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Detailed description"
                  className={`${inputCls} min-h-[120px]`}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowAdd(false)}
                className="flex-1 rounded-lg bg-white/5 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={
                  createMaintenance.isPending || !form.title.trim() || !form.description.trim()
                }
                className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {createMaintenance.isPending ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      <Drawer
        open={showDetails}
        onOpenChange={(open) => {
          setShowDetails(open);
          if (!open) setSelectedMaintenanceId(null);
        }}
        direction="right"
      >
        <DrawerOverlay className="bg-black/50 backdrop-blur-sm data-[state=open]:animate-fadeIn" />
        <DrawerContent className="flex h-full w-full max-w-xl flex-col border-l border-[#1e2536] bg-[#161b27] sm:!max-w-xl">
          <DrawerHeader className="flex flex-row items-center justify-between border-b border-[#1e2536] px-5 py-4">
            <div>
              <DrawerTitle className="text-base font-bold text-white">
                Maintenance Details
              </DrawerTitle>
              <p className="mt-1 text-xs text-slate-500">
                {selectedMaintenance?.requestNo ?? 'Select a request'}
              </p>
            </div>
            <button
              onClick={() => {
                setShowDetails(false);
                setSelectedMaintenanceId(null);
              }}
              className="text-slate-500 hover:text-slate-300"
            >
              <X size={18} />
            </button>
          </DrawerHeader>
          <div className="flex-1 overflow-y-auto p-5">
            {selectedMaintenance ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 rounded-xl border border-[#1e2536] bg-[#0f1117]/60 p-4">
                  <div>
                    <p className="text-xs text-slate-500">Created</p>
                    <p className="text-sm text-slate-200">{toDateTime(selectedMaintenance.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Assigned At</p>
                    <p className="text-sm text-slate-200">{toDateTime(selectedMaintenance.assignedAt)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Started At</p>
                    <p className="text-sm text-slate-200">{toDateTime(selectedMaintenance.startedAt)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Resolved / Closed</p>
                    <p className="text-sm text-slate-200">
                      {toDateTime(selectedMaintenance.closedAt ?? selectedMaintenance.resolvedAt)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
                      Task Title
                    </label>
                    <input
                      value={detailForm.title}
                      onChange={(e) => setDetailForm({ ...detailForm, title: e.target.value })}
                      disabled={!canManageMaintenance || updateMaintenance.isPending}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
                      Facility
                    </label>
                    <select
                      value={detailForm.facilityId}
                      onChange={(e) =>
                        setDetailForm({ ...detailForm, facilityId: e.target.value })
                      }
                      disabled={!canManageMaintenance || updateMaintenance.isPending}
                      className={inputCls}
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
                      Assigned To
                    </label>
                    <select
                      value={detailForm.assignedTo}
                      onChange={(e) =>
                        setDetailForm({ ...detailForm, assignedTo: e.target.value })
                      }
                      disabled={!canManageMaintenance || updateMaintenance.isPending}
                      className={inputCls}
                    >
                      <option value="">Unassigned</option>
                      {staff.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.firstName} {member.lastName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
                      Category
                    </label>
                    <select
                      value={detailForm.category}
                      onChange={(e) => setDetailForm({ ...detailForm, category: e.target.value })}
                      disabled={!canManageMaintenance || updateMaintenance.isPending}
                      className={inputCls}
                    >
                      {categories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
                      Priority
                    </label>
                    <select
                      value={detailForm.priority}
                      onChange={(e) => setDetailForm({ ...detailForm, priority: e.target.value })}
                      disabled={!canManageMaintenance || updateMaintenance.isPending}
                      className={inputCls}
                    >
                      {priorities.map((priority) => (
                        <option key={priority} value={priority}>
                          {priority}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
                      Status
                    </label>
                    <select
                      value={detailForm.status}
                      onChange={(e) => setDetailForm({ ...detailForm, status: e.target.value })}
                      disabled={!canManageMaintenance || updateMaintenance.isPending}
                      className={inputCls}
                    >
                      {statuses
                        .filter((status) => status !== 'All')
                        .map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
                      Estimated Mins
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={detailForm.estimatedMins}
                      onChange={(e) =>
                        setDetailForm({ ...detailForm, estimatedMins: e.target.value })
                      }
                      disabled={!canManageMaintenance || updateMaintenance.isPending}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
                      Actual Mins
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={detailForm.actualMins}
                      onChange={(e) =>
                        setDetailForm({ ...detailForm, actualMins: e.target.value })
                      }
                      disabled={!canManageMaintenance || updateMaintenance.isPending}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
                      Total Cost (₦)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={detailForm.totalCost}
                      onChange={(e) => setDetailForm({ ...detailForm, totalCost: e.target.value })}
                      disabled={!canManageMaintenance || updateMaintenance.isPending}
                      className={inputCls}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
                      Description
                    </label>
                    <textarea
                      value={detailForm.description}
                      onChange={(e) =>
                        setDetailForm({ ...detailForm, description: e.target.value })
                      }
                      disabled={!canManageMaintenance || updateMaintenance.isPending}
                      className={`${inputCls} min-h-[120px]`}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
                      Notes
                    </label>
                    <textarea
                      value={detailForm.notes}
                      onChange={(e) => setDetailForm({ ...detailForm, notes: e.target.value })}
                      disabled={!canManageMaintenance || updateMaintenance.isPending}
                      className={`${inputCls} min-h-[100px]`}
                    />
                  </div>
                </div>

                {canManageMaintenance ? (
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowDetails(false);
                        setSelectedMaintenanceId(null);
                      }}
                      className="flex-1 rounded-lg bg-white/5 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-white/10"
                    >
                      Close
                    </button>
                    <button
                      onClick={handleUpdate}
                      disabled={updateMaintenance.isPending}
                      className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {updateMaintenance.isPending ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">
                    You can review maintenance details here, but only facilities managers can
                    update them.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-400">Select a maintenance request to review.</p>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
