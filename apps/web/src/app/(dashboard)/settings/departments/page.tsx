'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Pencil, Trash2, X, Building2, Check } from 'lucide-react';
import {
  useCreateDepartment,
  useDeleteDepartment,
  useDepartments,
  useUpdateDepartment,
  type Department,
} from '@/hooks/useDepartments';

const colorOptions = [
  'bg-blue-500', 'bg-violet-500', 'bg-emerald-500', 'bg-amber-500',
  'bg-orange-500', 'bg-pink-500', 'bg-sky-500', 'bg-red-500', 'bg-slate-500',
];

function DeptModal({ dept, onClose, onSave }: {
  dept?: Department;
  onClose: () => void;
  onSave: (d: Omit<Department, 'id' | 'headCount'>) => void;
}) {
  const [name, setName] = useState(dept?.name ?? '');
  const [description, setDescription] = useState(dept?.description ?? '');
  const [color, setColor] = useState(dept?.color ?? 'bg-blue-500');

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#161b27] border border-[#1e2536] rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">{dept ? 'Edit Department' : 'New Department'}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors"><X size={18} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">Department Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Kitchen, Spa, IT..."
              className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-blue-500 transition-colors" />
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">Description</label>
            <input value={description} onChange={e => setDescription(e.target.value)} placeholder="What does this department do?"
              className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-blue-500 transition-colors" />
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">Color</label>
            <div className="flex gap-2 flex-wrap">
              {colorOptions.map(c => (
                <button key={c} onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-lg ${c} flex items-center justify-center transition-transform hover:scale-110`}>
                  {color === c && <Check size={13} className="text-white" />}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg py-2.5 text-sm font-medium transition-colors">Cancel</button>
          <button onClick={() => name && onSave({ name, description, color })}
            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg py-2.5 text-sm font-semibold transition-colors">Save</button>
        </div>
      </div>
    </div>
  );
}

export default function DepartmentsPage() {
  const router = useRouter();
  const [modal, setModal] = useState<{ open: boolean; dept?: Department }>({ open: false });

  const { data: depts = [], isLoading } = useDepartments();
  const createDepartment = useCreateDepartment();
  const updateDepartment = useUpdateDepartment(modal.dept?.id ?? '');
  const deleteDepartment = useDeleteDepartment();

  const save = async (data: Omit<Department, 'id' | 'headCount'>) => {
    try {
      if (modal.dept) {
        await updateDepartment.mutateAsync(data);
      } else {
        await createDepartment.mutateAsync(data);
      }
      setModal({ open: false });
    } catch {
      // handled by toast
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this department?')) return;
    try {
      await deleteDepartment.mutateAsync(id);
    } catch {
      // handled by toast
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/settings')}
            className="w-9 h-9 rounded-lg bg-[#161b27] border border-[#1e2536] flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Departments</h1>
            <p className="text-slate-500 text-sm mt-0.5">{depts.length} departments</p>
          </div>
        </div>
        <button onClick={() => setModal({ open: true })}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
          <Plus size={15} /> New Department
        </button>
      </div>

      <div className="bg-[#161b27] border border-[#1e2536] rounded-xl overflow-hidden">
        <div className="divide-y divide-[#1e2536]">
          {isLoading ? (
            <div className="px-5 py-10 text-center text-slate-500 text-sm">Loading departments…</div>
          ) : depts.length === 0 ? (
            <div className="px-5 py-10 text-center text-slate-500 text-sm">No departments yet</div>
          ) : (
            depts.map(dept => (
              <div key={dept.id} className="flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl ${dept.color} flex items-center justify-center shrink-0`}>
                    <Building2 size={16} className="text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-200">{dept.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{dept.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-bold text-white">{dept.headCount}</p>
                    <p className="text-xs text-slate-500">staff</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setModal({ open: true, dept })}
                      className="p-2 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"><Pencil size={14} /></button>
                    <button onClick={() => remove(dept.id)}
                      className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {modal.open && <DeptModal dept={modal.dept} onClose={() => setModal({ open: false })} onSave={save} />}
    </div>
  );
}
