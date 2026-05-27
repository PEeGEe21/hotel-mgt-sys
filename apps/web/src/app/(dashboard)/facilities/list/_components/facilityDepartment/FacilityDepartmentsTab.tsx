'use client';

import { useState } from 'react';
import { Plus, Search, Pencil, Trash2, Users } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import {
  useCreateFacilityDepartment,
  useDeleteFacilityDepartment,
  useFacilityDepartments,
  useUpdateFacilityDepartment,
} from '@/hooks/facility/useFacilityDepartment';
import { useStaffAll } from '@/hooks/staff/useStaff';
import Pagination from '@/components/ui/pagination';
import ManageFacilityDepartmentModal from './ManageFacilityDepartmentModal';
import DeleteConfirmModal from '../DeleteConfirmModal';

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
        <div className="bg-[#161b27] border border-[#1e2536] rounded-xl overflow-x-auto !whitespace-nowrap">
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
      </div>
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
    </>
  );
}

export default FacilityDepartmentsTab;
