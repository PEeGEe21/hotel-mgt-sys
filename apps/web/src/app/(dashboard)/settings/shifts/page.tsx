'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Pencil, Trash2, X, Clock, Check } from 'lucide-react';
import {
  useCreateShiftTemplate,
  useDeleteShiftTemplate,
  useShiftTemplates,
  useUpdateShiftTemplate,
  type ShiftTemplate,
} from '@/hooks/useShifts';

const allDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const colorOptions = ['bg-blue-500', 'bg-violet-500', 'bg-emerald-500', 'bg-amber-500', 'bg-orange-500', 'bg-pink-500', 'bg-slate-500'];

function ShiftModal({ shift, onClose, onSave }: {
  shift?: ShiftTemplate;
  onClose: () => void;
  onSave: (s: Omit<ShiftTemplate, 'id'>) => void;
}) {
  const [name, setName] = useState(shift?.name ?? '');
  const [startTime, setStartTime] = useState(shift?.startTime ?? '08:00');
  const [endTime, setEndTime] = useState(shift?.endTime ?? '16:00');
  const [color, setColor] = useState(shift?.color ?? 'bg-blue-500');
  const [days, setDays] = useState<string[]>(shift?.days ?? allDays);

  const toggleDay = (day: string) =>
    setDays(d => d.includes(day) ? d.filter(x => x !== day) : [...d, day]);

  const durationHrs = () => {
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    let mins = (eh * 60 + em) - (sh * 60 + sm);
    if (mins < 0) mins += 24 * 60;
    return (mins / 60).toFixed(1);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#161b27] border border-[#1e2536] rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">{shift ? 'Edit Shift' : 'New Shift'}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors"><X size={18} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">Shift Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Morning, Night..."
              className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-blue-500 transition-colors" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">Start Time</label>
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500 transition-colors" />
            </div>
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">End Time</label>
              <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
                className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500 transition-colors" />
            </div>
          </div>
          <div className="bg-[#0f1117] border border-[#1e2536] rounded-lg px-4 py-2.5 flex items-center justify-between">
            <span className="text-xs text-slate-500">Duration</span>
            <span className="text-sm font-bold text-blue-400">{durationHrs()} hours</span>
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">Active Days</label>
            <div className="flex gap-1.5">
              {allDays.map(day => (
                <button key={day} onClick={() => toggleDay(day)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    days.includes(day)
                      ? 'bg-blue-600/20 border-blue-500/30 text-blue-400'
                      : 'bg-[#0f1117] border-[#1e2536] text-slate-500 hover:text-slate-300'
                  }`}>{day}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">Color</label>
            <div className="flex gap-2">
              {colorOptions.map(c => (
                <button key={c} onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-lg ${c} flex items-center justify-center transition-transform hover:scale-110`}>
                  {color === c && <Check size={13} className="text-white" />}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg py-2.5 text-sm font-medium transition-colors">Cancel</button>
          <button onClick={() => name && onSave({ name, startTime, endTime, color, days })}
            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg py-2.5 text-sm font-semibold transition-colors">Save</button>
        </div>
      </div>
    </div>
  );
}

export default function ShiftsPage() {
  const router = useRouter();
  const [modal, setModal] = useState<{ open: boolean; shift?: ShiftTemplate }>({ open: false });
  const { data: shifts = [], isLoading } = useShiftTemplates();
  const createShift = useCreateShiftTemplate();
  const updateShift = useUpdateShiftTemplate(modal.shift?.id ?? '');
  const deleteShift = useDeleteShiftTemplate();

  const save = async (data: Omit<ShiftTemplate, 'id'>) => {
    try {
      if (modal.shift) {
        await updateShift.mutateAsync(data);
      } else {
        await createShift.mutateAsync(data);
      }
      setModal({ open: false });
    } catch {
      // handled by toast
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this shift template?')) return;
    try {
      await deleteShift.mutateAsync(id);
    } catch {
      // handled by toast
    }
  };

  const duration = (s: ShiftTemplate) => {
    const [sh, sm] = s.startTime.split(':').map(Number);
    const [eh, em] = s.endTime.split(':').map(Number);
    let mins = (eh * 60 + em) - (sh * 60 + sm);
    if (mins < 0) mins += 24 * 60;
    return (mins / 60).toFixed(1);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/settings')}
            className="w-9 h-9 rounded-lg bg-[#161b27] border border-[#1e2536] flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Shift Templates</h1>
            <p className="text-slate-500 text-sm mt-0.5">{shifts.length} shifts defined</p>
          </div>
        </div>
        <button onClick={() => setModal({ open: true })}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
          <Plus size={15} /> New Shift
        </button>
      </div>

      <div className="bg-[#161b27] border border-[#1e2536] rounded-xl overflow-hidden">
        <div className="divide-y divide-[#1e2536]">
          {isLoading ? (
            <div className="px-5 py-10 text-center text-slate-500 text-sm">Loading shifts…</div>
          ) : shifts.length === 0 ? (
            <div className="px-5 py-10 text-center text-slate-500 text-sm">No shifts yet</div>
          ) : (
            shifts.map(shift => (
              <div key={shift.id} className="flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl ${shift.color} flex items-center justify-center shrink-0`}>
                    <Clock size={16} className="text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-200">{shift.name} Shift</p>
                    <p className="text-xs text-slate-500 mt-0.5">{shift.startTime} → {shift.endTime} · {duration(shift)}h</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="hidden sm:flex gap-1">
                    {allDays.map(day => (
                      <span key={day}
                        className={`text-[10px] w-6 h-6 rounded flex items-center justify-center font-medium ${
                          shift.days.includes(day) ? 'bg-blue-600/20 text-blue-400' : 'bg-[#0f1117] text-slate-700'
                        }`}>{day[0]}</span>
                    ))}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setModal({ open: true, shift })}
                      className="p-2 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"><Pencil size={14} /></button>
                    <button onClick={() => remove(shift.id)}
                      className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {modal.open && <ShiftModal shift={modal.shift} onClose={() => setModal({ open: false })} onSave={save} />}
    </div>
  );
}
