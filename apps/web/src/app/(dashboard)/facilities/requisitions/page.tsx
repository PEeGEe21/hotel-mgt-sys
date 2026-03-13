'use client';

import { useState } from 'react';
import { Receipt, Plus, Search, X, CheckCircle2, Clock, XCircle } from 'lucide-react';

type RequisitionStatus = 'Pending Approval' | 'Approved' | 'Rejected' | 'Fulfilled';
type Requisition = {
  id: string; title: string; facility: string; requestedBy: string;
  date: string; status: RequisitionStatus; items: number; totalCost: number; notes: string;
};

const requisitions: Requisition[] = [
  { id: 'r1', title: 'Pool maintenance chemicals', facility: 'Swimming Pool', requestedBy: 'Emeka Obi', date: '2026-03-10', status: 'Approved', items: 4, totalCost: 35000, notes: 'Monthly chemical stock' },
  { id: 'r2', title: 'Gym equipment parts', facility: 'Gym & Fitness', requestedBy: 'Emeka Obi', date: '2026-03-09', status: 'Pending Approval', items: 2, totalCost: 28500, notes: 'Treadmill belt and motor parts' },
  { id: 'r3', title: 'Generator spare parts', facility: 'Generator House', requestedBy: 'Yetunde Aina', date: '2026-03-10', status: 'Approved', items: 5, totalCost: 95000, notes: 'Urgent - oil filter, coolant, gaskets' },
  { id: 'r4', title: 'Cleaning supplies restock', facility: 'Laundry Room', requestedBy: 'Adaeze Okafor', date: '2026-03-08', status: 'Fulfilled', items: 8, totalCost: 22000, notes: 'Monthly cleaning stock' },
  { id: 'r5', title: 'Conference hall AV equipment', facility: 'Conference Hall A', requestedBy: 'Blessing Adeyemi', date: '2026-03-06', status: 'Rejected', items: 3, totalCost: 180000, notes: 'New projector and screen - over budget' },
  { id: 'r6', title: 'Rooftop bar furniture repair', facility: 'Rooftop Bar', requestedBy: 'Tunde Bakare', date: '2026-03-05', status: 'Pending Approval', items: 6, totalCost: 55000, notes: 'Bar stools and table legs' },
];

const statusStyle: Record<RequisitionStatus, string> = {
  'Pending Approval': 'bg-amber-500/15 text-amber-400',
  Approved: 'bg-blue-500/15 text-blue-400',
  Rejected: 'bg-red-500/15 text-red-400',
  Fulfilled: 'bg-emerald-500/15 text-emerald-400',
};

export default function FacilityRequisitionsPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'All' | RequisitionStatus>('All');
  const [showAdd, setShowAdd] = useState(false);

  const filtered = requisitions.filter(r => {
    const matchSearch = `${r.title} ${r.facility} ${r.requestedBy}`.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'All' || r.status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Facility Requisitions</h1>
          <p className="text-slate-500 text-sm mt-0.5">{requisitions.filter(r => r.status === 'Pending Approval').length} pending approval</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
          <Plus size={15} /> New Requisition
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Pending', count: requisitions.filter(r => r.status === 'Pending Approval').length, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
          { label: 'Approved', count: requisitions.filter(r => r.status === 'Approved').length, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
          { label: 'Fulfilled', count: requisitions.filter(r => r.status === 'Fulfilled').length, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
          { label: 'Total Value', count: `₦${(requisitions.reduce((s,r) => s+r.totalCost,0)/1000).toFixed(0)}k`, color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20' },
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
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search requisitions..."
            className="bg-transparent text-sm text-slate-300 placeholder:text-slate-600 outline-none flex-1" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {(['All', 'Pending Approval', 'Approved', 'Fulfilled', 'Rejected'] as const).map(f => (
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
              {['#', 'Requisition', 'Facility', 'Requested By', 'Date', 'Items', 'Total Cost', 'Status', ''].map(h => (
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
                  <p className="text-xs text-slate-500 mt-0.5 max-w-[180px] truncate">{r.notes}</p>
                </td>
                <td className="px-4 py-3 text-sm text-slate-400 whitespace-nowrap">{r.facility}</td>
                <td className="px-4 py-3 text-sm text-slate-400 whitespace-nowrap">{r.requestedBy}</td>
                <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{r.date}</td>
                <td className="px-4 py-3 text-sm text-slate-400 text-center">{r.items}</td>
                <td className="px-4 py-3 text-sm font-medium text-slate-200 whitespace-nowrap">₦{r.totalCost.toLocaleString()}</td>
                <td className="px-4 py-3"><span className={`text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap ${statusStyle[r.status]}`}>{r.status}</span></td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button className="text-xs bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 px-2 py-1 rounded-lg transition-colors font-medium">Approve</button>
                    <button className="text-xs bg-red-500/15 text-red-400 hover:bg-red-500/25 px-2 py-1 rounded-lg transition-colors font-medium">Reject</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#161b27] border border-[#1e2536] rounded-2xl p-6 w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">New Requisition</h2>
              <button onClick={() => setShowAdd(false)} className="text-slate-500 hover:text-slate-300"><X size={18} /></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Title', col: 2, placeholder: 'What are you requesting?' },
                { label: 'Facility', col: 1, placeholder: 'For which facility?' },
                { label: 'Requested By', col: 1, placeholder: 'Your name' },
                { label: 'No. of Items', col: 1, type: 'number', placeholder: '0' },
                { label: 'Estimated Cost (₦)', col: 1, type: 'number', placeholder: '0' },
                { label: 'Notes', col: 2, placeholder: 'What are the items? Why needed?' },
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
