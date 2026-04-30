'use client';

import { useState } from 'react';
import { Building2, Plus, Search, Pencil, Trash2, Eye, MapPin, Layers, Users } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import {
  Facility,
  useCreateFacility,
  useDeleteFacility,
  useFacilities,
  useUpdateFacility,
} from '@/hooks/facility/useFacility';
import {
  useCreateFacilityType,
  useDeleteFacilityType,
  useFacilityTypes,
  useUpdateFacilityType,
} from '@/hooks/facility/useFacilityType';
import {
  useCreateFacilityDepartment,
  useDeleteFacilityDepartment,
  useFacilityDepartments,
  useUpdateFacilityDepartment,
} from '@/hooks/facility/useFacilityDepartment';
import { useStaffAll } from '@/hooks/staff/useStaff';
import Pagination from '@/components/ui/pagination';
import ManageFacilityTypeModal from './_components/facilityType/ManageFacilityTypeModal';
import {
  useCreateFacilityLocation,
  useDeleteFacilityLocation,
  useFacilityLocations,
  useUpdateFacilityLocation,
} from '@/hooks/facility/useFacilityLocation';
import ManageFacilityLocationModal from './_components/facilityLocation/ManageFacilityLocationModal';
import ManageFacilityDepartmentModal from './_components/facilityDepartment/ManageFacilityDepartmentModal';
import ManageFacilityModal, {
  type FacilityFormValues,
} from './_components/facility/ManageFacilityModal';
import DeleteConfirmModal from './_components/DeleteConfirmModal';
import FacilityDetailsModal from './_components/facility/FacilityDetailsModal';

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
                <td className="px-4 py-3 text-sm text-slate-400 text-center">{f.capacity ?? '—'}</td>
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
    </div>
  );
}

// ─── Tab: Types ───────────────────────────────────────────────────────────────
function FacilityTypesTab() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  const debouncedSearch = useDebounce(search, 400);
  const resetPage = () => setPage(1);

  const { data, isLoading, isFetching } = useFacilityTypes({
    search: debouncedSearch || undefined,
    page,
    limit,
  });
  const createType = useCreateFacilityType();
  const updateType = useUpdateFacilityType(editingType?.id ?? '');
  const deleteType = useDeleteFacilityType();

  const types = data?.types ?? [];

  const handleOpenCreate = () => {
    setEditingType(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (type: any) => {
    setEditingType(type);
    setIsModalOpen(true);
  };

  const handleSubmit = async (values: { name: string; description?: string }) => {
    if (editingType?.id) {
      await updateType.mutateAsync(values);
    } else {
      await createType.mutateAsync(values);
    }
    setIsModalOpen(false);
    setEditingType(null);
  };

  const isSubmitting = createType.isPending || updateType.isPending;
  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteType.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
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
              placeholder="Search facility types..."
              className="bg-transparent text-sm text-slate-300 placeholder:text-slate-600 outline-none flex-1"
            />
          </div>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
        >
          <Plus size={15} /> Add Type
        </button>
      </div>
      <div className="bg-[#161b27] border border-[#1e2536] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-[#1e2536] bg-[#0f1117]/50">
            <tr>
              {['#', 'Type Name', 'Description', 'Facilities', ''].map((h) => (
                <th
                  key={h}
                  className="text-xs text-slate-500 uppercase tracking-wider font-medium px-4 py-3 text-left"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {types.length === 0 && (
              <tr className="border-b border-[#1e2536] last:border-0 text-center">
                <td colSpan={5} className="px-4 py-3 text-sm text-slate-500">
                  No types found
                </td>
              </tr>
            )}
            {types.map((t, i) => (
              <tr
                key={t.id}
                className="border-b border-[#1e2536] last:border-0 hover:bg-white/[0.02] transition-colors"
              >
                <td className="px-4 py-3 text-sm text-slate-500">
                  {(page - 1) * (data?.meta.per_page ?? limit) + i + 1}
                </td>
                <td className="px-4 py-3 text-sm font-medium text-slate-200 capitalize">
                  {t.name}
                </td>
                <td className="px-4 py-3 text-sm text-slate-400">{t.description}</td>
                <td className="px-4 py-3 text-sm font-bold text-white">{t.facilitiesCount}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleOpenEdit(t)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(t)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {data?.meta && types.length > 0 && (
          <Pagination meta={data.meta} currentPage={page} handlePageChange={setPage} />
        )}
      </div>
      <ManageFacilityTypeModal
        isOpen={isModalOpen}
        title={editingType ? 'Edit Facility Type' : 'Add Facility Type'}
        onClose={() => {
          setIsModalOpen(false);
          setEditingType(null);
        }}
        initialValues={
          editingType
            ? { name: editingType.name ?? '', description: editingType.description ?? '' }
            : undefined
        }
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
      />
      <DeleteConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete Facility Type"
        description={`Delete ${deleteTarget?.name ?? 'this type'}? Types assigned to facilities cannot be deleted.`}
        isDeleting={deleteType.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}

// ─── Tab: Locations ───────────────────────────────────────────────────────────
function FacilityLocationsTab() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  const debouncedSearch = useDebounce(search, 400);
  const resetPage = () => setPage(1);

  const { data } = useFacilityLocations({
    search: debouncedSearch || undefined,
    page,
    limit,
  });
  const createLocation = useCreateFacilityLocation();
  const updateLocation = useUpdateFacilityLocation(editingLocation?.id ?? '');
  const deleteLocation = useDeleteFacilityLocation();

  const locations = data?.locations ?? [];

  const handleOpenCreate = () => {
    setEditingLocation(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (location: any) => {
    setEditingLocation(location);
    setIsModalOpen(true);
  };

  const handleSubmit = async (values: {
    name: string;
    description?: string;
    building: string;
    floor: string;
  }) => {
    if (editingLocation?.id) {
      await updateLocation.mutateAsync(values);
    } else {
      await createLocation.mutateAsync(values);
    }
    setIsModalOpen(false);
    setEditingLocation(null);
  };

  const isSubmitting = createLocation.isPending || updateLocation.isPending;
  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteLocation.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
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
              placeholder="Search facility locations..."
              className="bg-transparent text-sm text-slate-300 placeholder:text-slate-600 outline-none flex-1"
            />
          </div>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
        >
          <Plus size={15} /> Add Location
        </button>
      </div>
      <div className="bg-[#161b27] border border-[#1e2536] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-[#1e2536] bg-[#0f1117]/50">
            <tr>
              {['#', 'Location Name', 'Building', 'Floor', 'Facilities', ''].map((h) => (
                <th
                  key={h}
                  className="text-xs text-slate-500 uppercase tracking-wider font-medium px-4 py-3 text-left"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {locations.length === 0 && (
              <tr className="border-b border-[#1e2536] last:border-0 text-center">
                <td colSpan={6} className="px-4 py-3 text-sm text-slate-500">
                  No locations found
                </td>
              </tr>
            )}
            {locations.map((l, i) => (
              <tr
                key={l.id}
                className="border-b border-[#1e2536] last:border-0 hover:bg-white/[0.02] transition-colors"
              >
                <td className="px-4 py-3 text-sm text-slate-500">
                  {(page - 1) * (data?.meta.per_page ?? limit) + i + 1}
                </td>
                <td className="px-4 py-3 text-sm font-medium text-slate-200 flex items-center gap-1.5">
                  <MapPin size={12} className="text-slate-500 shrink-0" />
                  {l.name}
                </td>
                <td className="px-4 py-3 text-sm text-slate-400">{l.building}</td>
                <td className="px-4 py-3 text-sm text-slate-400">{l.floor}</td>
                <td className="px-4 py-3 text-sm font-bold text-white">{l.facilitiesCount}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleOpenEdit(l)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(l)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data?.meta && locations.length > 0 && (
          <Pagination meta={data.meta} currentPage={page} handlePageChange={setPage} />
        )}
      </div>
      <ManageFacilityLocationModal
        isOpen={isModalOpen}
        title={editingLocation ? 'Edit Facility Location' : 'Add Facility Location'}
        onClose={() => {
          setIsModalOpen(false);
          setEditingLocation(null);
        }}
        initialValues={
          editingLocation
            ? {
                name: editingLocation.name ?? '',
                description: editingLocation.description ?? '',
                building: editingLocation.building ?? '',
                floor: editingLocation.floor ?? '',
              }
            : undefined
        }
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
      />
      <DeleteConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete Facility Location"
        description={`Delete ${deleteTarget?.name ?? 'this location'}? Locations assigned to facilities cannot be deleted.`}
        isDeleting={deleteLocation.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}

// ─── Tab: Departments ─────────────────────────────────────────────────────────
function FacilityDepartmentsTab() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  const debouncedSearch = useDebounce(search, 400);
  const resetPage = () => setPage(1);

  const { data } = useFacilityDepartments({
    search: debouncedSearch || undefined,
    page,
    limit,
  });
  const { data: staff } = useStaffAll();
  const createDepartment = useCreateFacilityDepartment();
  const updateDepartment = useUpdateFacilityDepartment(editingDepartment?.id ?? '');
  const deleteDepartment = useDeleteFacilityDepartment();

  const departments = data?.departments ?? [];
  const staffOptions = staff?.map((s) => ({
    value: s.id,
    label: `${s.firstName} ${s.lastName}`.trim(),
  }));

  const handleOpenCreate = () => {
    setEditingDepartment(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (department: any) => {
    setEditingDepartment(department);
    setIsModalOpen(true);
  };

  const handleSubmit = async (values: { name: string; description?: string; headId?: string }) => {
    const payload = {
      name: values.name,
      description: values.description,
      headId: values.headId || undefined,
    };
    if (editingDepartment?.id) {
      await updateDepartment.mutateAsync(payload);
    } else {
      await createDepartment.mutateAsync(payload);
    }
    setIsModalOpen(false);
    setEditingDepartment(null);
  };

  const isSubmitting = createDepartment.isPending || updateDepartment.isPending;
  const isDeleting = deleteDepartment.isPending;
  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteDepartment.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };
  return (
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
              placeholder="Search facility departments..."
              className="bg-transparent text-sm text-slate-300 placeholder:text-slate-600 outline-none flex-1"
            />
          </div>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
        >
          <Plus size={15} /> Add Department
        </button>
      </div>
      <div className="bg-[#161b27] border border-[#1e2536] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-[#1e2536] bg-[#0f1117]/50">
            <tr>
              {['#', 'Department Name', 'Department Head', 'Facilities Managed', ''].map((h) => (
                <th
                  key={h}
                  className="text-xs text-slate-500 uppercase tracking-wider font-medium px-4 py-3 text-left"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {departments.length === 0 && (
              <tr className="border-b border-[#1e2536] last:border-0 text-center">
                <td colSpan={5} className="px-4 py-3 text-sm text-slate-500">
                  No departments found
                </td>
              </tr>
            )}
            {departments.map((d, i) => (
              <tr
                key={d.id}
                className="border-b border-[#1e2536] last:border-0 hover:bg-white/[0.02] transition-colors"
              >
                <td className="px-4 py-3 text-sm text-slate-500">
                  {(page - 1) * (data?.meta.per_page ?? limit) + i + 1}
                </td>
                <td className="px-4 py-3 text-sm font-medium text-slate-200 flex items-center gap-2">
                  <Users size={13} className="text-slate-500 shrink-0" />
                  {d.name}
                </td>
                <td className="px-4 py-3 text-sm text-slate-400">{d?.head?.name ?? '—'}</td>
                <td className="px-4 py-3 text-sm font-bold text-white">{d.facilitiesCount}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleOpenEdit(d)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(d)}
                      disabled={isDeleting}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data?.meta && departments.length > 0 && (
        <Pagination meta={data.meta} currentPage={page} handlePageChange={setPage} />
      )}
      <ManageFacilityDepartmentModal
        isOpen={isModalOpen}
        title={editingDepartment ? 'Edit Facility Department' : 'Add Facility Department'}
        onClose={() => {
          setIsModalOpen(false);
          setEditingDepartment(null);
        }}
        staffOptions={staffOptions ?? []}
        initialValues={
          editingDepartment
            ? {
                name: editingDepartment.name ?? '',
                description: editingDepartment.description ?? '',
                headId: editingDepartment.headId ?? '',
              }
            : undefined
        }
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
      />
      <DeleteConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete Facility Department"
        description={`Delete ${deleteTarget?.name ?? 'this department'}? Departments assigned to facilities cannot be deleted.`}
        isDeleting={isDeleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
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
    <div className="space-y-6">
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
  );
}
