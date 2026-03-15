// ─── Task Drawer ──────────────────────────────────────────────────────────────
'use client';

import { useState } from 'react';
import { Sparkles, X, Save, Loader2 } from 'lucide-react';
import {
  useHKStaff,
  useUpdateTask,
  useMarkDone,
  useAssignTask,
  type HKTask,
  type TaskStatus,
  type TaskPriority,
} from '@/hooks/useHousekeeping';
import { createPortal } from 'react-dom';
import { PRIORITY_CONFIG, STATUS_CONFIG, TYPE_CONFIG } from '@/lib/housekeeping-data';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function TaskDrawer({
  isOpen,
  task,
  onClose,
}: {
  isOpen: boolean;
  task: HKTask;
  onClose: () => void;
}) {
  const update = useUpdateTask(task.id);
  const markDone = useMarkDone(task.id);
  const assign = useAssignTask(task.id);
  const { data: staff = [] } = useHKStaff();

  const [form, setForm] = useState({
    status: task.status,
    priority: task.priority,
    assignedTo: task.staff?.id ?? task.assignedTo ?? '',
    notes: task.notes ?? '',
  });

  const handleSave = async () => {
    if (form.status === 'DONE' && task.status !== 'DONE') {
      await markDone.mutateAsync();
    } else {
      await update.mutateAsync({
        status: form.status,
        priority: form.priority,
        notes: form.notes || undefined,
      });
    }
    if (form.assignedTo !== (task.staff?.id ?? task.assignedTo ?? '')) {
      await assign.mutateAsync(form.assignedTo || null);
    }
    onClose();
  };

  const tc = TYPE_CONFIG[task.type] ?? TYPE_CONFIG.CLEANING;
  const sel =
    'h-12 w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500 transition-colors';
  const busy = update.isPending || markDone.isPending || assign.isPending;

  return createPortal(
    <Drawer open={isOpen} onOpenChange={() => onClose()} direction="right">
      <DrawerOverlay className="bg-black/50 backdrop-blur-sm data-[state=open]:animate-fadeIn" />
      <DrawerContent
        className="w-full max-w-xl sm:!max-w-xl bg-[#161b27] border-l border-[#1e2536] h-full flex flex-col"
      >
        <DialogHeader className="flex flex-row items-center justify-between px-5 py-4 border-b border-[#1e2536]">
          <div className="flex items-center gap-2 text-left">
            <Sparkles size={16} className="text-violet-400" />
            <DialogTitle className="text-base font-bold text-white">Room {task.room.number}</DialogTitle>
            <span className={`text-xs px-2 py-0.5 rounded-full ${tc.bg} ${tc.color}`}>
              {tc.label}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            <X size={18} />
          </button>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Status */}
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-2 block">
              Status
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(STATUS_CONFIG) as TaskStatus[]).map((s) => {
                const c = STATUS_CONFIG[s];
                return (
                  <button
                    key={s}
                    onClick={() => setForm((f) => ({ ...f, status: s }))}
                    className={`h-12 py-2 rounded-lg text-xs font-medium border transition-all flex items-center justify-center gap-1.5 ${form.status === s ? `${c.bg} ${c.color} ${c.border}` : 'bg-[#0f1117] border-[#1e2536] text-slate-500 hover:text-slate-300'}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-2 block">
              Priority
            </label>
            <div className="flex gap-2">
              {(Object.entries(PRIORITY_CONFIG) as [TaskPriority, any][]).map(([p, c]) => (
                <button
                  key={p}
                  onClick={() => setForm((f) => ({ ...f, priority: p }))}
                  className={`h-12 flex-1 py-2 rounded-lg text-xs font-medium border transition-all capitalize ${form.priority === p ? `${c.bg} ${c.color} border-current` : 'bg-[#0f1117] border-[#1e2536] text-slate-500 hover:text-slate-300'}`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Assign */}
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-2 block">
              Assigned To
            </label>
            <select
              value={form.assignedTo}
              onChange={(e) => setForm((f) => ({ ...f, assignedTo: e.target.value }))}
              className={sel}
            >
              <option value="">Unassigned</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.firstName} {s.lastName}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-2 block">
              Notes
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={3}
              placeholder="Task notes…"
              className={sel + ' !h-auto resize-none'}
            />
          </div>

          {/* Info */}
          <div className="bg-[#0f1117] rounded-xl p-4 space-y-2">
            {[
              ['Room', `Room ${task.room.number}`],
              ['Floor', task.room.floor?.name ?? '—'],
              ['Type', tc.label],
              [
                'Created',
                new Date(task.createdAt).toLocaleTimeString('en-NG', {
                  hour: '2-digit',
                  minute: '2-digit',
                }),
              ],
              [
                'Due By',
                task.dueBy
                  ? new Date(task.dueBy).toLocaleTimeString('en-NG', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '—',
              ],
              ...(task.completedAt
                ? [
                    [
                      'Completed',
                      new Date(task.completedAt).toLocaleTimeString('en-NG', {
                        hour: '2-digit',
                        minute: '2-digit',
                      }),
                    ],
                  ]
                : []),
            ].map(([l, v]) => (
              <div key={l} className="flex justify-between text-xs">
                <span className="text-slate-600">{l}</span>
                <span className="text-slate-400 font-medium">{v}</span>
              </div>
            ))}
          </div>
        </div>

        <DrawerFooter className="p-4 border-t border-[#1e2536]">
          <button
            onClick={handleSave}
            disabled={busy}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl py-3 text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save Changes
          </button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>,
    document.body,
  );
}
