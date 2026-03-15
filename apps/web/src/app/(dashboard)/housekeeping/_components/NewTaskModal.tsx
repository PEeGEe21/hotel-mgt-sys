'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, Loader2, Flag } from 'lucide-react';
import {
  useCreateTask,
  useHKStaff,
  type TaskPriority,
  type TaskType,
} from '@/hooks/useHousekeeping';
import { useFloors } from '@/hooks/useFloors';
import { useRooms } from '@/hooks/useRooms';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogOverlay,
  DialogTitle,
} from '@/components/ui/dialog';

const TASK_TYPES: { value: TaskType; label: string; color: string }[] = [
  { value: 'CLEANING', label: 'Cleaning', color: 'text-sky-400' },
  { value: 'TURNDOWN', label: 'Turndown', color: 'text-violet-400' },
  { value: 'INSPECTION', label: 'Inspection', color: 'text-amber-400' },
  { value: 'MAINTENANCE', label: 'Maintenance', color: 'text-red-400' },
  { value: 'AMENITY', label: 'Amenity', color: 'text-emerald-400' },
];

const PRIORITIES: { value: TaskPriority; label: string; color: string; bg: string }[] = [
  { value: 'LOW', label: 'Low', color: 'text-slate-500', bg: 'bg-slate-500/10' },
  { value: 'NORMAL', label: 'Normal', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { value: 'HIGH', label: 'High', color: 'text-orange-400', bg: 'bg-orange-500/10' },
  { value: 'URGENT', label: 'Urgent', color: 'text-red-400', bg: 'bg-red-500/15' },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  prefillRoomId?: string;
}

export default function NewTaskModal({ isOpen, onClose, prefillRoomId }: Props) {
  const createTask = useCreateTask();
  const { data: staff = [] } = useHKStaff();
  const { data: floors = [] } = useFloors();

  const [form, setForm] = useState({
    roomId: prefillRoomId ?? '',
    type: 'CLEANING' as TaskType,
    priority: 'NORMAL' as TaskPriority,
    assignedTo: '',
    notes: '',
    dueBy: '',
    floorId: '',
  });
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setForm({
        roomId: prefillRoomId ?? '',
        type: 'CLEANING',
        priority: 'NORMAL',
        assignedTo: '',
        notes: '',
        dueBy: '',
        floorId: '',
      });
      setError('');
    }
  }, [isOpen, prefillRoomId]);

  useEffect(() => {
    if (!isOpen) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [isOpen, onClose]);

  // Fetch rooms for selected floor
  const { data: roomsData } = useRooms({ floorId: form.floorId || undefined, limit: 100 });
  const rooms = roomsData?.rooms ?? [];

  const handleSave = async () => {
    if (!form.roomId) return setError('Please select a room.');
    setError('');
    try {
      let dueISO: string | undefined;

      if (form.dueBy) {
        const [h, m] = form.dueBy.split(':');
        const d = new Date();
        d.setHours(Number(h), Number(m), 0, 0);
        dueISO = d.toISOString();
      }

      await createTask.mutateAsync({
        roomId: form.roomId,
        type: form.type,
        priority: form.priority,
        assignedTo: form.assignedTo || undefined,
        notes: form.notes || undefined,
        dueBy: dueISO,
      });
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Could not create task.');
    }
  };

  if (!mounted || !isOpen) return null;

  const sel =
    'h-11 w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500 transition-colors';

  return createPortal(
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogOverlay className="bg-black/70 backdrop-blur-sm" />
      <DialogContent
        showCloseButton={false}
        className="bg-[#161b27] border border-[#1e2536] rounded-2xl w-full max-w-lg sm:max-w-xl shadow-2xl overflow-hidden p-6"
      >
        {/* Header */}
        <DialogHeader className="flex flex-row items-center justify-between pt-3 pb-4 border-b border-[#1e2536]">
          <DialogTitle className="text-base font-bold text-white">New Task</DialogTitle>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            <X size={18} />
          </button>
        </DialogHeader>

        <div className="pt-2 pb-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Room selection */}
          {!prefillRoomId && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
                  Floor
                </label>
                <select
                  value={form.floorId}
                  onChange={(e) => setForm((f) => ({ ...f, floorId: e.target.value, roomId: '' }))}
                  className={sel}
                >
                  <option value="">All floors</option>
                  {floors.map((fl) => (
                    <option key={fl.id} value={fl.id}>
                      {fl.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
                  Room *
                </label>
                <select
                  value={form.roomId}
                  onChange={(e) => setForm((f) => ({ ...f, roomId: e.target.value }))}
                  className={sel}
                >
                  <option value="">Select room…</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      Room {r.number} ({r.status})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Task type */}
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-2 block">
              Task Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {TASK_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setForm((f) => ({ ...f, type: t.value }))}
                  className={`h-12 py-2 px-3 rounded-lg text-xs font-medium border transition-all text-center ${form.type === t.value ? `bg-slate-700 border-slate-500 ${t.color}` : 'bg-[#0f1117] border-[#1e2536] text-slate-500 hover:text-slate-300'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-2 block">
              Priority
            </label>
            <div className="flex gap-2">
              {PRIORITIES.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setForm((f) => ({ ...f, priority: p.value }))}
                  className={`h-12 flex-1 py-2 rounded-lg text-xs font-medium border transition-all flex items-center justify-center gap-1 ${form.priority === p.value ? `${p.bg} ${p.color} border-current` : 'bg-[#0f1117] border-[#1e2536] text-slate-500 hover:text-slate-300'}`}
                >
                  {p.value === 'URGENT' && <Flag size={9} />}
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Due by */}
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
              Due By
            </label>
            <input
              type="time"
              value={form.dueBy}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  dueBy: e.target.value,
                }))
              }
              className={sel + ' [color-scheme:dark]'}
            />
          </div>

          {/* Assign to */}
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
              Assign To
            </label>
            <select
              value={form.assignedTo}
              onChange={(e) => setForm((f) => ({ ...f, assignedTo: e.target.value }))}
              className={sel}
            >
              <option value="">Unassigned</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.firstName} {s.lastName} ({s.tasks.length} active)
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
              Notes
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2}
              placeholder="e.g. Guest checked out. Deep clean required."
              className={sel + ' !h-auto resize-none'}
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 pb-3 pt-4 border-t border-[#1e2536]">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg border border-[#1e2536] text-slate-400 text-sm hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={createTask.isPending}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
          >
            {createTask.isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Check size={14} />
            )}
            Create Task
          </button>
        </div>
      </DialogContent>
    </Dialog>,
    document.body,
  );
}
