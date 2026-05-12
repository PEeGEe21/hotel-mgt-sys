import { useEffect, useMemo, useState } from 'react';
import { type UserAccount } from '@/hooks/useUserAccounts';
import { type Department } from '@/hooks/useDepartments';
import { type JobTitle } from '@/hooks/useJobTitles';
import { Role } from '@hotel-os/shared-types';
import { X } from 'lucide-react';
import { Dialog, DialogContent, DialogOverlay, DialogTitle } from '@/components/ui/dialog';

const roles: Role[] = [
  'SUPER_ADMIN',
  'ADMIN',
  'MANAGER',
  'RECEPTIONIST',
  'HOUSEKEEPING',
  'CASHIER',
  'COOK',
  'BARTENDER',
  'STAFF',
];

function ManageAccountModal({
  isOpen,
  account,
  onClose,
  onSave,
  departments,
  jobTitles,
}: {
  isOpen: boolean;
  account?: UserAccount | null;
  onClose: () => void;
  onSave: (payload: {
    email: string;
    password?: string;
    role: string;
    firstName: string;
    lastName: string;
    department: string;
    departmentId: string;
    position: string;
    jobTitleId?: string;
    employeeCode: string;
  }) => void;
  departments: Department[];
  jobTitles: JobTitle[];
}) {
  const resolveDepartmentId = (departmentName?: string | null) =>
    departments.find((department) => department.name === departmentName)?.id ?? '';

  const [form, setForm] = useState({
    firstName: account?.firstName ?? '',
    lastName: account?.lastName ?? '',
    email: account?.email ?? '',
    role: account?.role ?? 'STAFF',
    departmentId: resolveDepartmentId(account?.department),
    position: account?.position ?? '',
    jobTitleId: account?.jobTitleId ?? '',
    employeeCode: account?.employeeCode ?? '',
    password: '',
  });

  useEffect(() => {
    setForm({
      firstName: account?.firstName ?? '',
      lastName: account?.lastName ?? '',
      email: account?.email ?? '',
      role: account?.role ?? 'STAFF',
      departmentId: resolveDepartmentId(account?.department),
      position: account?.position ?? '',
      jobTitleId: account?.jobTitleId ?? '',
      employeeCode: account?.employeeCode ?? '',
      password: '',
    });
  }, [account, departments]);

  const update = (key: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const visibleJobTitles = useMemo(
    () =>
      form.departmentId
        ? jobTitles.filter((jobTitle) => !jobTitle.departmentId || jobTitle.departmentId === form.departmentId)
        : jobTitles,
    [jobTitles, form.departmentId],
  );

  const handleDepartmentChange = (departmentId: string) => {
    setForm((current) => ({
      ...current,
      departmentId,
      jobTitleId:
        current.jobTitleId &&
        jobTitles.some(
          (jobTitle) =>
            jobTitle.id === current.jobTitleId &&
            (!departmentId || !jobTitle.departmentId || jobTitle.departmentId === departmentId),
        )
          ? current.jobTitleId
          : '',
    }));
  };

  const handleJobTitleChange = (jobTitleId: string) => {
    const selectedJobTitle = jobTitles.find((jobTitle) => jobTitle.id === jobTitleId);
    setForm((current) => ({
      ...current,
      jobTitleId,
      departmentId: selectedJobTitle?.departmentId || current.departmentId,
      position: selectedJobTitle?.name || current.position,
    }));
  };

  const selectedDepartment = departments.find((department) => department.id === form.departmentId);

  const canSave =
    form.firstName &&
    form.lastName &&
    form.email &&
    form.role &&
    form.departmentId &&
    form.position &&
    form.employeeCode &&
    (account ? true : form.password);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogOverlay className="bg-black/70 backdrop-blur-sm" />
      <DialogContent
        showCloseButton={false}
        className="bg-[#161b27] border border-[#1e2536] ring-0 !outline-none rounded-2xl w-full max-w-xl  sm:max-w-3xl shadow-2xl p-6"
      >
        <DialogTitle className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">
            {account ? 'Edit User Account' : 'Create User Account'}
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
            <X size={18} />
          </button>
        </DialogTitle>

        <div className="space-y-4">
          {[
            { label: 'First Name', key: 'firstName', placeholder: 'Jane' },
            { label: 'Last Name', key: 'lastName', placeholder: 'Doe' },
            { label: 'Email', key: 'email', placeholder: 'work email address', type: 'email' },
            { label: 'Position', key: 'position', placeholder: 'Receptionist' },
            { label: 'Employee Code', key: 'employeeCode', placeholder: 'EMP-001' },
          ].map(({ label, key, placeholder, type }) => (
            <div key={label}>
              <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
                {label}
              </label>
              <input
                type={type ?? 'text'}
                value={(form as any)[key]}
                onChange={(e) => update(key as any, e.target.value)}
                placeholder={placeholder}
                className="h-12 w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          ))}
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
              Department
            </label>
            <select
              value={form.departmentId}
              onChange={(e) => handleDepartmentChange(e.target.value)}
              className="h-12 w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500 transition-colors"
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
              value={form.jobTitleId}
              onChange={(e) => handleJobTitleChange(e.target.value)}
              className="h-12 w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500 transition-colors"
            >
              <option value="">Select job title</option>
              {visibleJobTitles.map((jobTitle) => (
                <option key={jobTitle.id} value={jobTitle.id}>
                  {jobTitle.name}
                  {jobTitle.departmentName ? ` · ${jobTitle.departmentName}` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
              Position
            </label>
            <input
              type="text"
              value={form.position}
              onChange={(e) => update('position', e.target.value)}
              readOnly={!!form.jobTitleId}
              placeholder="Receptionist"
              className="h-12 w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-blue-500 transition-colors read-only:opacity-80"
            />
            <p className="mt-1 text-xs text-slate-500">
              {form.jobTitleId
                ? 'Position is synced from the selected job title.'
                : selectedDepartment
                  ? `Selected department: ${selectedDepartment.name}`
                  : 'You can type a position if a job title has not been configured yet.'}
            </p>
          </div>
          {!account && (
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
                Temporary Password
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => update('password', e.target.value)}
                placeholder="Will be changed on first login"
                className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          )}
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-2 block">
              Assign Role
            </label>
            <div className="flex flex-wrap gap-2">
              {roles.map((r) => (
                <button
                  key={r}
                  onClick={() => update('role', r)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    form.role === r
                      ? 'bg-blue-600/20 border-blue-500/30 text-blue-400'
                      : 'bg-[#0f1117] border-[#1e2536] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button
            onClick={onClose}
            className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg py-2.5 text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() =>
              canSave &&
              onSave({
                ...form,
                department: selectedDepartment?.name || '',
                jobTitleId: form.jobTitleId || undefined,
              })
            }
            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg py-2.5 text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={!canSave}
          >
            {account ? 'Save Changes' : 'Create Account'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ManageAccountModal;
