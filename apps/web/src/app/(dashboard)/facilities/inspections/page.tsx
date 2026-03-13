'use client';

import { useState } from 'react';
import { ClipboardList, Plus, Search, X, CheckCircle2, Clock, XCircle } from 'lucide-react';

type InspectionStatus = 'Scheduled' | 'Passed' | 'Failed' | 'Pending';
type Inspection = {
  id: string; facility: string; inspector: string; date: string;
  nextDate: string; status: InspectionStatus; score: number; notes: string;
};

const inspections: Inspection[] = [
  { id: 'i1', facility: 'Swimming Pool', inspector: 'Emeka Obi', date: '2026-03-08', nextDate: '2026-04-08', status: 'Passed', score: 92, notes: 'Chemical levels in range, pumps functioning normally.' },
  { id: 'i2', facility: 'Main Entrance', inspector: 'Seun Lawal', date: '2026-03-05', nextDate: '2026-04-05', status: 'Passed', score: 88, notes: 'CCTV and access control systems operational.' },
  { id: 'i3', facility: 'Generator House', inspector: 'Yetunde Aina', date: '2026-03-10', nextDate: '2026-04-10', status: 'Failed', score: 54, notes: 'Oil levels low, coolant leak detected. Maintenance required urgently.' },
  { id: 'i4', facility: 'Rooftop Bar', inspector: 'Tunde Bakare', date: '2026-03-12', nextDate: '2026-04-12', status: 'Scheduled', score: 0, notes: '' },
  { id: 'i5', facility: 'Gym & Fitness', inspector: 'Emeka Obi', date: '2026-03-01', nextDate: '2026-04-01', status: 'Passed', score: 79, notes: 'All equipment functional. Treadmill #2 needs service.' },
  { id: 'i6', facility: 'Spa & Wellness', inspector: 'Adaeze Okafor', date: '2026-03-14', nextDate: '2026-04-14', status: 'Scheduled', score: 0, notes: '' },
];

const statusStyle: Record<InspectionStatus, string> = {
  Passed: 'bg-emerald-500/15 text-emerald-400',
  Failed: 'bg-red-500/15 text-red-400',
  Scheduled: 'bg-blue-500/15 text-blue-400',
  Pending: 'bg-amber-500/15 text-amber-400',
};

const StatusIcon = ({ s }: { s: InspectionStatus }) => {
  if (s === 'Passed') return <CheckCircle2 size={14} className="text-emerald-400" />;
  if (s === 'Failed') return <XCircle size={14} className="text-red-400" />;
  return <Clock size={14} className="text-blue-400" />;
};

export default function FacilityInspectionsPage() {
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const filtered = inspections.filter(i =>
    `${i.facility} ${i.inspector}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Facility Inspections</h1>
          <p className="text-slate-500 text-sm mt-0.5">{inspections.filter(i => i.status === 'Scheduled').length} scheduled upcoming</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
          <Plus size={15} /> Schedule Inspection
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total', count: inspections.length, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
          { label: 'Passed', count: inspections.filter(i => i.status === 'Passed').length, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
          { label: 'Failed', count: inspections.filter(i => i.status === 'Failed').length, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
          { label: 'Scheduled', count: inspections.filter(i => i.status === 'Scheduled').length, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
        ].map(({ label, count, color, bg }) => (
          <div key={label} className={`${bg} border rounded-xl px-4 py-4`}>
            <p className={`text-2xl font-bold ${color}`}>{count}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 bg-[#161b27] border border-[#1e2536] rounded-lg px-3 py-2 max-w-80">
        <Search size={14} className="text-slate-500" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search inspections..."
          className="bg-transparent text-sm text-slate-300 placeholder:text-slate-600 outline-none flex-1" />
      </div>

      <div className="bg-[#161b27] border border-[#1e2536] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-[#1e2536] bg-[#0f1117]/50">
            <tr>
              {['#', 'Facility', 'Inspector', 'Date', 'Next Due', 'Score', 'Status', 'Notes', ''].map(h => (
                <th key={h} className="text-xs text-slate-500 uppercase tracking-wider font-medium px-4 py-3 text-left whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((insp, i) => (
              <tr key={insp.id} className="border-b border-[#1e2536] last:border-0 hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-3 text-sm text-slate-500">{i + 1}</td>
                <td className="px-4 py-3 text-sm font-medium text-slate-200 whitespace-nowrap">{insp.facility}</td>
                <td className="px-4 py-3 text-sm text-slate-400 whitespace-nowrap">{insp.inspector}</td>
                <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{insp.date}</td>
                <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{insp.nextDate}</td>
                <td className="px-4 py-3">
                  {insp.score > 0 ? (
                    <span className={`text-sm font-bold ${insp.score >= 80 ? 'text-emerald-400' : insp.score >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
                      {insp.score}%
                    </span>
                  ) : <span className="text-slate-600 text-sm">—</span>}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1.5 w-fit ${statusStyle[insp.status]}`}>
                    <StatusIcon s={insp.status} />
                    {insp.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500 max-w-[200px] truncate">{insp.notes || '—'}</td>
                <td className="px-4 py-3">
                  <button className="text-xs bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 px-2 py-1 rounded-lg transition-colors font-medium whitespace-nowrap">View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#161b27] border border-[#1e2536] rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">Schedule Inspection</h2>
              <button onClick={() => setShowAdd(false)} className="text-slate-500 hover:text-slate-300"><X size={18} /></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Facility', col: 2, type: 'text', placeholder: 'Select facility' },
                { label: 'Inspector', col: 1, type: 'text', placeholder: 'Inspector name' },
                { label: 'Date', col: 1, type: 'date', placeholder: '' },
                { label: 'Notes', col: 2, type: 'text', placeholder: 'Inspection scope or notes' },
              ].map(({ label, col, type, placeholder }) => (
                <div key={label} className={col === 2 ? 'col-span-2' : ''}>
                  <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">{label}</label>
                  <input type={type} placeholder={placeholder} className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-blue-500 transition-colors" />
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowAdd(false)} className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg py-2.5 text-sm font-medium transition-colors">Cancel</button>
              <button className="flex-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg py-2.5 text-sm font-semibold transition-colors">Schedule</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}