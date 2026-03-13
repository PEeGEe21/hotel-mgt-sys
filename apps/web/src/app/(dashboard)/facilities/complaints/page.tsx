'use client';

import { useState } from 'react';
import { AlertTriangle, Plus, Search, X, ChevronRight } from 'lucide-react';

type Priority = 'Low' | 'Medium' | 'High' | 'Critical';
type ComplaintStatus = 'Open' | 'In Progress' | 'Resolved' | 'Closed';

type Complaint = {
  id: string; title: string; facility: string; reportedBy: string;
  date: string; priority: Priority; status: ComplaintStatus; description: string;
};

const complaints: Complaint[] = [
  { id: 'c1', title: 'AC not working in room 304', facility: 'Block A - 3rd Floor', reportedBy: 'James Okafor', date: '2026-03-10', priority: 'High', status: 'In Progress', description: 'Air conditioning unit stopped working overnight.' },
  { id: 'c2', title: 'Swimming pool lights flickering', facility: 'Swimming Pool', reportedBy: 'Emeka Obi', date: '2026-03-09', priority: 'Medium', status: 'Open', description: 'Pool lights have been flickering since yesterday evening.' },
  { id: 'c3', title: 'Elevator stuck on 2nd floor', facility: 'Block B - Elevator', reportedBy: 'Chidi Nwosu', date: '2026-03-10', priority: 'Critical', status: 'In Progress', description: 'Main elevator stopped between floors, maintenance called.' },
  { id: 'c4', title: 'Gym treadmill broken', facility: 'Gym & Fitness', reportedBy: 'Sofia Martins', date: '2026-03-08', priority: 'Low', status: 'Open', description: 'Treadmill #2 makes grinding noise and stops unexpectedly.' },
  { id: 'c5', title: 'Leaking pipe in laundry room', facility: 'Laundry Room', reportedBy: 'Adaeze Okafor', date: '2026-03-07', priority: 'High', status: 'Resolved', description: 'Water pipe leaking behind washing machine unit 3.' },
  { id: 'c6', title: 'Conference hall projector faulty', facility: 'Conference Hall A', reportedBy: 'Blessing Adeyemi', date: '2026-03-06', priority: 'Medium', status: 'Resolved', description: 'Projector screen not lowering properly during events.' },
];

const priorityStyle: Record<Priority, string> = {
  Low: 'bg-slate-500/15 text-slate-400',
  Medium: 'bg-amber-500/15 text-amber-400',
  High: 'bg-orange-500/15 text-orange-400',
  Critical: 'bg-red-500/15 text-red-400',
};

const statusStyle: Record<ComplaintStatus, string> = {
  Open: 'bg-blue-500/15 text-blue-400',
  'In Progress': 'bg-amber-500/15 text-amber-400',
  Resolved: 'bg-emerald-500/15 text-emerald-400',
  Closed: 'bg-slate-500/15 text-slate-400',
};

export default function FacilityComplaintsPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'All' | ComplaintStatus>('All');
  const [showAdd, setShowAdd] = useState(false);

  const filtered = complaints.filter(c => {
    const matchSearch = `${c.title} ${c.facility} ${c.reportedBy}`.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'All' || c.status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Facility Complaints</h1>
          <p className="text-slate-500 text-sm mt-0.5">{complaints.filter(c => c.status === 'Open' || c.status === 'In Progress').length} open complaints</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
          <Plus size={15} /> Log Complaint
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Open', count: complaints.filter(c => c.status === 'Open').length, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
          { label: 'In Progress', count: complaints.filter(c => c.status === 'In Progress').length, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
          { label: 'Resolved', count: complaints.filter(c => c.status === 'Resolved').length, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
          { label: 'Critical', count: complaints.filter(c => c.priority === 'Critical').length, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
        ].map(({ label, count, color, bg }) => (
          <div key={label} className={`${bg} border rounded-xl px-4 py-4`}>
            <p className={`text-2xl font-bold ${color}`}>{count}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 bg-[#161b27] border border-[#1e2536] rounded-lg px-3 py-2 flex-1 min-w-56">
          <Search size={14} className="text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search complaints..."
            className="bg-transparent text-sm text-slate-300 placeholder:text-slate-600 outline-none flex-1" />
        </div>
        <div className="flex gap-1.5">
          {(['All', 'Open', 'In Progress', 'Resolved', 'Closed'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${filter === f ? 'bg-blue-600/20 border-blue-500/30 text-blue-400' : 'bg-[#161b27] border-[#1e2536] text-slate-400 hover:text-slate-200'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#161b27] border border-[#1e2536] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-[#1e2536] bg-[#0f1117]/50">
            <tr>
              {['#', 'Complaint', 'Facility', 'Reported By', 'Date', 'Priority', 'Status', ''].map(h => (
                <th key={h} className="text-xs text-slate-500 uppercase tracking-wider font-medium px-4 py-3 text-left whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((c, i) => (
              <tr key={c.id} className="border-b border-[#1e2536] last:border-0 hover:bg-white/[0.02] transition-colors cursor-pointer">
                <td className="px-4 py-3 text-sm text-slate-500">{i + 1}</td>
                <td className="px-4 py-3">
                  <p className="text-sm font-medium text-slate-200">{c.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5 max-w-[200px] truncate">{c.description}</p>
                </td>
                <td className="px-4 py-3 text-sm text-slate-400 whitespace-nowrap">{c.facility}</td>
                <td className="px-4 py-3 text-sm text-slate-400 whitespace-nowrap">{c.reportedBy}</td>
                <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{c.date}</td>
                <td className="px-4 py-3"><span className={`text-xs px-2.5 py-1 rounded-full font-medium ${priorityStyle[c.priority]}`}>{c.priority}</span></td>
                <td className="px-4 py-3"><span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusStyle[c.status]}`}>{c.status}</span></td>
                <td className="px-4 py-3"><ChevronRight size={16} className="text-slate-600" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#161b27] border border-[#1e2536] rounded-2xl p-6 w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">Log Complaint</h2>
              <button onClick={() => setShowAdd(false)} className="text-slate-500 hover:text-slate-300"><X size={18} /></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Complaint Title', col: 2, placeholder: 'Brief title' },
                { label: 'Facility', col: 1, placeholder: 'Affected facility' },
                { label: 'Reported By', col: 1, placeholder: 'Name' },
                { label: 'Priority', col: 1, placeholder: '' },
                { label: 'Date', col: 1, placeholder: '', type: 'date' },
                { label: 'Description', col: 2, placeholder: 'Full description of the issue' },
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