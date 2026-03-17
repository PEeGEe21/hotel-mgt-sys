import { CheckCircle2, XCircle, AlertCircle, Timer, Calendar } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
export type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Half Day' | 'Leave' | 'Holiday';

export type StaffRecord = {
  id: string;
  name: string;
  department: string;
  position: string;
  clockIn?: string;
  clockOut?: string;
  status: AttendanceStatus;
  hoursWorked?: number;
  method?: string;
  note?: string;
};

export type HistoryEntry = {
  date: string;
  clockIn?: string;
  clockOut?: string;
  status: AttendanceStatus;
  hours?: number;
  note?: string;
};

// ─── Status config ────────────────────────────────────────────────────────────
export const STATUS_CONFIG: Record<
  AttendanceStatus,
  { color: string; bg: string; border: string; icon: any }
> = {
  Present: {
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/15',
    border: 'border-emerald-500/30',
    icon: CheckCircle2,
  },
  Late: {
    color: 'text-amber-400',
    bg: 'bg-amber-500/15',
    border: 'border-amber-500/30',
    icon: AlertCircle,
  },
  Absent: {
    color: 'text-red-400',
    bg: 'bg-red-500/15',
    border: 'border-red-500/30',
    icon: XCircle,
  },
  'Half Day': {
    color: 'text-sky-400',
    bg: 'bg-sky-500/15',
    border: 'border-sky-500/30',
    icon: Timer,
  },
  Leave: {
    color: 'text-violet-400',
    bg: 'bg-violet-500/15',
    border: 'border-violet-500/30',
    icon: Calendar,
  },
  Holiday: {
    color: 'text-slate-400',
    bg: 'bg-slate-500/15',
    border: 'border-slate-500/30',
    icon: Calendar,
  },
};
