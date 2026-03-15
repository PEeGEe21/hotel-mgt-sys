// ─── Task Card ────────────────────────────────────────────────────────────────
'use client';

import { ChevronDown, Clock, Flag } from 'lucide-react';
import { useUpdateTask, useMarkDone, type HKTask } from '@/hooks/useHousekeeping';
import { NEXT_STATUS, STATUS_CONFIG, TYPE_CONFIG } from '@/lib/housekeeping-data';

export default function TaskCard({ task, onClick }: { task: HKTask; onClick: () => void }) {
  const update = useUpdateTask(task.id);
  const markDone = useMarkDone(task.id);
  const tc = TYPE_CONFIG[task.type] ?? TYPE_CONFIG.CLEANING;
  const next = NEXT_STATUS[task.status];

  return (
    <div
      onClick={onClick}
      className="bg-[#161b27] border border-[#1e2536] hover:border-slate-600 rounded-xl p-4 cursor-pointer transition-all group space-y-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold text-white">Rm {task.room.number}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${tc.bg} ${tc.color}`}>
            {tc.label}
          </span>
          {task.priority === 'URGENT' && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-red-500/20 text-red-400 flex items-center gap-0.5">
              <Flag size={8} /> Urgent
            </span>
          )}
          {task.priority === 'HIGH' && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400">
              High
            </span>
          )}
        </div>
        {next && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (next === 'DONE') markDone.mutate();
              else update.mutate({ status: next });
            }}
            disabled={update.isPending || markDone.isPending}
            className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-white/10 text-slate-500 hover:text-slate-300 transition-all shrink-0 disabled:opacity-50"
            title={`Move to ${STATUS_CONFIG[next].label}`}
          >
            <ChevronDown size={13} className="-rotate-90" />
          </button>
        )}
      </div>

      {task.notes && <p className="text-xs text-slate-500 line-clamp-2">{task.notes}</p>}

      <div className="flex items-center justify-between gap-2">
        {task.staff ? (
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500/30 to-violet-500/30 border border-white/10 flex items-center justify-center text-[9px] font-bold text-white">
              {task.staff.firstName[0]}
              {task.staff.lastName[0]}
            </div>
            <span className="text-[10px] text-slate-500 truncate max-w-[80px]">
              {task.staff.firstName}
            </span>
          </div>
        ) : (
          <span className="text-[10px] text-slate-700 italic">Unassigned</span>
        )}
        {task.dueBy && (
          <div className="flex items-center gap-1 text-[10px] text-slate-600">
            <Clock size={9} />
            {new Date(task.dueBy).toLocaleTimeString('en-NG', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        )}
      </div>
    </div>
  );
}
