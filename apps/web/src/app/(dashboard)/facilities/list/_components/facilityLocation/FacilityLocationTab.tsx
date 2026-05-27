'use client';

import { useState } from 'react';
import { Plus, Search, Pencil, Trash2, Eye, MapPin, Layers, Users } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import Pagination from '@/components/ui/pagination';
import {
  useCreateFacilityLocation,
  useDeleteFacilityLocation,
  useFacilityLocations,
  useUpdateFacilityLocation,
} from '@/hooks/facility/useFacilityLocation';
import ManageFacilityLocationModal from './ManageFacilityLocationModal';
import DeleteConfirmModal from '../DeleteConfirmModal';

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
        <div className="bg-[#161b27] border border-[#1e2536] rounded-xl overflow-x-auto !whitespace-nowrap">
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
    </>
  );
}

export default FacilityLocationsTab;
