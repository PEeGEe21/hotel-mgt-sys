'use client';

import { useState } from 'react';
import { Plus, Search, ChevronRight } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { useFacilities } from '@/hooks/facility/useFacility';
import {
  useFacilityComplaints,
  useCreateFacilityComplaint,
} from '@/hooks/facility/useFacilityComplaint';
import { useStaff } from '@/hooks/staff/useStaff';
import { useGuests } from '@/hooks/useGuests';
import ManageFacilityComplaintModal from './_components/ManageFacilityComplaintModal';
import ComplaintDrawer from './_components/ComplaintDrawer';
import Pagination from '@/components/ui/pagination';
import TableScroll from '@/components/ui/table-scroll';
import { usePermissions } from '@/hooks/usePermissions';

type Priority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
type ComplaintStatus = 'NEW' | 'ACKNOWLEDGED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
type ReporterType = 'GUEST' | 'STAFF';

const priorityStyle: Record<string, string> = {
  LOW: 'bg-slate-500/15 text-slate-400',
  NORMAL: 'bg-amber-500/15 text-amber-400',
  HIGH: 'bg-orange-500/15 text-orange-400',
  URGENT: 'bg-red-500/15 text-red-400',
};

const statusStyle: Record<string, string> = {
  NEW: 'bg-blue-500/15 text-blue-400',
  ACKNOWLEDGED: 'bg-amber-500/15 text-amber-400',
  IN_PROGRESS: 'bg-amber-500/15 text-amber-400',
  RESOLVED: 'bg-emerald-500/15 text-emerald-400',
  CLOSED: 'bg-slate-500/15 text-slate-400',
};

export default function FacilityComplaintsPage() {
  const { can } = usePermissions();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [filter, setFilter] = useState<'All' | ComplaintStatus>('All');
  const [reporterTypeFilter, setReporterTypeFilter] = useState<'All' | ReporterType>('All');
  const [reporterIdFilter, setReporterIdFilter] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);

  const debouncedSearch = useDebounce(search, 400);
  const resetPage = () => setPage(1);

  const { data, isLoading, error } = useFacilityComplaints({
    search: debouncedSearch || undefined,
    page,
    limit,
    status: filter === 'All' ? undefined : filter,
    reporterType: reporterTypeFilter === 'All' ? undefined : reporterTypeFilter,
    reporterStaffId:
      reporterTypeFilter === 'STAFF' && reporterIdFilter ? reporterIdFilter : undefined,
    reporterGuestId:
      reporterTypeFilter === 'GUEST' && reporterIdFilter ? reporterIdFilter : undefined,
  });
  const createComplaint = useCreateFacilityComplaint();

  const complaints = data?.complaints ?? [];
  const { data: facilitiesData } = useFacilities({ page: 1, limit: 100 });
  const { data: staffData } = useStaff({ page: 1, limit: 200 });
  const { data: guestsData } = useGuests({ page: 1, limit: 200 });

  const facilityOptions =
    facilitiesData?.facilities.map((f) => ({ value: f.id, label: f.name })) ?? [];
  const staffOptions =
    staffData?.staff.map((s) => ({ value: s.id, label: `${s.firstName} ${s.lastName}`.trim() })) ??
    [];
  const guestOptions =
    guestsData?.guests.map((g) => ({
      value: g.id,
      label: `${g.firstName} ${g.lastName}`.trim(),
    })) ?? [];
  const canManageComplaints = can('manage:facilities');
  const canCreateMaintenance = can('create:facilities');
  const selectedComplaint =
    complaints.find((complaint) => complaint.id === selectedComplaintId) ?? null;

  return (
    <div>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Facility Complaints</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              {
                complaints.filter((c) => ['NEW', 'ACKNOWLEDGED', 'IN_PROGRESS'].includes(c.status))
                  .length
              }{' '}
              open complaints
              {isLoading && <span className="ml-2 text-xs text-slate-600">Loading…</span>}
              {error && (
                <span className="ml-2 text-xs text-red-400">
                  {error instanceof Error ? error.message : 'Failed to load complaints'}
                </span>
              )}
            </p>
          </div>
          {canManageComplaints ? (
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            >
              <Plus size={15} /> Log Complaint
            </button>
          ) : null}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              label: 'New',
              count: complaints.filter((c) => c.status === 'NEW').length,
              color: 'text-blue-400',
              bg: 'bg-blue-500/10 border-blue-500/20',
            },
            {
              label: 'In Progress',
              count: complaints.filter((c) => c.status === 'IN_PROGRESS').length,
              color: 'text-amber-400',
              bg: 'bg-amber-500/10 border-amber-500/20',
            },
            {
              label: 'Resolved',
              count: complaints.filter((c) => c.status === 'RESOLVED').length,
              color: 'text-emerald-400',
              bg: 'bg-emerald-500/10 border-emerald-500/20',
            },
            {
              label: 'Urgent',
              count: complaints.filter((c) => c.priority === 'URGENT').length,
              color: 'text-red-400',
              bg: 'bg-red-500/10 border-red-500/20',
            },
          ].map(({ label, count, color, bg }) => (
            <div key={label} className={`${bg} border rounded-xl px-4 py-4`}>
              <p className={`text-2xl font-bold ${color}`}>{count}</p>
              <p className="text-xs text-slate-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
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
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search complaints..."
              className="bg-transparent text-sm text-slate-300 placeholder:text-slate-600 outline-none flex-1"
            />
          </div>
          <select
            value={reporterTypeFilter}
            onChange={(e) => {
              setReporterTypeFilter(e.target.value as 'All' | ReporterType);
              setReporterIdFilter('');
              resetPage();
            }}
            className="bg-[#161b27] border border-[#1e2536] rounded-lg px-3 py-2 text-sm text-slate-300 outline-none focus:border-blue-500 transition-colors"
          >
            <option value="All">All Reporters</option>
            <option value="STAFF">Staff</option>
            <option value="GUEST">Guest</option>
          </select>
          {reporterTypeFilter !== 'All' && (
            <select
              value={reporterIdFilter}
              onChange={(e) => {
                setReporterIdFilter(e.target.value);
                resetPage();
              }}
              className="bg-[#161b27] border border-[#1e2536] rounded-lg px-3 py-2 text-sm text-slate-300 outline-none focus:border-blue-500 transition-colors"
            >
              <option value="">Select reporter</option>
              {(reporterTypeFilter === 'STAFF' ? staffOptions : guestOptions).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          )}
          <div className="flex gap-1.5">
            {(['All', 'NEW', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const).map(
              (f) => (
                <button
                  key={f}
                  onClick={() => {
                    setFilter(f);
                    resetPage();
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${filter === f ? 'bg-blue-600/20 border-blue-500/30 text-blue-400' : 'bg-[#161b27] border-[#1e2536] text-slate-400 hover:text-slate-200'}`}
                >
                  {f}
                </button>
              ),
            )}
          </div>
        </div>

        {/* Table */}
        <div className="bg-[#161b27] border border-[#1e2536] rounded-xl overflow-hidden">
          <TableScroll>
          <table className="w-full">
            <thead className="border-b border-[#1e2536] bg-[#0f1117]/50">
              <tr>
                {[
                  '#',
                  'Complaint',
                  'Facility',
                  'Reporter',
                  'Channel',
                  'Date',
                  'Priority',
                  'Status',
                  'Linked MR',
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
              {complaints.length === 0 && (
                <tr className="border-b border-[#1e2536] last:border-0 text-center">
                  <td colSpan={10} className="px-4 py-3 text-sm text-slate-500">
                    {isLoading ? 'Loading complaints…' : 'No complaints found'}
                  </td>
                </tr>
              )}
              {complaints.map((c, i) => (
                <tr
                  key={c.id}
                  onClick={() => {
                    setSelectedComplaintId(c.id);
                    setDrawerOpen(true);
                  }}
                  className="border-b border-[#1e2536] last:border-0 hover:bg-white/[0.02] transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3 text-sm text-slate-500">
                    {(page - 1) * (data?.meta.per_page ?? limit) + i + 1}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-slate-200">{c.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5 max-w-[200px] truncate">
                      {c.description}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-400 whitespace-nowrap">
                    {c.facility?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-400 whitespace-nowrap">
                    {c.reporter ?? '—'}{' '}
                    <span className="text-xs text-slate-500">({c.reporterType})</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                    {c.channel}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                    {c.createdAt ? new Date(c.createdAt).toISOString().slice(0, 10) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-medium ${priorityStyle[c?.priority] ?? 'bg-slate-500/15 text-slate-400'}`}
                    >
                      {c.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusStyle[c.status] ?? 'bg-slate-500/15 text-slate-400'}`}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                    {c.maintenanceRequest?.requestNo ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <ChevronRight size={16} className="text-slate-600" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </TableScroll>
        </div>
        {data?.meta && complaints.length > 0 && (
          <div className="mt-4">
            <Pagination meta={data.meta} currentPage={page} handlePageChange={setPage} />
          </div>
        )}
      </div>
      <ManageFacilityComplaintModal
        isOpen={showAdd && canManageComplaints}
        onClose={() => setShowAdd(false)}
        facilityOptions={facilityOptions}
        staffOptions={staffOptions}
        guestOptions={guestOptions}
        isSubmitting={createComplaint.isPending}
        onSubmit={async (values) => {
          await createComplaint.mutateAsync({
            reporterType: values.reporterType,
            reporterStaffId: values.reporterType === 'STAFF' ? values.reporterId : undefined,
            reporterGuestId: values.reporterType === 'GUEST' ? values.reporterId : undefined,
            channel: values.channel,
            facilityId: values.facilityId || undefined,
            title: values.title.trim(),
            description: values.description.trim(),
            category: values.category.trim(),
            priority: values.priority,
          });
          setShowAdd(false);
        }}
      />

      <ComplaintDrawer
        isOpen={drawerOpen}
        complaint={selectedComplaint}
        canManageComplaints={canManageComplaints}
        canCreateMaintenance={canCreateMaintenance}
        staffOptions={staffOptions}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedComplaintId(null);
        }}
      />
    </div>
  );
}
