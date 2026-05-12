import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogOverlay, DialogTitle } from '@/components/ui/dialog';
import { type Department } from '@/hooks/useDepartments';
import { type JobTitle } from '@/hooks/useJobTitles';
import { X } from 'lucide-react';
import { ApiStaff } from '@/hooks/staff/useStaff';
import { useCreateHrContract } from '@/hooks/hr/useHrContracts';
import { CreateFormState } from '@/types/hr/contracts.type';
import { buildDefaultForm } from '@/utils/hr/contracts-utils';
import { TYPE_OPTIONS } from '@/lib/hr/contracts.lib';

function ManageStaffContractModal({
  isOpen,
  onClose,
  departments,
  jobTitles,
  staff,
}: {
  isOpen: boolean;
  onClose: () => void;
  departments: Department[];
  jobTitles: JobTitle[];
  staff: ApiStaff[];
}) {
  const [createForm, setCreateForm] = useState<CreateFormState>(buildDefaultForm());
  const createContract = useCreateHrContract();
  const selectedStaff = useMemo(
    () => staff.find((member) => member.id === createForm.staffId) || null,
    [staff, createForm.staffId],
  );

  useEffect(() => {
    if (!isOpen) {
      setCreateForm(buildDefaultForm());
    }
  }, [isOpen]);

  const handleStaffChange = (staffId: string) => {
    const found = staff.find((member) => member.id === staffId);
    const matchingDepartment = departments.find(
      (department) => department.name === found?.department,
    );
    const matchingJobTitle =
      (found?.jobTitleId && jobTitles.find((jobTitle) => jobTitle.id === found.jobTitleId)) ||
      jobTitles.find((jobTitle) => jobTitle.name === found?.position);
    setCreateForm((current) => ({
      ...current,
      staffId,
      departmentId: matchingDepartment?.id || current.departmentId,
      jobTitleId: matchingJobTitle?.id || current.jobTitleId,
      positionTitle: found?.position || current.positionTitle,
      salary: found?.salary ? String(found.salary) : current.salary,
    }));
  };

  const visibleCreateJobTitles = createForm.departmentId
    ? jobTitles.filter(
        (jobTitle) => !jobTitle.departmentId || jobTitle.departmentId === createForm.departmentId,
      )
    : jobTitles;

  const handleCreate = async (status: 'DRAFT' | 'ACTIVE') => {
    await createContract.mutateAsync({
      staffId: createForm.staffId,
      departmentId: createForm.departmentId || undefined,
      positionTitle: createForm.positionTitle,
      type: createForm.type,
      startDate: createForm.startDate,
      endDate: createForm.endDate || undefined,
      salary: Number(createForm.salary || 0),
      currency: createForm.currency || 'NGN',
      probationEndDate: createForm.probationEndDate || undefined,
      notes: createForm.notes || undefined,
      status,
    });
    setCreateForm(buildDefaultForm());
    onClose();
  };

  const closeModal = () => {
    setCreateForm(buildDefaultForm());
    onClose();
  };

  const handleCreateJobTitleChange = (jobTitleId: string) => {
    const selected = jobTitles.find((jobTitle) => jobTitle.id === jobTitleId);
    setCreateForm((current) => ({
      ...current,
      jobTitleId,
      departmentId: selected?.departmentId || current.departmentId,
      positionTitle: selected?.name || current.positionTitle,
    }));
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && closeModal()}>
        <DialogOverlay className="bg-black/70 backdrop-blur-sm" />
        <DialogContent
          showCloseButton={false}
          className="bg-[#161b27] border border-[#1e2536] ring-0 !outline-none rounded-2xl w-full max-w-xl  sm:max-w-3xl shadow-2xl p-6"
        >
          <DialogTitle className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-white">New Contract</h2>
            <button onClick={closeModal} className="text-slate-500 hover:text-slate-300">
              <X size={18} />
            </button>
          </DialogTitle>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
                Staff Member
              </label>
              <select
                value={createForm.staffId}
                onChange={(event) => handleStaffChange(event.target.value)}
                className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500"
              >
                <option value="">Select staff member</option>
                {staff.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.firstName} {member.lastName} · {member.employeeCode}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
                Department
              </label>
              <select
                value={createForm.departmentId}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    departmentId: event.target.value,
                    jobTitleId:
                      current.jobTitleId &&
                      jobTitles.some(
                        (jobTitle) =>
                          jobTitle.id === current.jobTitleId &&
                          (!event.target.value ||
                            !jobTitle.departmentId ||
                            jobTitle.departmentId === event.target.value),
                      )
                        ? current.jobTitleId
                        : '',
                  }))
                }
                className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500"
              >
                <option value="">Select department</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
                Job Title
              </label>
              <select
                value={createForm.jobTitleId}
                onChange={(event) => handleCreateJobTitleChange(event.target.value)}
                className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500"
              >
                <option value="">Select job title</option>
                {visibleCreateJobTitles.map((jobTitle) => (
                  <option key={jobTitle.id} value={jobTitle.id}>
                    {jobTitle.name}
                    {jobTitle.departmentName ? ` · ${jobTitle.departmentName}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
                Position Snapshot
              </label>
              <input
                value={createForm.positionTitle}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, positionTitle: event.target.value }))
                }
                readOnly={!!createForm.jobTitleId}
                placeholder="Job title"
                className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-blue-500 read-only:opacity-80"
              />
            </div>

            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
                Contract Type
              </label>
              <select
                value={createForm.type}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, type: event.target.value }))
                }
                className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500"
              >
                {TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
                Monthly Salary
              </label>
              <input
                type="number"
                min="0"
                value={createForm.salary}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, salary: event.target.value }))
                }
                placeholder="0"
                className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
                Start Date
              </label>
              <input
                type="date"
                value={createForm.startDate}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, startDate: event.target.value }))
                }
                className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
                End Date
              </label>
              <input
                type="date"
                value={createForm.endDate}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, endDate: event.target.value }))
                }
                className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500"
              />
            </div>

            <div className="col-span-2">
              <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
                Notes
              </label>
              <textarea
                rows={3}
                value={createForm.notes}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, notes: event.target.value }))
                }
                placeholder={
                  selectedStaff
                    ? `Creating contract for ${selectedStaff.firstName} ${selectedStaff.lastName}`
                    : 'Add notes'
                }
                className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-5">
            <button
              onClick={closeModal}
              className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg py-2.5 text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => handleCreate('DRAFT')}
              disabled={
                createContract.isPending ||
                !createForm.staffId ||
                !createForm.positionTitle ||
                !createForm.startDate ||
                !createForm.salary
              }
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white rounded-lg py-2.5 text-sm font-semibold transition-colors disabled:opacity-60"
            >
              {createContract.isPending ? 'Saving…' : 'Save Draft'}
            </button>
            <button
              onClick={() => handleCreate('ACTIVE')}
              disabled={
                createContract.isPending ||
                !createForm.staffId ||
                !createForm.positionTitle ||
                !createForm.startDate ||
                !createForm.salary
              }
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg py-2.5 text-sm font-semibold transition-colors disabled:opacity-60"
            >
              {createContract.isPending ? 'Creating…' : 'Activate Contract'}
            </button>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Hotels with stricter contract-document rules may require you to save this as a draft
            first, then finish documents and approvals from the contract details screen.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default ManageStaffContractModal;
