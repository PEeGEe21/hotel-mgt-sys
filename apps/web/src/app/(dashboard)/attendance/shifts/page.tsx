'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CalendarDays, Clock, Pencil, Plus, Trash2, X, Check, Loader2 } from 'lucide-react';
import { createPortal } from 'react-dom';
import {
  useCreateShiftOverride,
  useDeleteShiftOverride,
  useShiftOverrides,
  useShiftTemplates,
  useUpdateShiftOverride,
  type ShiftOverride,
  type ShiftOverrideInput,
} from '@/hooks/useShifts';
import { useStaffAll } from '@/hooks/staff/useStaff';

function fmtDate(value: string) {
  return new Date(value).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function ShiftOverrideModal({
  override,
  onClose,
}: {
  override?: ShiftOverride | null;
  onClose: () => void;
}) {
  const { data: staff = [] } = useStaffAll();
  const { data: shifts = [] } = useShiftTemplates();
  const createOverride = useCreateShiftOverride();
  const updateOverride = useUpdateShiftOverride(override?.id ?? '');
  const [form, setForm] = useState<ShiftOverrideInput>({
    staffId: override?.staffId ?? '',
    shiftTemplateId: override?.shiftTemplateId ?? '',
    isActive: override?.isActive ?? true,
    dateFrom: override?.dateFrom ? override.dateFrom.slice(0, 10) : new Date().toISOString().slice(0, 10),
    dateTo: override?.dateTo ? override.dateTo.slice(0, 10) : new Date().toISOString().slice(0, 10),
    reason: override?.reason ?? '',
  });
  const [error, setError] = useState('');

  const inputCls =
    'w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500 transition-colors';

  const handleSave = async () => {
    if (!form.staffId || !form.shiftTemplateId) {
      setError('Staff member and shift are required.');
      return;
    }
    if (form.dateTo < form.dateFrom) {
      setError('End date cannot be earlier than start date.');
      return;
    }
    setError('');
    try {
      if (override) {
        await updateOverride.mutateAsync(form);
      } else {
        await createOverride.mutateAsync(form);
      }
      onClose();
    } catch {}
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl rounded-2xl border border-[#1e2536] bg-[#161b27] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#1e2536] px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-white">
              {override ? 'Edit Shift Override' : 'New Shift Override'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Override the default shift for a staff member on specific dates.
            </p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-4 px-6 py-5">
          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
              Staff Member
            </label>
            <select
              value={form.staffId}
              onChange={(e) => setForm((current) => ({ ...current, staffId: e.target.value }))}
              className={inputCls}
            >
              <option value="">Select staff member…</option>
              {staff.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.firstName} {member.lastName} · {member.department}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
              Override Shift
            </label>
            <select
              value={form.shiftTemplateId}
              onChange={(e) =>
                setForm((current) => ({ ...current, shiftTemplateId: e.target.value }))
              }
              className={inputCls}
            >
              <option value="">Select shift…</option>
              {shifts.map((shift) => (
                <option key={shift.id} value={shift.id}>
                  {shift.name} · {shift.startTime} → {shift.endTime}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
                Start Date
              </label>
              <input
                type="date"
                value={form.dateFrom}
                onChange={(e) => setForm((current) => ({ ...current, dateFrom: e.target.value }))}
                className={inputCls + ' [color-scheme:dark]'}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
                End Date
              </label>
              <input
                type="date"
                value={form.dateTo}
                onChange={(e) => setForm((current) => ({ ...current, dateTo: e.target.value }))}
                className={inputCls + ' [color-scheme:dark]'}
              />
            </div>
          </div>
          <div className="rounded-xl border border-[#1e2536] bg-[#0f1117] px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-200 font-medium">Override active</p>
              <p className="text-xs text-slate-500 mt-1">
                Turn this off without deleting the scheduled override.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setForm((current) => ({ ...current, isActive: !current.isActive }))
              }
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                form.isActive
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                  : 'bg-slate-500/10 border-slate-500/20 text-slate-400'
              }`}
            >
              {form.isActive ? 'Active' : 'Inactive'}
            </button>
          </div>
          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
              Reason
            </label>
            <textarea
              value={form.reason ?? ''}
              onChange={(e) => setForm((current) => ({ ...current, reason: e.target.value }))}
              className={`${inputCls} min-h-24 resize-none`}
              placeholder="Optional context for this temporary change"
            />
          </div>
          {error ? (
            <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
              {error}
            </p>
          ) : null}
        </div>
        <div className="flex gap-3 border-t border-[#1e2536] px-6 py-4">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-[#1e2536] px-4 py-2.5 text-sm text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={createOverride.isPending || updateOverride.isPending}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {createOverride.isPending || updateOverride.isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Check size={14} />
            )}
            Save Override
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function ShiftOverrideRow({
  override,
  onEdit,
  onDelete,
}: {
  override: ShiftOverride;
  onEdit: (override: ShiftOverride) => void;
  onDelete: (id: string) => void;
}) {
  const updateOverride = useUpdateShiftOverride(override.id);

  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-slate-200">
            {override.staff.firstName} {override.staff.lastName}
          </p>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-500/15 text-slate-400">
            {override.staff.department}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400">
            {override.staff.employeeCode}
          </span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full border ${
              override.isActive
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
            }`}
          >
            {override.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Clock size={12} />
            {override.shiftTemplate.name} · {override.shiftTemplate.startTime} →{' '}
            {override.shiftTemplate.endTime}
          </span>
          <span className="flex items-center gap-1">
            <CalendarDays size={12} />
            {fmtDate(override.dateFrom)} to {fmtDate(override.dateTo)}
          </span>
        </div>
        {override.reason ? <p className="text-sm text-slate-400">{override.reason}</p> : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => updateOverride.mutate({ isActive: !override.isActive })}
          disabled={updateOverride.isPending}
          className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-50 ${
            override.isActive
              ? 'border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/15'
              : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/15'
          }`}
        >
          {updateOverride.isPending ? (
            <Loader2 size={12} className="animate-spin" />
          ) : override.isActive ? (
            <X size={12} />
          ) : (
            <Check size={12} />
          )}
          {override.isActive ? 'Deactivate' : 'Activate'}
        </button>
        <button
          onClick={() => onEdit(override)}
          className="inline-flex items-center gap-2 rounded-lg border border-[#1e2536] px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
        >
          <Pencil size={12} />
          Edit
        </button>
        <button
          onClick={() => onDelete(override.id)}
          className="inline-flex items-center gap-2 rounded-lg border border-red-500/20 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/10 transition-colors"
        >
          <Trash2 size={12} />
          Delete
        </button>
      </div>
    </div>
  );
}

export default function AttendanceShiftSchedulePage() {
  const today = new Date().toISOString().slice(0, 10);
  const [filterFrom, setFilterFrom] = useState(today);
  const [filterTo, setFilterTo] = useState(today);
  const [modalOverride, setModalOverride] = useState<ShiftOverride | null>(null);
  const [showModal, setShowModal] = useState(false);
  const { data: overrides = [], isLoading } = useShiftOverrides({
    dateFrom: filterFrom,
    dateTo: filterTo,
  });
  const removeOverride = useDeleteShiftOverride();

  const activeCount = overrides.length;
  const staffCount = useMemo(() => new Set(overrides.map((override) => override.staffId)).size, [overrides]);

  return (
    <>
      <div className="space-y-6 max-w-6xl">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/attendance"
              className="w-9 h-9 rounded-lg bg-[#161b27] border border-[#1e2536] flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors"
            >
              <ArrowLeft size={16} />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Shift Schedule</h1>
              <p className="text-slate-500 text-sm mt-0.5">
                Temporary overrides for days when staff should not follow their default shift.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setModalOverride(null);
              setShowModal(true);
            }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            <Plus size={15} /> New Override
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              label: 'Overrides',
              value: activeCount,
              color: 'text-blue-400',
              bg: 'bg-blue-500/10 border-blue-500/20',
            },
            {
              label: 'Affected Staff',
              value: staffCount,
              color: 'text-emerald-400',
              bg: 'bg-emerald-500/10 border-emerald-500/20',
            },
            {
              label: 'Window Start',
              value: fmtDate(filterFrom),
              color: 'text-amber-400',
              bg: 'bg-amber-500/10 border-amber-500/20',
            },
            {
              label: 'Window End',
              value: fmtDate(filterTo),
              color: 'text-violet-400',
              bg: 'bg-violet-500/10 border-violet-500/20',
            },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={`${bg} border rounded-xl px-4 py-4`}>
              <p className={`text-lg font-bold ${color}`}>{value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
              From
            </label>
            <input
              type="date"
              value={filterFrom}
              onChange={(e) => setFilterFrom(e.target.value)}
              className="rounded-lg border border-[#1e2536] bg-[#161b27] px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500 [color-scheme:dark]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-500">
              To
            </label>
            <input
              type="date"
              value={filterTo}
              onChange={(e) => setFilterTo(e.target.value)}
              className="rounded-lg border border-[#1e2536] bg-[#161b27] px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500 [color-scheme:dark]"
            />
          </div>
        </div>

        <div className="bg-[#161b27] border border-[#1e2536] rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="px-5 py-10 text-center text-slate-500 text-sm">Loading overrides…</div>
          ) : overrides.length === 0 ? (
            <div className="px-5 py-12 text-center text-slate-500 text-sm">
              No shift overrides in this date window.
            </div>
          ) : (
            <div className="divide-y divide-[#1e2536]">
              {overrides.map((override) => (
                <ShiftOverrideRow
                  key={override.id}
                  override={override}
                  onEdit={(item) => {
                    setModalOverride(item);
                    setShowModal(true);
                  }}
                  onDelete={(id) => removeOverride.mutate(id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal ? (
        <ShiftOverrideModal
          override={modalOverride}
          onClose={() => {
            setShowModal(false);
            setModalOverride(null);
          }}
        />
      ) : null}
    </>
  );
}
