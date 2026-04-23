import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Dialog, DialogContent, DialogOverlay, DialogTitle } from '@/components/ui/dialog';

type Option = { value: string; label: string };

export type ComplaintFormValues = {
  title: string;
  facilityId?: string;
  reporterType: 'STAFF' | 'GUEST';
  reporterId?: string;
  channel: string;
  priority: string;
  category: string;
  description: string;
};

function ManageFacilityComplaintModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  facilityOptions,
  staffOptions,
  guestOptions,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: ComplaintFormValues) => void;
  isSubmitting?: boolean;
  facilityOptions: Option[];
  staffOptions: Option[];
  guestOptions: Option[];
}) {
  const [values, setValues] = useState<ComplaintFormValues>({
    title: '',
    facilityId: '',
    reporterType: 'STAFF',
    reporterId: '',
    channel: 'IN_PERSON',
    priority: 'NORMAL',
    category: '',
    description: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setValues({
      title: '',
      facilityId: '',
      reporterType: 'STAFF',
      reporterId: '',
      channel: 'IN_PERSON',
      priority: 'NORMAL',
      category: '',
      description: '',
    });
    setError('');
  }, [isOpen]);

  const reporterOptions = values.reporterType === 'STAFF' ? staffOptions : guestOptions;

  const handleSubmit = () => {
    if (!values.title.trim()) return setError('Title is required.');
    if (!values.reporterType) return setError('Reporter type is required.');
    if (!values.reporterId) return setError('Reported by is required.');
    if (!values.channel) return setError('Channel is required.');
    if (!values.priority) return setError('Priority is required.');
    if (!values.category.trim()) return setError('Category is required.');
    if (!values.description.trim()) return setError('Description is required.');
    setError('');
    onSubmit(values);
  };

  const inputCls =
    'w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-blue-500 transition-colors';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogOverlay className="bg-black/70 backdrop-blur-sm" />
      <DialogContent
        showCloseButton={false}
        className="bg-[#161b27] border border-[#1e2536] ring-0 !outline-none rounded-2xl w-full max-w-xl shadow-2xl p-6"
      >
        <DialogTitle className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">Log Complaint</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
            <X size={18} />
          </button>
        </DialogTitle>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
              Complaint Title
            </label>
            <input
              autoFocus
              placeholder="Brief title"
              value={values.title}
              onChange={(e) => setValues((p) => ({ ...p, title: e.target.value }))}
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
              Facility
            </label>
            <select
              value={values.facilityId}
              onChange={(e) => setValues((p) => ({ ...p, facilityId: e.target.value }))}
              className={inputCls}
            >
              <option value="">Select facility</option>
              {facilityOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
              Reporter Type
            </label>
            <select
              value={values.reporterType}
              onChange={(e) =>
                setValues((p) => ({ ...p, reporterType: e.target.value as 'STAFF' | 'GUEST' }))
              }
              className={inputCls}
            >
              <option value="STAFF">Staff</option>
              <option value="GUEST">Guest</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
              Reported By
            </label>
            <select
              value={values.reporterId}
              onChange={(e) => setValues((p) => ({ ...p, reporterId: e.target.value }))}
              className={inputCls}
            >
              <option value="">Select reporter</option>
              {reporterOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
              Channel
            </label>
            <select
              value={values.channel}
              onChange={(e) => setValues((p) => ({ ...p, channel: e.target.value }))}
              className={inputCls}
            >
              <option value="IN_PERSON">In Person</option>
              <option value="PHONE">Phone</option>
              <option value="EMAIL">Email</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
              Priority
            </label>
            <select
              value={values.priority}
              onChange={(e) => setValues((p) => ({ ...p, priority: e.target.value }))}
              className={inputCls}
            >
              <option value="LOW">Low</option>
              <option value="NORMAL">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
              Category
            </label>
            <input
              placeholder="e.g. Electrical, Plumbing"
              value={values.category}
              onChange={(e) => setValues((p) => ({ ...p, category: e.target.value }))}
              className={inputCls}
            />
          </div>
          <div className="col-span-2">
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
              Description
            </label>
            <textarea
              placeholder="Full description of the issue"
              value={values.description}
              onChange={(e) => setValues((p) => ({ ...p, description: e.target.value }))}
              className={`${inputCls} min-h-[90px]`}
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
            {isSubmitting ? 'Saving...' : 'Submit'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ManageFacilityComplaintModal;
