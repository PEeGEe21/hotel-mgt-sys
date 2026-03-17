'use client';

import { useMemo, useState } from 'react';
import { Clock, LogIn, LogOut, Download, ChevronRight, ChevronLeft, X } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerOverlay,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { StaffRecord, STATUS_CONFIG } from '@/lib/attendance-data';
import { useAttendanceReport } from '@/hooks/useAttendance';
import StatusBadge from './StatusBadge';

// ─── Types ────────────────────────────────────────────────────────────────────

// ─── History Drawer ───────────────────────────────────────────────────────────
export default function HistoryDrawer({
  isOpen,
  staff,
  onClose,
}: {
  isOpen: boolean;
  staff: StaffRecord | null;
  onClose: () => void;
}) {
  const [monthCursor, setMonthCursor] = useState(() => new Date());
  const monthLabel = useMemo(
    () =>
      monthCursor.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      }),
    [monthCursor],
  );

  const monthRange = useMemo(() => {
    const start = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end };
  }, [monthCursor]);

  const { data: entries = [], isLoading, error } = useAttendanceReport({
    staffId: staff?.id,
    from: monthRange.start,
    to: monthRange.end,
    enabled: isOpen && !!staff,
  });

  const totalPresent = entries.filter((e) => e.status === 'Present' || e.status === 'Late').length;
  const totalHours = entries.reduce((s, e) => s + (e.hours ?? 0), 0);
  const errorMsg =
    (error as any)?.response?.data?.message ?? (error as any)?.message ?? '';

  return (
    <Drawer open={isOpen} onOpenChange={() => onClose()} direction="right">
      <DrawerOverlay className="bg-black/50 backdrop-blur-sm data-[state=open]:animate-fadeIn" />
      <DrawerContent className="w-full max-w-xl sm:!max-w-xl bg-[#161b27] border-l border-[#1e2536] h-full flex flex-col">
        {/* Header */}
        <DrawerHeader className="flex flex-row items-center justify-between px-5 py-4 border-b border-[#1e2536]">
          <DrawerTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500/30 to-violet-500/30 border border-white/10 flex items-center justify-center text-sm font-bold text-white shrink-0">
              {staff?.name
                .split(' ')
                .map((n) => n[0])
                .join('')}
            </div>
            <div>
              <p className="text-sm font-bold text-white">{staff?.name}</p>
              <p className="text-xs text-slate-500">
                {staff?.position} · {staff?.department}
              </p>
            </div>
          </DrawerTitle>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            <X size={18} />
          </button>
        </DrawerHeader>

        {/* Month header + stats */}
        <div className="px-5 py-4 border-b border-[#1e2536]">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() =>
                setMonthCursor(
                  (m) => new Date(m.getFullYear(), m.getMonth() - 1, 1, 0, 0, 0, 0),
                )
              }
              className="text-slate-500 hover:text-slate-300"
            >
              <ChevronLeft size={16} />
            </button>
            <p className="text-sm font-semibold text-white">{monthLabel}</p>
            <button
              onClick={() =>
                setMonthCursor(
                  (m) => new Date(m.getFullYear(), m.getMonth() + 1, 1, 0, 0, 0, 0),
                )
              }
              className="text-slate-500 hover:text-slate-300"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Days Present', value: totalPresent, color: 'text-emerald-400' },
              {
                label: 'Days Absent',
                value: 0,
                color: 'text-red-400',
              },
              { label: 'Hours Worked', value: `${totalHours.toFixed(1)}h`, color: 'text-blue-400' },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                className="bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-center"
              >
                <p className={`text-lg font-bold ${color}`}>{value}</p>
                <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Entries */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
          {isLoading ? (
            <div className="py-12 text-center">
              <Clock size={28} className="text-slate-700 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">Loading history…</p>
            </div>
          ) : errorMsg ? (
            <div className="py-12 text-center">
              <Clock size={28} className="text-slate-700 mx-auto mb-2" />
              <p className="text-red-400 text-sm">{errorMsg}</p>
            </div>
          ) : entries.length === 0 ? (
            <div className="py-12 text-center">
              <Clock size={28} className="text-slate-700 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">No records for this month</p>
            </div>
          ) : (
            entries.map((e, i) => {
              const s = STATUS_CONFIG[e.status];
              const Icon = s.icon;
              return (
                <div
                  key={i}
                  className="bg-[#0f1117] border border-[#1e2536] rounded-xl px-4 py-3 flex items-center gap-3"
                >
                  <div
                    className={`w-8 h-8 rounded-lg ${s.bg} border ${s.border} flex items-center justify-center shrink-0`}
                  >
                    <Icon size={13} className={s.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-200">{e.date}</p>
                      <StatusBadge status={e.status} />
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      {e.clockIn && (
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <LogIn size={10} className="text-emerald-500" />
                          {e.clockIn}
                        </p>
                      )}
                      {e.clockOut && (
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <LogOut size={10} className="text-violet-500" />
                          {e.clockOut}
                        </p>
                      )}
                      {e.hours && <p className="text-xs text-slate-600">{e.hours}h</p>}
                    </div>
                    {e.note && <p className="text-xs text-slate-600 truncate mt-0.5">{e.note}</p>}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-[#1e2536]">
          <button className="w-full flex items-center justify-center gap-2 bg-[#0f1117] border border-[#1e2536] hover:border-slate-500 text-slate-400 hover:text-slate-200 rounded-lg py-2.5 text-sm font-medium transition-all">
            <Download size={14} /> Export Attendance
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
