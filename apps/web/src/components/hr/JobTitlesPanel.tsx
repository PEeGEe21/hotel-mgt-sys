'use client';

import { useMemo, useState } from 'react';
import { BriefcaseBusiness, Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useDepartments } from '@/hooks/useDepartments';
import {
  type JobTitle,
  useCreateJobTitle,
  useDeleteJobTitle,
  useJobTitles,
  useUpdateJobTitle,
} from '@/hooks/useJobTitles';

const colorOptions = [
  'bg-cyan-500',
  'bg-blue-500',
  'bg-violet-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-rose-500',
  'bg-slate-500',
];

function JobTitleModal({
  jobTitle,
  onClose,
  onSave,
}: {
  jobTitle?: JobTitle;
  onClose: () => void;
  onSave: (payload: {
    name: string;
    description?: string;
    departmentId?: string;
    color?: string;
  }) => void;
}) {
  const { data: departments = [] } = useDepartments();
  const [name, setName] = useState(jobTitle?.name ?? '');
  const [description, setDescription] = useState(jobTitle?.description ?? '');
  const [departmentId, setDepartmentId] = useState(jobTitle?.departmentId ?? '');
  const [color, setColor] = useState(jobTitle?.color ?? 'bg-cyan-500');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-[#1e2536] bg-[#161b27] p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">
            {jobTitle ? 'Edit Job Title' : 'New Job Title'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-500 transition-colors hover:text-slate-300"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
              Job Title
            </label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Front Office Supervisor"
              className="w-full rounded-lg border border-[#1e2536] bg-[#0f1117] px-3 py-2.5 text-sm text-slate-200 outline-none transition-colors placeholder:text-slate-600 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
              Department
            </label>
            <select
              value={departmentId}
              onChange={(event) => setDepartmentId(event.target.value)}
              className="w-full rounded-lg border border-[#1e2536] bg-[#0f1117] px-3 py-2.5 text-sm text-slate-200 outline-none transition-colors focus:border-blue-500"
            >
              <option value="">Any department</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
              Description
            </label>
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Optional context for this title"
              className="w-full rounded-lg border border-[#1e2536] bg-[#0f1117] px-3 py-2.5 text-sm text-slate-200 outline-none transition-colors placeholder:text-slate-600 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
              Color
            </label>
            <div className="flex flex-wrap gap-2">
              {colorOptions.map((option) => (
                <button
                  key={option}
                  onClick={() => setColor(option)}
                  className={`flex h-7 w-7 items-center justify-center rounded-lg ${option} transition-transform hover:scale-110`}
                >
                  {color === option ? <Check size={13} className="text-white" /> : null}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg bg-white/5 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            onClick={() =>
              name.trim() &&
              onSave({
                name,
                description,
                departmentId: departmentId || undefined,
                color,
              })
            }
            className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default function JobTitlesPanel() {
  const [modal, setModal] = useState<{ open: boolean; jobTitle?: JobTitle }>({ open: false });
  const { data: jobTitles = [], isLoading } = useJobTitles();
  const createJobTitle = useCreateJobTitle();
  const updateJobTitle = useUpdateJobTitle(modal.jobTitle?.id ?? '');
  const deleteJobTitle = useDeleteJobTitle();

  const grouped = useMemo(() => {
    return [...jobTitles].sort(
      (left, right) =>
        left.departmentName.localeCompare(right.departmentName) || left.name.localeCompare(right.name),
    );
  }, [jobTitles]);

  const handleSave = async (payload: {
    name: string;
    description?: string;
    departmentId?: string;
    color?: string;
  }) => {
    try {
      if (modal.jobTitle) {
        await updateJobTitle.mutateAsync(payload);
      } else {
        await createJobTitle.mutateAsync(payload);
      }
      setModal({ open: false });
    } catch {
      // handled by toast
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this job title?')) return;
    try {
      await deleteJobTitle.mutateAsync(id);
    } catch {
      // handled by toast
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">Job Titles</h3>
          <p className="mt-1 text-sm text-slate-500">
            Keep reusable role titles tied to staff profiles and contract flows.
          </p>
        </div>
        <button
          onClick={() => setModal({ open: true })}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
        >
          <Plus size={15} /> New Job Title
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#1e2536] bg-[#161b27]">
        <div className="divide-y divide-[#1e2536]">
          {isLoading ? (
            <div className="px-5 py-10 text-center text-sm text-slate-500">Loading job titles…</div>
          ) : grouped.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-slate-500">
              No job titles yet
            </div>
          ) : (
            grouped.map((jobTitle) => (
              <div
                key={jobTitle.id}
                className="flex items-center justify-between px-5 py-4 transition-colors hover:bg-white/[0.02]"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${jobTitle.color}`}
                  >
                    <BriefcaseBusiness size={16} className="text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-200">{jobTitle.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {jobTitle.departmentName || 'All departments'}
                      {jobTitle.description ? ` · ${jobTitle.description}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="hidden text-right sm:block">
                    <p className="text-sm font-bold text-white">{jobTitle.staffCount}</p>
                    <p className="text-xs text-slate-500">staff</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setModal({ open: true, jobTitle })}
                      className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-blue-500/10 hover:text-blue-400"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => void handleDelete(jobTitle.id)}
                      className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {modal.open ? (
        <JobTitleModal
          jobTitle={modal.jobTitle}
          onClose={() => setModal({ open: false })}
          onSave={handleSave}
        />
      ) : null}
    </div>
  );
}
