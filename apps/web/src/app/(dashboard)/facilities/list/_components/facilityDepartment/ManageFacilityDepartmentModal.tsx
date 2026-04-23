import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Dialog, DialogContent, DialogOverlay, DialogTitle } from '@/components/ui/dialog';

type FacilityDepartmentValues = {
  name: string;
  description?: string;
  headId?: string;
};

type StaffOption = {
  value: string;
  label: string;
};

function ManageFacilityDepartmentModal({
  isOpen,
  title,
  onClose,
  onSubmit,
  initialValues,
  staffOptions,
  isSubmitting,
}: {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  onSubmit: (values: FacilityDepartmentValues) => void;
  initialValues?: FacilityDepartmentValues;
  staffOptions: StaffOption[];
  isSubmitting?: boolean;
}) {
  const [values, setValues] = useState<FacilityDepartmentValues>({
    name: '',
    description: '',
    headId: '',
  });
  const [error, setError] = useState('');
  const [staffSearch, setStaffSearch] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setValues({
      name: initialValues?.name ?? '',
      description: initialValues?.description ?? '',
      headId: initialValues?.headId ?? '',
    });
    setError('');
    setStaffSearch('');
  }, [isOpen, initialValues?.name, initialValues?.description, initialValues?.headId]);

  const handleSubmit = () => {
    if (!values.name.trim()) {
      setError('Department name is required.');
      return;
    }
    setError('');
    onSubmit({
      name: values.name.trim(),
      description: values.description?.trim() || undefined,
      headId: values.headId || undefined,
    });
  };

  const inputCls =
    'w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-blue-500 transition-colors';

  const filteredStaff = staffOptions.filter((s) =>
    s.label.toLowerCase().includes(staffSearch.trim().toLowerCase()),
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogOverlay className="bg-black/70 backdrop-blur-sm" />
      <DialogContent
        showCloseButton={false}
        className="bg-[#161b27] border border-[#1e2536] ring-0 !outline-none rounded-2xl w-full max-w-md shadow-2xl p-6"
      >
        <DialogTitle className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
            <X size={18} />
          </button>
        </DialogTitle>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
              Department Name
            </label>
            <input
              autoFocus
              placeholder="e.g. IT"
              value={values.name}
              onChange={(e) => setValues((prev) => ({ ...prev, name: e.target.value }))}
              className={inputCls}
            />
          </div>
          <div className="col-span-2">
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
              Department Head
            </label>
            <select
              value={values.headId ?? ''}
              onChange={(e) => setValues((prev) => ({ ...prev, headId: e.target.value }))}
              className={inputCls}
            >
              <option value="">Select staff</option>
              {staffOptions.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
              Description
            </label>
            <input
              placeholder="Brief description"
              value={values.description ?? ''}
              onChange={(e) => setValues((prev) => ({ ...prev, description: e.target.value }))}
              className={inputCls}
            />
          </div>
        </div>

        {error && <p className="text-xs text-red-400 mt-3">{error}</p>}

        <div className="flex gap-3 mt-5">
          <button
            onClick={onClose}
            className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg py-2.5 text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-lg py-2.5 text-sm font-semibold transition-colors"
          >
            {isSubmitting ? 'Saving...' : 'Save'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ManageFacilityDepartmentModal;
