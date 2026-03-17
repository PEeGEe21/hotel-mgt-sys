// ─── Clock In/Out Modal ───────────────────────────────────────────────────────
import { useState } from 'react';
import { StaffRecord } from '@/lib/attendance-data';
import { X } from 'lucide-react';

export default function ClockModal({
  staff,
  type,
  staffOptions,
  onClose,
  onSave,
}: {
  staff?: StaffRecord;
  type: 'in' | 'out' | 'manual';
  staffOptions: StaffRecord[];
  onClose: () => void;
  onSave: (staffId: string, time: string, note: string) => void;
}) {
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const [selectedStaff, setSelectedStaff] = useState(staff?.id ?? '');
  const [time, setTime] = useState(timeStr);
  const [note, setNote] = useState('');
  const inputCls =
    'w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-blue-500 transition-colors';

  const title = type === 'in' ? 'Clock In' : type === 'out' ? 'Clock Out' : 'Manual Entry';
  const color =
    type === 'out' ? 'bg-violet-600 hover:bg-violet-500' : 'bg-emerald-600 hover:bg-emerald-500';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#161b27] border border-[#1e2536] rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-4">
          {!staff && (
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
                Staff Member
              </label>
              <select
                value={selectedStaff}
                onChange={(e) => setSelectedStaff(e.target.value)}
                className={inputCls}
              >
                <option value="">Select staff…</option>
                {staffOptions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {staff && (
            <div className="flex items-center gap-3 bg-[#0f1117] border border-[#1e2536] rounded-xl px-4 py-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500/30 to-violet-500/30 border border-white/10 flex items-center justify-center text-sm font-bold text-white shrink-0">
                {staff.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-200">{staff.name}</p>
                <p className="text-xs text-slate-500">{staff.department}</p>
              </div>
            </div>
          )}
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
              Time
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">
              Note (optional)
            </label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Reason, notes…"
              className={inputCls}
            />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button
            onClick={onClose}
            className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg py-2.5 text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onSave(staff?.id ?? selectedStaff, time, note);
              onClose();
            }}
            className={`flex-1 ${color} text-white rounded-lg py-2.5 text-sm font-semibold transition-colors`}
          >
            {title}
          </button>
        </div>
      </div>
    </div>
  );
}
