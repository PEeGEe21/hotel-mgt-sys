import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  DrawerTitle,
} from '@/components/ui/drawer';
import {
  type Complaint,
  useUpdateFacilityComplaint,
} from '@/hooks/facility/useFacilityComplaint';
import { useCreateFacilityMaintenance } from '@/hooks/facility/useFacilityMaintenance';

type Option = { value: string; label: string };

const inputCls =
  'w-full rounded-lg border border-[#1e2536] bg-[#0f1117] px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none transition-colors focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-60';

const complaintStatuses = ['NEW', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const;
const complaintPriorities = ['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const;

function toDateTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
}

export default function ComplaintDrawer({
  isOpen,
  onClose,
  complaint,
  canManageComplaints,
  canCreateMaintenance,
  staffOptions,
}: {
  isOpen: boolean;
  onClose: () => void;
  complaint: Complaint | null;
  canManageComplaints: boolean;
  canCreateMaintenance: boolean;
  staffOptions: Option[];
}) {
  const updateComplaint = useUpdateFacilityComplaint(complaint?.id ?? '');
  const createMaintenance = useCreateFacilityMaintenance();

  const [values, setValues] = useState({
    title: '',
    category: '',
    priority: 'NORMAL',
    status: 'NEW',
    description: '',
  });
  const [maintenanceValues, setMaintenanceValues] = useState({
    assignedTo: '',
    estimatedMins: '',
    totalCost: '',
    notes: '',
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!complaint || !isOpen) return;
    setValues({
      title: complaint.title ?? '',
      category: complaint.category ?? '',
      priority: complaint.priority ?? 'NORMAL',
      status: complaint.status ?? 'NEW',
      description: complaint.description ?? '',
    });
    setMaintenanceValues({
      assignedTo: '',
      estimatedMins: '',
      totalCost: '',
      notes: '',
    });
    setError(null);
  }, [complaint, isOpen]);

  if (!complaint) return null;

  const savingComplaint = updateComplaint.isPending;
  const creatingMaintenance = createMaintenance.isPending;

  const handleSaveComplaint = async () => {
    if (!canManageComplaints) return;
    if (!values.title.trim()) {
      setError('Complaint title is required.');
      return;
    }
    if (!values.category.trim()) {
      setError('Complaint category is required.');
      return;
    }
    if (!values.description.trim()) {
      setError('Complaint description is required.');
      return;
    }

    const nextStatus = values.status;

    try {
      setError(null);
      await updateComplaint.mutateAsync({
        title: values.title.trim(),
        category: values.category.trim(),
        priority: values.priority,
        status: nextStatus,
        description: values.description.trim(),
        resolvedAt:
          nextStatus === 'RESOLVED' || nextStatus === 'CLOSED'
            ? complaint.resolvedAt ?? new Date().toISOString()
            : undefined,
      });
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? 'Failed to update complaint');
    }
  };

  const handleCreateMaintenance = async () => {
    if (!canCreateMaintenance || !canManageComplaints) return;
    if (complaint.maintenanceRequest?.id) {
      setError('This complaint is already linked to a maintenance request.');
      return;
    }
    if (!values.title.trim()) {
      setError('Complaint title is required before opening maintenance.');
      return;
    }
    if (!values.category.trim()) {
      setError('Complaint category is required before opening maintenance.');
      return;
    }
    if (!values.description.trim()) {
      setError('Complaint description is required before opening maintenance.');
      return;
    }

    try {
      setError(null);
      const request = await createMaintenance.mutateAsync({
        facilityId: complaint.facilityId ?? undefined,
        title: values.title.trim(),
        description: values.description.trim(),
        category: values.category.trim() || 'OTHER',
        priority: values.priority,
        assignedTo: maintenanceValues.assignedTo || undefined,
        estimatedMins: maintenanceValues.estimatedMins
          ? Number(maintenanceValues.estimatedMins)
          : undefined,
        totalCost: maintenanceValues.totalCost ? Number(maintenanceValues.totalCost) : undefined,
        notes: maintenanceValues.notes.trim() || undefined,
        status: maintenanceValues.assignedTo ? 'ASSIGNED' : 'OPEN',
      });

      await updateComplaint.mutateAsync({
        maintenanceRequestId: request.id,
        status: ['RESOLVED', 'CLOSED'].includes(values.status) ? values.status : 'IN_PROGRESS',
      });
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? 'Failed to open maintenance request');
    }
  };

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()} direction="right">
      <DrawerOverlay className="bg-black/50 backdrop-blur-sm data-[state=open]:animate-fadeIn" />
      <DrawerContent className="flex h-full w-full max-w-xl flex-col border-l border-[#1e2536] bg-[#161b27] sm:!max-w-xl">
        <DrawerHeader className="flex flex-row items-center justify-between border-b border-[#1e2536] px-5 py-4">
          <div>
            <DrawerTitle className="text-base font-bold text-white">Complaint Details</DrawerTitle>
            <p className="mt-1 text-xs text-slate-500">{complaint.complaintNo}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
            <X size={18} />
          </button>
        </DrawerHeader>

        <div className="flex-1 space-y-6 overflow-y-auto p-5">
          <div className="grid grid-cols-2 gap-4 rounded-xl border border-[#1e2536] bg-[#0f1117]/60 p-4">
            <div>
              <p className="text-xs text-slate-500">Facility</p>
              <p className="text-sm text-slate-200">{complaint.facility?.name ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Reporter</p>
              <p className="text-sm text-slate-200">
                {complaint.reporter ?? '—'}{' '}
                <span className="text-xs text-slate-500">({complaint.reporterType})</span>
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Channel</p>
              <p className="text-sm text-slate-200">{complaint.channel}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Created</p>
              <p className="text-sm text-slate-200">{toDateTime(complaint.createdAt)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Resolved</p>
              <p className="text-sm text-slate-200">{toDateTime(complaint.resolvedAt)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Maintenance Request</p>
              <p className="text-sm text-slate-200">
                {complaint.maintenanceRequest?.requestNo ?? '—'}
              </p>
            </div>
          </div>

          <div className="space-y-4 rounded-xl border border-[#1e2536] bg-[#0f1117]/60 p-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
                  Complaint Title
                </label>
                <input
                  value={values.title}
                  onChange={(e) => setValues((prev) => ({ ...prev, title: e.target.value }))}
                  disabled={!canManageComplaints || savingComplaint || creatingMaintenance}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
                  Status
                </label>
                <select
                  value={values.status}
                  onChange={(e) => setValues((prev) => ({ ...prev, status: e.target.value }))}
                  disabled={!canManageComplaints || savingComplaint || creatingMaintenance}
                  className={inputCls}
                >
                  {complaintStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
                  Priority
                </label>
                <select
                  value={values.priority}
                  onChange={(e) => setValues((prev) => ({ ...prev, priority: e.target.value }))}
                  disabled={!canManageComplaints || savingComplaint || creatingMaintenance}
                  className={inputCls}
                >
                  {complaintPriorities.map((priority) => (
                    <option key={priority} value={priority}>
                      {priority}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
                  Category
                </label>
                <input
                  value={values.category}
                  onChange={(e) => setValues((prev) => ({ ...prev, category: e.target.value }))}
                  disabled={!canManageComplaints || savingComplaint || creatingMaintenance}
                  className={inputCls}
                />
              </div>
              <div className="col-span-2">
                <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
                  Description
                </label>
                <textarea
                  value={values.description}
                  onChange={(e) =>
                    setValues((prev) => ({ ...prev, description: e.target.value }))
                  }
                  disabled={!canManageComplaints || savingComplaint || creatingMaintenance}
                  className={`${inputCls} min-h-[120px]`}
                />
              </div>
            </div>
            {canManageComplaints ? (
              <div className="flex justify-end">
                <button
                  onClick={handleSaveComplaint}
                  disabled={savingComplaint || creatingMaintenance}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingComplaint ? 'Saving...' : 'Save Complaint'}
                </button>
              </div>
            ) : null}
          </div>

          <div className="space-y-4 rounded-xl border border-[#1e2536] bg-[#0f1117]/60 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-white">Maintenance Follow-up</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Convert this complaint into a maintenance request and keep the records linked.
                </p>
              </div>
              {complaint.maintenanceRequest?.requestNo ? (
                <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
                  {complaint.maintenanceRequest.requestNo}
                </span>
              ) : null}
            </div>

            {complaint.maintenanceRequest?.id ? (
              <p className="text-sm text-slate-300">
                This complaint is already linked to maintenance request{' '}
                <span className="font-medium text-white">
                  {complaint.maintenanceRequest.requestNo}
                </span>
                .
              </p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
                      Assign To
                    </label>
                    <select
                      value={maintenanceValues.assignedTo}
                      onChange={(e) =>
                        setMaintenanceValues((prev) => ({
                          ...prev,
                          assignedTo: e.target.value,
                        }))
                      }
                      disabled={!canCreateMaintenance || creatingMaintenance || savingComplaint}
                      className={inputCls}
                    >
                      <option value="">Unassigned</option>
                      {staffOptions.map((staff) => (
                        <option key={staff.value} value={staff.value}>
                          {staff.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
                      Estimated Mins
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={maintenanceValues.estimatedMins}
                      onChange={(e) =>
                        setMaintenanceValues((prev) => ({
                          ...prev,
                          estimatedMins: e.target.value,
                        }))
                      }
                      disabled={!canCreateMaintenance || creatingMaintenance || savingComplaint}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
                      Estimated Cost (₦)
                    </label>p-5
                    <input
                      type="number"
                      min="0"
                      value={maintenanceValues.totalCost}
                      onChange={(e) =>
                        setMaintenanceValues((prev) => ({
                          ...prev,
                          totalCost: e.target.value,
                        }))
                      }
                      disabled={!canCreateMaintenance || creatingMaintenance || savingComplaint}
                      className={inputCls}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
                      Maintenance Notes
                    </label>
                    <textarea
                      value={maintenanceValues.notes}
                      onChange={(e) =>
                        setMaintenanceValues((prev) => ({
                          ...prev,
                          notes: e.target.value,
                        }))
                      }
                      disabled={!canCreateMaintenance || creatingMaintenance || savingComplaint}
                      className={`${inputCls} min-h-[100px]`}
                      placeholder="Optional notes for the maintenance team"
                    />
                  </div>
                </div>
                {canCreateMaintenance && canManageComplaints ? (
                  <div className="flex justify-end">
                    <button
                      onClick={handleCreateMaintenance}
                      disabled={creatingMaintenance || savingComplaint}
                      className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {creatingMaintenance ? 'Opening...' : 'Create Maintenance Request'}
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">
                    You need both complaint-management and maintenance-create permissions to open a
                    linked maintenance request from this complaint.
                  </p>
                )}
              </>
            )}
          </div>

          {error ? <p className="text-sm text-red-400">{error}</p> : null}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
