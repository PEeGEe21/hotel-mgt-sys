'use client';

import { useState } from 'react';
import { Wrench, Plus, Search, X, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';

type MaintenanceStatus = 'Pending' | 'In Progress' | 'Completed' | 'On Hold';
type MaintenancePriority = 'Low' | 'Medium' | 'High' | 'Urgent';
type MaintenanceRecord = {
  id: string; title: string; facility: string; assignedTo: string;
  requestDate: string; completionDate: string; status: MaintenanceStatus;
  priority: MaintenancePriority; cost: number; description: string;
};

const records: MaintenanceRecord[] = [
  { id: 'm1', title: 'Generator oil change & coolant refill', facility: 'Generator House', assignedTo: 'Yetunde Aina', requestDate: '2026-03-10', completionDate: '2026-03-13', status: 'In Progress', priority: 'Urgent', cost: 45000, description: 'Oil levels critical, coolant leak found during inspection.' },
  { id: 'm2', title: 'Replace pool pump filter', facility: 'Swimming Pool', assignedTo: 'Emeka Obi', requestDate: '2026-03-09', completionDate: '2026-03-11', status: 'Completed', priority: 'Medium', cost: 18500, description: 'Monthly filter replacement.' },
  { id: 'm3', title: 'Repaint rooftop bar exterior', facility: 'Rooftop Bar', assignedTo: 'Yetunde Aina', requestDate: '2026-03-01', completionDate: '2026-03-20', status: 'On Hold', priority: 'Low', cost: 120000, description: 'Awaiting paint delivery from supplier.' },
  { id: 'm4', title: 'Service gym treadmill #2', facility: 'Gym & Fitness', assignedTo: 'Yetunde Aina', requestDate: '2026-03-08', completionDate: '2026-03-12', status: 'Pending', priority: 'Medium', cost: 25000, description: 'Grinding noise reported, belt may need replacement.' },
  { id: 'm5', title: 'Fix laundry room pipe leak', facility: 'Laundry Room', assignedTo: 'Yetunde Aina', requestDate: '2026-03-07', completionDate: '2026-03-09', status: 'Completed', priority: 'High', cost: 12000, description: 'Pipe behind machine unit 3 replaced.' },
  { id: 'm6', title: 'Replace conference hall AV cables', facility: 'Conference Hall A', assignedTo: 'Yetunde Aina', requestDate: '2026-03-05', completionDate: '2026-03-07', status: 'Completed', priority: 'Low', cost: 8500, description: 'HDMI and display port cables upgraded.' },
];

const statusStyle: Record<MaintenanceStatus, string> = {
  Pending: 'bg-blue-500/15 text-blue-400',
  'In Progress': 'bg-amber-500/15 text-amber-400',
  Completed: 'bg-emerald-500/15 text-emerald-400',
  'On Hold': 'bg-slate-500/15 text-slate-400',
};

const priorityStyle: Record<MaintenancePriority, string> = {
  Low: 'bg-slate-500/15 text-slate-400',
  Medium: 'bg-amber-500/15 text-amber-400',
  High: 'bg-orange-500/15 text-orange-400',
  Urgent: 'bg-red-500/15 text-red-400',
};

export default function FacilityMaintenancePage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'All' | MaintenanceStatus>('All');
  const [showAdd, setShowAdd] = useState(false);

  const filtered = records.filter(r => {
    const matchSearch = `${r.title} ${r.facility} ${r.assignedTo}`.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'All' || r.status === filter;
    return matchSearch && matchFilter;
  });

  const totalCost = records.filter(r => r.status === 'Completed').reduce((s, r) => s + r.cost, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Facility Maintenance</h1>
          <p className="text-slate-500 text-sm mt-0.5">{records.filter(r => r.status !== 'Completed').length} active maintenance tasks</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
          <Plus size={15} /> New Request
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Pending', count: records.filter(r => r.status === 'Pending').length, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
          { label: 'In Progress', count: records.filter(r => r.status === 'In Progress').length, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
          { label: 'Completed', count: records.filter(r => r.status === 'Completed').length, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
          { label: 'Total Cost (Done)', count: `₦${(totalCost/1000).toFixed(0)}k`, color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20' },
        ].map(({ label, count, color, bg }) => (
          <div key={label} className={`${bg} border rounded-xl px-4 py-4`}>
            <p className={`text-xl font-bold ${color}`}>{count}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 bg-[#161b27] border border-[#1e2536] rounded-lg px-3 py-2 flex-1 min-w-56">
          <Search size={14} className="text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search maintenance records..."
            className="bg-transparent text-sm text-slate-300 placeholder:text-slate-600 outline-none flex-1" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {(['All', 'Pending', 'In Progress', 'Completed', 'On Hold'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${filter === f ? 'bg-blue-600/20 border-blue-500/30 text-blue-400' : 'bg-[#161b27] border-[#1e2536] text-slate-400 hover:text-slate-200'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[#161b27] border border-[#1e2536] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-[#1e2536] bg-[#0f1117]/50">
            <tr>
              {['#', 'Task', 'Facility', 'Assigned To', 'Requested', 'Due', 'Priority', 'Status', 'Cost'].map(h => (
                <th key={h} className="text-xs text-slate-500 uppercase tracking-wider font-medium px-4 py-3 text-left whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={r.id} className="border-b border-[#1e2536] last:border-0 hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-3 text-sm text-slate-500">{i + 1}</td>
                <td className="px-4 py-3">
                  <p className="text-sm font-medium text-slate-200">{r.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5 max-w-[180px] truncate">{r.description}</p>
                </td>
                <td className="px-4 py-3 text-sm text-slate-400 whitespace-nowrap">{r.facility}</td>
                <td className="px-4 py-3 text-sm text-slate-400 whitespace-nowrap">{r.assignedTo}</td>
                <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{r.requestDate}</td>
                <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{r.completionDate}</td>
                <td className="px-4 py-3"><span className={`text-xs px-2 py-1 rounded-full font-medium ${priorityStyle[r.priority]}`}>{r.priority}</span></td>
                <td className="px-4 py-3"><span className={`text-xs px-2 py-1 rounded-full font-medium ${statusStyle[r.status]}`}>{r.status}</span></td>
                <td className="px-4 py-3 text-sm text-slate-300 whitespace-nowrap">₦{r.cost.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#161b27] border border-[#1e2536] rounded-2xl p-6 w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">New Maintenance Request</h2>
              <button onClick={() => setShowAdd(false)} className="text-slate-500 hover:text-slate-300"><X size={18} /></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Task Title', col: 2, placeholder: 'What needs fixing?' },
                { label: 'Facility', col: 1, placeholder: 'Affected facility' },
                { label: 'Assigned To', col: 1, placeholder: 'Technician' },
                { label: 'Priority', col: 1, placeholder: '' },
                { label: 'Due Date', col: 1, type: 'date', placeholder: '' },
                { label: 'Estimated Cost (₦)', col: 1, type: 'number', placeholder: '0' },
                { label: 'Description', col: 2, placeholder: 'Detailed description' },
              ].map(({ label, col, placeholder, type }) => (
                <div key={label} className={col === 2 ? 'col-span-2' : ''}>
                  <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">{label}</label>
                  <input type={type ?? 'text'} placeholder={placeholder}
                    className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-blue-500 transition-colors" />
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowAdd(false)} className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg py-2.5 text-sm font-medium transition-colors">Cancel</button>
              <button className="flex-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg py-2.5 text-sm font-semibold transition-colors">Submit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
