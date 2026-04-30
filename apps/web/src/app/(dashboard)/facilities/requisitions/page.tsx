'use client';

import { useState } from 'react';
import { Plus, Search, X } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { useFacilities } from '@/hooks/facility/useFacility';
import {
  FacilityRequisition,
  useCreateFacilityRequisition,
  useFacilityRequisitions,
  useUpdateFacilityRequisitionStatus,
} from '@/hooks/facility/useFacilityRequisition';
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

type RequisitionStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'FULFILLED' | 'CANCELLED';
type RequisitionPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

const statusStyle: Record<string, string> = {
  PENDING: 'bg-amber-500/15 text-amber-400',
  APPROVED: 'bg-blue-500/15 text-blue-400',
  REJECTED: 'bg-red-500/15 text-red-400',
  FULFILLED: 'bg-emerald-500/15 text-emerald-400',
  CANCELLED: 'bg-slate-500/15 text-slate-400',
};

const priorityStyle: Record<string, string> = {
  LOW: 'bg-slate-500/15 text-slate-400',
  NORMAL: 'bg-amber-500/15 text-amber-400',
  HIGH: 'bg-orange-500/15 text-orange-400',
  URGENT: 'bg-red-500/15 text-red-400',
};

const statuses: Array<'All' | RequisitionStatus> = [
  'All',
  'PENDING',
  'APPROVED',
  'FULFILLED',
  'REJECTED',
  'CANCELLED',
];
const priorities: RequisitionPriority[] = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];

function toDate(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toISOString().slice(0, 10);
}

function staffName(staff?: { firstName: string; lastName: string } | null) {
  if (!staff) return '—';
  return `${staff.firstName} ${staff.lastName}`.trim() || '—';
}

function itemCount(items: any) {
  if (Array.isArray(items)) return items.length;
  if (Array.isArray(items?.items)) return items.items.length;
  return Number(items?.count ?? 0);
}

function requisitionTotal(requisition: FacilityRequisition) {
  return Number(requisition.estimatedTotal ?? 0);
}

export default function FacilityRequisitionsPage() {
  const { can } = usePermissions();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [filter, setFilter] = useState<'All' | RequisitionStatus>('All');
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    facilityId: '',
    requestedBy: '',
    itemCount: 1,
    estimatedTotal: '',
    priority: 'NORMAL',
    description: '',
  });

  const debouncedSearch = useDebounce(search, 400);
  const resetPage = () => setPage(1);

  const {
    data,
    isLoading,
    error: loadError,
  } = useFacilityRequisitions({
    search: debouncedSearch || undefined,
    page,
    limit,
    status: filter === 'All' ? undefined : filter,
  });
  const createRequisition = useCreateFacilityRequisition();
  const updateStatus = useUpdateFacilityRequisitionStatus();
  const { data: facilitiesData } = useFacilities({ page: 1, limit: 100 });
  const { data: staffData } = useStaff({ page: 1, limit: 200 });

  const requisitions = data?.requisitions ?? [];
  const facilities = facilitiesData?.facilities ?? [];
  const staff = staffData?.staff ?? [];
  const canCreateRequisition = can('create:facilities');

  const resetForm = () => {
    setForm({
      title: '',
      facilityId: '',
      requestedBy: '',
      itemCount: 1,
      estimatedTotal: '',
      priority: 'NORMAL',
      description: '',
    });
  };

  const handleCreate = async () => {
    try {
      setError(null);
      await createRequisition.mutateAsync({
        title: form.title.trim(),
        facilityId: form.facilityId,
        requestedBy: form.requestedBy || undefined,
        priority: form.priority,
        description: form.description.trim() || undefined,
        estimatedTotal: form.estimatedTotal ? Number(form.estimatedTotal) : undefined,
        items: {
          count: Number(form.itemCount || 0),
          description: form.description.trim(),
        },
      });
      resetForm();
      setShowAdd(false);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? 'Failed to create requisition');
    }
  };

  const handleStatus = async (id: string, status: RequisitionStatus) => {
    try {
      setError(null);
      await updateStatus.mutateAsync({
        id,
        status,
        approvedAt: status === 'APPROVED' ? new Date().toISOString() : undefined,
        fulfilledAt: status === 'FULFILLED' ? new Date().toISOString() : undefined,
      });
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? 'Failed to update requisition');
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Facility Requisitions</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              {requisitions.filter((r) => r.status === 'PENDING').length} pending approval
              {isLoading && <span className="ml-2 text-xs text-slate-600">Loading...</span>}
              {(error || loadError) && (
                <span className="ml-2 text-xs text-red-400">
                  {error ??
                    (loadError instanceof Error
                      ? loadError.message
                      : 'Failed to load requisitions')}
                </span>
              )}
            </p>
          </div>
          {canCreateRequisition ? (
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            >
              <Plus size={15} /> New Requisition
            </button>
          ) : null}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              label: 'Pending',
              count: requisitions.filter((r) => r.status === 'PENDING').length,
              color: 'text-amber-400',
              bg: 'bg-amber-500/10 border-amber-500/20',
            },
            {
              label: 'Approved',
              count: requisitions.filter((r) => r.status === 'APPROVED').length,
              color: 'text-blue-400',
              bg: 'bg-blue-500/10 border-blue-500/20',
            },
            {
              label: 'Fulfilled',
              count: requisitions.filter((r) => r.status === 'FULFILLED').length,
              color: 'text-emerald-400',
              bg: 'bg-emerald-500/10 border-emerald-500/20',
            },
            {
              label: 'Total Value',
              count: `₦${(requisitions.reduce((sum, r) => sum + requisitionTotal(r), 0) / 1000).toFixed(0)}k`,
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
              placeholder="Search requisitions..."
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
                  'Requisition',
                  'Facility',
                  'Requested By',
                  'Date',
                  'Items',
                  'Priority',
                  'Total Cost',
                  'Status',
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
              {requisitions.length === 0 && (
                <tr className="border-b border-[#1e2536] last:border-0 text-center">
                  <td colSpan={10} className="px-4 py-3 text-sm text-slate-500">
                    {isLoading ? 'Loading requisitions...' : 'No requisitions found'}
                  </td>
                </tr>
              )}
              {requisitions.map((r, i) => (
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
                      {r.description ?? '—'}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-400 whitespace-nowrap">
                    {r.facility?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-400 whitespace-nowrap">
                    {staffName(r.requestedByStaff)}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                    {toDate(r.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-400 text-center">
                    {itemCount(r.items)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${priorityStyle[r.priority] ?? 'bg-slate-500/15 text-slate-400'}`}
                    >
                      {r.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-slate-200 whitespace-nowrap">
                    ₦{requisitionTotal(r).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap ${statusStyle[r.status] ?? 'bg-slate-500/15 text-slate-400'}`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {r.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => handleStatus(r.id, 'APPROVED')}
                            disabled={updateStatus.isPending}
                            className="text-xs bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 px-2 py-1 rounded-lg transition-colors font-medium disabled:opacity-60"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleStatus(r.id, 'REJECTED')}
                            disabled={updateStatus.isPending}
                            className="text-xs bg-red-500/15 text-red-400 hover:bg-red-500/25 px-2 py-1 rounded-lg transition-colors font-medium disabled:opacity-60"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {r.status === 'APPROVED' && (
                        <button
                          onClick={() => handleStatus(r.id, 'FULFILLED')}
                          disabled={updateStatus.isPending}
                          className="text-xs bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 px-2 py-1 rounded-lg transition-colors font-medium disabled:opacity-60"
                        >
                          Fulfill
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {data?.meta && requisitions.length > 0 && (
          <Pagination meta={data.meta} currentPage={page} handlePageChange={setPage} />
        )}
      </div>

      <Drawer open={showAdd && canCreateRequisition} onOpenChange={() => setShowAdd(false)} direction="right">
        <DrawerOverlay className="bg-black/50 backdrop-blur-sm data-[state=open]:animate-fadeIn" />
        <DrawerContent className="flex h-full w-full max-w-xl flex-col border-l border-[#1e2536] bg-[#161b27] sm:!max-w-xl">
          <DrawerHeader className="flex flex-row items-center justify-between border-b border-[#1e2536] px-5 py-4">
            <DrawerTitle className="text-base font-bold text-white">New Requisition</DrawerTitle>
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
                  Title
                </label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="What are you requesting?"
                  className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600"
                />
              </div>
              <div>
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
                  Requested By
                </label>
                <select
                  value={form.requestedBy}
                  onChange={(e) => setForm({ ...form, requestedBy: e.target.value })}
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
                  No. of Items
                </label>
                <input
                  type="number"
                  min={1}
                  value={form.itemCount}
                  onChange={(e) => setForm({ ...form, itemCount: Number(e.target.value) })}
                  className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
                  Priority
                </label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200"
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
                  Estimated Cost (₦)
                </label>
                <input
                  type="number"
                  value={form.estimatedTotal}
                  onChange={(e) => setForm({ ...form, estimatedTotal: e.target.value })}
                  placeholder="0"
                  className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600"
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
                  Notes
                </label>
                <input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="What are the items? Why needed?"
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
                disabled={createRequisition.isPending || !form.title.trim() || !form.facilityId}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg py-2.5 text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {createRequisition.isPending ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
