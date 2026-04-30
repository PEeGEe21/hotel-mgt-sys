'use client';

import { useState } from 'react';
import { Plus, Search, X } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { useFacilities } from '@/hooks/facility/useFacility';
import {
  FacilityMaintenanceRequest,
  useCreateFacilityMaintenance,
  useFacilityMaintenance,
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

function toDate(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toISOString().slice(0, 10);
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
  const canCreateMaintenance = can('create:facilities');

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
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
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
          <table className="w-full min-w-[900px]">
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
                  <td colSpan={10} className="px-4 py-3 text-sm text-slate-500">
                    {isLoading
                      ? 'Loading maintenance requests...'
                      : 'No maintenance requests found'}
                  </td>
                </tr>
              )}
              {records.map((r, i) => (
                <tr
                  key={r.id}
                  className="border-b border-[#1e2536] last:border-0 hover:bg-white/[0.02] transition-colors"
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {data?.meta && records.length > 0 && (
          <Pagination meta={data.meta} currentPage={page} handlePageChange={setPage} />
        )}
      </div>

      <Drawer open={showAdd && canCreateMaintenance} onOpenChange={() => setShowAdd(false)} direction="right">
        <DrawerOverlay className="bg-black/50 backdrop-blur-sm data-[state=open]:animate-fadeIn" />
        <DrawerContent className="flex h-full w-full max-w-xl flex-col border-l border-[#1e2536] bg-[#161b27] sm:!max-w-xl">
          <DrawerHeader className="flex flex-row items-center justify-between border-b border-[#1e2536] px-5 py-4">
            <DrawerTitle className="text-base font-bold text-white">
              New Maintenance Request
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
                  Task Title
                </label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="What needs fixing?"
                  className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
                  Facility
                </label>
                <select
                  value={form.facilityId}
                  onChange={(e) => setForm({ ...form, facilityId: e.target.value })}
                  className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500 transition-colors"
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
                  className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500 transition-colors"
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
                  className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500 transition-colors"
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
                  className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500 transition-colors"
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
                  value={form.estimatedMins}
                  onChange={(e) => setForm({ ...form, estimatedMins: e.target.value })}
                  placeholder="0"
                  className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
                  Estimated Cost (₦)
                </label>
                <input
                  type="number"
                  value={form.totalCost}
                  onChange={(e) => setForm({ ...form, totalCost: e.target.value })}
                  placeholder="0"
                  className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
                  Description
                </label>
                <input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Detailed description"
                  className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-blue-500 transition-colors"
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
                disabled={
                  createMaintenance.isPending || !form.title.trim() || !form.description.trim()
                }
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg py-2.5 text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {createMaintenance.isPending ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
