'use client';

import { useState } from 'react';
import { Plus, Search, Eye } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import {
  Facility,
  useCreateFacility,
  useDeleteFacility,
  useFacilities,
  useUpdateFacility,
} from '@/hooks/facility/useFacility';
import { useFacilityTypes } from '@/hooks/facility/useFacilityType';
import { useFacilityDepartments } from '@/hooks/facility/useFacilityDepartment';
import { useStaffAll } from '@/hooks/staff/useStaff';
import Pagination from '@/components/ui/pagination';
import { useFacilityLocations } from '@/hooks/facility/useFacilityLocation';
import ManageFacilityModal, { FacilityFormValues } from './ManageFacilityModal';
import FacilityDetailsModal from './FacilityDetailsModal';
import DeleteConfirmModal from '../DeleteConfirmModal';

type FacilityStatus = 'Active' | 'Inactive' | 'Under Maintenance';

const statusStyle: Record<FacilityStatus, string> = {
  Active: 'bg-emerald-500/15 text-emerald-400',
  Inactive: 'bg-slate-500/15 text-slate-400',
  'Under Maintenance': 'bg-amber-500/15 text-amber-400',
};

function toFacilityStatus(value?: string | null) {
  if (value === 'Active') return 'ACTIVE';
  if (value === 'Inactive') return 'INACTIVE';
  if (value === 'Under Maintenance') return 'MAINTENANCE';
  return value ?? 'ACTIVE';
}

function toCsv(value?: string[]) {
  return value?.join(', ') ?? '';
}

function stringifySchedule(value: any) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

function parseSchedule(value?: string) {
  if (!value?.trim()) return undefined;
  return JSON.parse(value);
}

function facilityInitialValues(facility: Facility): FacilityFormValues {
  return {
    name: facility.name ?? '',
    typeId: facility.typeId ?? '',
    locationId: facility.locationId ?? '',
    departmentId: facility.departmentId ?? '',
    managerId: facility.managerId ?? '',
    status: toFacilityStatus(facility.status),
    description: facility.description ?? '',
    capacity: facility.capacity ? String(facility.capacity) : '',
    bookingPolicy: facility.bookingPolicy ?? 'EXCLUSIVE',
    openTime: facility.openTime ?? '',
    closeTime: facility.closeTime ?? '',
    baseRate: facility.baseRate ? String(facility.baseRate) : '',
    rateUnit: facility.rateUnit ?? '',
    requiresApproval: Boolean(facility.requiresApproval),
    minDurationMins: facility.minDurationMins ? String(facility.minDurationMins) : '',
    maxDurationMins: facility.maxDurationMins ? String(facility.maxDurationMins) : '',
    images: toCsv(facility.images),
    amenities: toCsv(facility.amenities),
    operatingSchedule: stringifySchedule(facility.operatingSchedule),
  };
}

// ─── Tab: Facility List ───────────────────────────────────────────────────────
function FacilityListTab() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [showAdd, setShowAdd] = useState(false);
  const [editingFacility, setEditingFacility] = useState<Facility | null>(null);
  const [detailsFacility, setDetailsFacility] = useState<Facility | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Facility | null>(null);

  const debouncedSearch = useDebounce(search, 400);
  const resetPage = () => setPage(1);

  const { data, isLoading } = useFacilities({
    search: debouncedSearch || undefined,
    page,
    limit,
  });
  const createFacility = useCreateFacility();
  const updateFacility = useUpdateFacility(editingFacility?.id ?? '');
  const deleteFacility = useDeleteFacility();
  const { data: typeData } = useFacilityTypes({ page: 1, limit: 200 });
  const { data: locationData } = useFacilityLocations({ page: 1, limit: 200 });
  const { data: departmentData } = useFacilityDepartments({ page: 1, limit: 200 });
  const { data: staffData } = useStaffAll();

  const facilities = data?.facilities ?? [];
  const types = typeData?.types ?? [];
  const locations = locationData?.locations ?? [];
  const departments = departmentData?.departments ?? [];
  const staff = staffData ?? [];

  const typeOptions = types.map((t) => ({ value: t.id, label: t.name }));
  const locationOptions = locations.map((l) => ({ value: l.id, label: l.name }));
  const departmentOptions = departments.map((d) => ({ value: d.id, label: d.name }));
  const managerOptions = staff.map((s) => ({
    value: s.id,
    label: `${s.firstName} ${s.lastName}`.trim(),
  }));

  const isSubmitting = createFacility.isPending || updateFacility.isPending;

  const buildFacilityPayload = (values: FacilityFormValues) => {
    const typeLabel = typeOptions.find((t) => t.value === values.typeId)?.label ?? '';
    const amenities = values.amenities
      ? values.amenities
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : undefined;
    const images = values.images
      ? values.images
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : undefined;
    const operatingSchedule = parseSchedule(values.operatingSchedule);

    return {
      name: values.name.trim(),
      type: typeLabel,
      description: values.description?.trim() || undefined,
      capacity: values.capacity ? Number(values.capacity) : undefined,
      bookingPolicy: values.bookingPolicy ?? 'EXCLUSIVE',
      status: values.status || undefined,
      openTime: values.openTime?.trim() || undefined,
      closeTime: values.closeTime?.trim() || undefined,
      operatingSchedule,
      baseRate: values.baseRate ? Number(values.baseRate) : undefined,
      rateUnit: values.rateUnit || undefined,
      requiresApproval: Boolean(values.requiresApproval),
      minDurationMins: values.minDurationMins ? Number(values.minDurationMins) : undefined,
      maxDurationMins: values.maxDurationMins ? Number(values.maxDurationMins) : undefined,
      images,
      amenities,
      typeId: values.typeId || undefined,
      locationId: values.locationId || undefined,
      departmentId: values.departmentId || undefined,
      managerId: values.managerId || '',
    };
  };

  const handleCreate = async (values: FacilityFormValues) => {
    await createFacility.mutateAsync(buildFacilityPayload(values));
    setShowAdd(false);
  };

  const handleUpdate = async (values: FacilityFormValues) => {
    if (!editingFacility) return;
    await updateFacility.mutateAsync(buildFacilityPayload(values));
    setEditingFacility(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteFacility.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
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
            <div className="flex items-center gap-2 bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2 w-72">
              <Search size={14} className="text-slate-500 shrink-0" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search facilities..."
                className="bg-transparent text-sm text-slate-300 placeholder:text-slate-600 outline-none flex-1"
              />
            </div>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            <Plus size={15} /> Add Facility
          </button>
        </div>
        <div className="bg-[#161b27] border border-[#1e2536] rounded-xl overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="border-b border-[#1e2536] bg-[#0f1117]/50">
              <tr>
                {[
                  '#',
                  'Facility Name',
                  'Type',
                  'Capacity',
                  'Location',
                  'Status',
                  'Inspections',
                  'Manager',
                  'Description',
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
              {facilities.length === 0 && (
                <tr className="border-b border-[#1e2536] last:border-0 text-center">
                  <td colSpan={10} className="px-4 py-3 text-sm text-slate-500">
                    {isLoading ? 'Loading facilities…' : 'No facilities found'}
                  </td>
                </tr>
              )}
              {facilities.map((f, i) => (
                <tr
                  key={f.id}
                  className="border-b border-[#1e2536] last:border-0 hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-4 py-3 text-sm text-slate-500">
                    {(page - 1) * (data?.meta.per_page ?? limit) + i + 1}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-blue-400 hover:text-blue-300 cursor-pointer whitespace-nowrap">
                    {f.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-400 whitespace-nowrap">
                    {f.type ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-400 text-center">
                    {f.capacity ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                    {f.location ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap ${
                        statusStyle[f.status as FacilityStatus]
                      }`}
                    >
                      {f.status ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-slate-400 flex items-center gap-1 whitespace-nowrap">
                      <Eye size={11} className="text-slate-600" /> {f.inspections}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                    {f.manager ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 max-w-[160px] truncate">
                    {f.description ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 whitespace-nowrap">
                      <button
                        onClick={() => setDetailsFacility(f)}
                        className="text-xs bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 px-2 py-1 rounded-lg transition-colors font-medium"
                      >
                        Details
                      </button>
                      <button
                        onClick={() => setEditingFacility(f)}
                        className="text-xs bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 px-2 py-1 rounded-lg transition-colors font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteTarget(f)}
                        className="text-xs bg-red-500/15 text-red-400 hover:bg-red-500/25 px-2 py-1 rounded-lg transition-colors font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data?.meta && facilities.length > 0 && (
          <Pagination meta={data.meta} currentPage={page} handlePageChange={setPage} />
        )}
      </div>

      <ManageFacilityModal
        isOpen={showAdd}
        title="Add Facility"
        onClose={() => setShowAdd(false)}
        typeOptions={typeOptions}
        locationOptions={locationOptions}
        departmentOptions={departmentOptions}
        managerOptions={managerOptions}
        isSubmitting={isSubmitting}
        onSubmit={handleCreate}
      />
      <ManageFacilityModal
        isOpen={Boolean(editingFacility)}
        title="Edit Facility"
        onClose={() => setEditingFacility(null)}
        typeOptions={typeOptions}
        locationOptions={locationOptions}
        departmentOptions={departmentOptions}
        managerOptions={managerOptions}
        isSubmitting={isSubmitting}
        initialValues={editingFacility ? facilityInitialValues(editingFacility) : undefined}
        onSubmit={handleUpdate}
      />
      <FacilityDetailsModal facility={detailsFacility} onClose={() => setDetailsFacility(null)} />
      <DeleteConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete Facility"
        description={`Delete ${deleteTarget?.name ?? 'this facility'}? Facilities with bookings, inspections, complaints, requisitions or maintenance activity cannot be deleted.`}
        isDeleting={deleteFacility.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </>
  );
}

export default FacilityListTab;
