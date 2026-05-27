'use client';

import { useState } from 'react';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import {
  useCreateFacilityType,
  useDeleteFacilityType,
  useFacilityTypes,
  useUpdateFacilityType,
} from '@/hooks/facility/useFacilityType';
import Pagination from '@/components/ui/pagination';
import ManageFacilityTypeModal from './ManageFacilityTypeModal';
import DeleteConfirmModal from '../DeleteConfirmModal';

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
        <div className="bg-[#161b27] border border-[#1e2536] rounded-xl overflow-x-auto !whitespace-nowrap">
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
    </>
  );
}

export default FacilityTypesTab;
