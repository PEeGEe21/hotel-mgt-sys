import { TaskPriority, type TaskStatus } from '@/hooks/useHousekeeping';

// ─── Config ───────────────────────────────────────────────────────────────────
export const STATUS_CONFIG: Record<
  TaskStatus,
  { label: string; color: string; bg: string; border: string; dot: string }
> = {
  PENDING: {
    label: 'To Do',
    color: 'text-slate-400',
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/20',
    dot: 'bg-slate-500',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    dot: 'bg-blue-400',
  },
  DONE: {
    label: 'Done',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    dot: 'bg-emerald-400',
  },
  SKIPPED: {
    label: 'Skipped',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    dot: 'bg-red-400',
  },
};

export const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  CLEANING: { label: 'Cleaning', color: 'text-sky-400', bg: 'bg-sky-500/10' },
  TURNDOWN: { label: 'Turndown', color: 'text-violet-400', bg: 'bg-violet-500/10' },
  INSPECTION: { label: 'Inspection', color: 'text-amber-400', bg: 'bg-amber-500/10' },
  MAINTENANCE: { label: 'Maintenance', color: 'text-red-400', bg: 'bg-red-500/10' },
  AMENITY: { label: 'Amenity', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
};

export const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; bg: string }> = {
  LOW: { label: 'Low', color: 'text-slate-500', bg: 'bg-slate-500/10' },
  NORMAL: { label: 'Normal', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  HIGH: { label: 'High', color: 'text-orange-400', bg: 'bg-orange-500/10' },
  URGENT: { label: 'Urgent', color: 'text-red-400', bg: 'bg-red-500/15' },
};

export const KANBAN_COLS: TaskStatus[] = ['PENDING', 'IN_PROGRESS', 'DONE', 'SKIPPED'];

export const NEXT_STATUS: Partial<Record<TaskStatus, TaskStatus>> = {
  PENDING: 'IN_PROGRESS',
  IN_PROGRESS: 'DONE',
};
