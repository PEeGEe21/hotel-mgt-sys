import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Dialog, DialogContent, DialogOverlay, DialogTitle } from '@/components/ui/dialog';

type Option = { value: string; label: string };

export type FacilityFormValues = {
  name: string;
  typeId?: string;
  locationId?: string;
  departmentId?: string;
  managerId?: string;
  status?: string;
  description?: string;
  capacity?: string;
  openTime?: string;
  closeTime?: string;
  baseRate?: string;
  rateUnit?: string;
  requiresApproval?: boolean;
  minDurationMins?: string;
  maxDurationMins?: string;
  images?: string;
  amenities?: string;
  operatingSchedule?: string;
};

function ManageFacilityModal({
  isOpen,
  title,
  onClose,
  onSubmit,
  typeOptions,
  locationOptions,
  departmentOptions,
  managerOptions,
  isSubmitting,
  initialValues,
}: {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  onSubmit: (values: FacilityFormValues) => void;
  typeOptions: Option[];
  locationOptions: Option[];
  departmentOptions: Option[];
  managerOptions: Option[];
  isSubmitting?: boolean;
  initialValues?: FacilityFormValues;
}) {
  const [values, setValues] = useState<FacilityFormValues>({
    name: '',
    typeId: '',
    locationId: '',
    departmentId: '',
    managerId: '',
    status: 'ACTIVE',
    description: '',
    capacity: '',
    openTime: '',
    closeTime: '',
    baseRate: '',
    rateUnit: '',
    requiresApproval: false,
    minDurationMins: '',
    maxDurationMins: '',
    images: '',
    amenities: '',
    operatingSchedule: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setValues({
      name: initialValues?.name ?? '',
      typeId: initialValues?.typeId ?? '',
      locationId: initialValues?.locationId ?? '',
      departmentId: initialValues?.departmentId ?? '',
      managerId: initialValues?.managerId ?? '',
      status: initialValues?.status ?? 'ACTIVE',
      description: initialValues?.description ?? '',
      capacity: initialValues?.capacity ?? '',
      openTime: initialValues?.openTime ?? '',
      closeTime: initialValues?.closeTime ?? '',
      baseRate: initialValues?.baseRate ?? '',
      rateUnit: initialValues?.rateUnit ?? '',
      requiresApproval: initialValues?.requiresApproval ?? false,
      minDurationMins: initialValues?.minDurationMins ?? '',
      maxDurationMins: initialValues?.maxDurationMins ?? '',
      images: initialValues?.images ?? '',
      amenities: initialValues?.amenities ?? '',
      operatingSchedule: initialValues?.operatingSchedule ?? '',
    });
    setError('');
  }, [isOpen, initialValues]);

  const handleSubmit = () => {
    if (!values.name.trim()) {
      setError('Facility name is required.');
      return;
    }
    if (!values.typeId) {
      setError('Facility type is required.');
      return;
    }
    if (!values.managerId) {
      setError('Manager is required.');
      return;
    }
    if (values.capacity && Number(values.capacity) < 0) {
      setError('Capacity cannot be negative.');
      return;
    }
    if (values.baseRate && Number(values.baseRate) < 0) {
      setError('Base rate cannot be negative.');
      return;
    }
    if (values.minDurationMins && Number(values.minDurationMins) < 0) {
      setError('Minimum duration cannot be negative.');
      return;
    }
    if (values.maxDurationMins && Number(values.maxDurationMins) < 0) {
      setError('Maximum duration cannot be negative.');
      return;
    }
    if (
      values.minDurationMins &&
      values.maxDurationMins &&
      Number(values.minDurationMins) > Number(values.maxDurationMins)
    ) {
      setError('Minimum duration cannot be greater than maximum duration.');
      return;
    }
    if (values.operatingSchedule?.trim()) {
      try {
        JSON.parse(values.operatingSchedule);
      } catch {
        setError('Operating schedule must be valid JSON.');
        return;
      }
    }

    setError('');
    onSubmit(values);
  };

  const inputCls =
    'w-full h-14 bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-blue-500 transition-colors';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogOverlay className="bg-black/70 backdrop-blur-sm" />
      <DialogContent
        showCloseButton={false}
        className="bg-[#161b27] border border-[#1e2536] ring-0 !outline-none rounded-2xl w-full max-w-xl  sm:max-w-3xl shadow-2xl p-6"
      >
        <DialogTitle className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
            <X size={18} />
          </button>
        </DialogTitle>

        <div className="grid grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto pr-1">
          <div className="col-span-2">
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
              Facility Name
            </label>
            <input
              autoFocus
              placeholder="e.g. Conference Hall B"
              value={values.name}
              onChange={(e) => setValues((p) => ({ ...p, name: e.target.value }))}
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
              Facility Type
            </label>
            <select
              value={values.typeId}
              onChange={(e) => setValues((p) => ({ ...p, typeId: e.target.value }))}
              className={inputCls}
            >
              <option value="">Select type</option>
              {typeOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
              Manager
            </label>
            <select
              value={values.managerId}
              onChange={(e) => setValues((p) => ({ ...p, managerId: e.target.value }))}
              className={inputCls}
            >
              <option value="">Select manager</option>
              {managerOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
              Location
            </label>
            <select
              value={values.locationId}
              onChange={(e) => setValues((p) => ({ ...p, locationId: e.target.value }))}
              className={inputCls}
            >
              <option value="">Select location</option>
              {locationOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
              Department
            </label>
            <select
              value={values.departmentId}
              onChange={(e) => setValues((p) => ({ ...p, departmentId: e.target.value }))}
              className={inputCls}
            >
              <option value="">Select department</option>
              {departmentOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
              Status
            </label>
            <select
              value={values.status}
              onChange={(e) => setValues((p) => ({ ...p, status: e.target.value }))}
              className={inputCls}
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="MAINTENANCE">Under Maintenance</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
              Capacity
            </label>
            <input
              type="number"
              placeholder="e.g. 120"
              value={values.capacity}
              onChange={(e) => setValues((p) => ({ ...p, capacity: e.target.value }))}
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
              Open Time
            </label>
            <input
              placeholder="e.g. 08:00"
              type='time'
              value={values.openTime}
              onChange={(e) => setValues((p) => ({ ...p, openTime: e.target.value }))}
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
              Close Time
            </label>
            <input
              placeholder="e.g. 22:00"
              type='time'
              value={values.closeTime}
              onChange={(e) => setValues((p) => ({ ...p, closeTime: e.target.value }))}
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
              Base Rate
            </label>
            <input
              type="number"
              placeholder="e.g. 15000"
              value={values.baseRate}
              onChange={(e) => setValues((p) => ({ ...p, baseRate: e.target.value }))}
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
              Rate Unit
            </label>
            <select
              value={values.rateUnit}
              onChange={(e) => setValues((p) => ({ ...p, rateUnit: e.target.value }))}
              className={inputCls}
            >
              <option value="">Select unit</option>
              <option value="PER_HOUR">Per Hour</option>
              <option value="PER_SESSION">Per Session</option>
              <option value="PER_DAY">Per Day</option>
              <option value="FLAT">Flat</option>
            </select>
          </div>
          <div className="col-span-2 flex items-center gap-2">
            <input
              id="requires-approval"
              type="checkbox"
              checked={Boolean(values.requiresApproval)}
              onChange={(e) => setValues((p) => ({ ...p, requiresApproval: e.target.checked }))}
            />
            <label
              htmlFor="requires-approval"
              className="text-sm text-slate-300"
            >
              Requires approval
            </label>
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
              Min Duration (mins)
            </label>
            <input
              type="number"
              placeholder="e.g. 30"
              value={values.minDurationMins}
              onChange={(e) => setValues((p) => ({ ...p, minDurationMins: e.target.value }))}
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
              Max Duration (mins)
            </label>
            <input
              type="number"
              placeholder="e.g. 240"
              value={values.maxDurationMins}
              onChange={(e) => setValues((p) => ({ ...p, maxDurationMins: e.target.value }))}
              className={inputCls}
            />
          </div>
          <div className="col-span-2">
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
              Amenities (comma separated)
            </label>
            <input
              placeholder="e.g. Projector, Whiteboard, AC"
              value={values.amenities}
              onChange={(e) => setValues((p) => ({ ...p, amenities: e.target.value }))}
              className={inputCls}
            />
          </div>
          <div className="col-span-2">
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
              Images (comma separated URLs)
            </label>
            <input
              placeholder="e.g. https://... , https://..."
              value={values.images}
              onChange={(e) => setValues((p) => ({ ...p, images: e.target.value }))}
              className={inputCls}
            />
          </div>
          <div className="col-span-2">
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
              Operating Schedule (JSON)
            </label>
            <textarea
              placeholder='{"mon":"08:00-18:00"}'
              value={values.operatingSchedule}
              onChange={(e) => setValues((p) => ({ ...p, operatingSchedule: e.target.value }))}
              className={`${inputCls} min-h-[90px]`}
            />
          </div>
          <div className="col-span-2">
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
              Description
            </label>
            <input
              placeholder="Brief description"
              value={values.description}
              onChange={(e) => setValues((p) => ({ ...p, description: e.target.value }))}
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

export default ManageFacilityModal;
