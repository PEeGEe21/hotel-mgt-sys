'use client';

import { useState } from 'react';
import { FileText, Plus, Search, Download, Eye, X, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

type ContractStatus = 'Active' | 'Expired' | 'Expiring Soon' | 'Draft';
type ContractType = 'Permanent' | 'Contract' | 'Part-time' | 'Probation';

type Contract = {
  id: string; staffName: string; position: string; type: ContractType;
  startDate: string; endDate: string; status: ContractStatus; salary: number; department: string;
};

const contracts: Contract[] = [
  { id: 'con1', staffName: 'Blessing Adeyemi', position: 'Hotel Manager', type: 'Permanent', startDate: '2022-01-15', endDate: '—', status: 'Active', salary: 2800, department: 'Management' },
  { id: 'con2', staffName: 'Chidi Nwosu', position: 'Head Receptionist', type: 'Permanent', startDate: '2022-03-01', endDate: '—', status: 'Active', salary: 1400, department: 'Front Desk' },
  { id: 'con3', staffName: 'Ngozi Eze', position: 'Receptionist', type: 'Contract', startDate: '2023-06-10', endDate: '2026-06-10', status: 'Active', salary: 1100, department: 'Front Desk' },
  { id: 'con4', staffName: 'Emeka Obi', position: 'Head Housekeeper', type: 'Permanent', startDate: '2022-08-20', endDate: '—', status: 'Active', salary: 1200, department: 'Housekeeping' },
  { id: 'con5', staffName: 'Adaeze Okafor', position: 'Housekeeper', type: 'Contract', startDate: '2023-01-05', endDate: '2026-04-05', status: 'Expiring Soon', salary: 900, department: 'Housekeeping' },
  { id: 'con6', staffName: 'Tunde Bakare', position: 'Head Bartender', type: 'Permanent', startDate: '2022-11-01', endDate: '—', status: 'Active', salary: 1300, department: 'Bar' },
  { id: 'con7', staffName: 'Kemi Adebayo', position: 'Cashier', type: 'Contract', startDate: '2023-04-15', endDate: '2025-04-15', status: 'Expired', salary: 1050, department: 'Finance' },
  { id: 'con8', staffName: 'Seun Lawal', position: 'Security Officer', type: 'Contract', startDate: '2023-09-01', endDate: '2025-09-01', status: 'Expired', salary: 950, department: 'Security' },
  { id: 'con9', staffName: 'Yetunde Aina', position: 'Maintenance Tech', type: 'Probation', startDate: '2024-02-01', endDate: '2024-08-01', status: 'Draft', salary: 1000, department: 'Maintenance' },
];

const statusStyle: Record<ContractStatus, string> = {
  Active: 'bg-emerald-500/15 text-emerald-400',
  Expired: 'bg-red-500/15 text-red-400',
  'Expiring Soon': 'bg-amber-500/15 text-amber-400',
  Draft: 'bg-slate-500/15 text-slate-400',
};

const typeStyle: Record<ContractType, string> = {
  Permanent: 'bg-blue-500/15 text-blue-400',
  Contract: 'bg-violet-500/15 text-violet-400',
  'Part-time': 'bg-sky-500/15 text-sky-400',
  Probation: 'bg-orange-500/15 text-orange-400',
};

const StatusIcon = ({ s }: { s: ContractStatus }) => {
  if (s === 'Active') return <CheckCircle2 size={10} />;
  if (s === 'Expiring Soon') return <AlertTriangle size={10} />;
  return <Clock size={10} />;
};

export default function ContractsPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'All' | ContractStatus>('All');
  const [showAdd, setShowAdd] = useState(false);

  const filtered = contracts.filter(c => {
    const matchSearch = `${c.staffName} ${c.position} ${c.department}`.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'All' || c.status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Employment Contracts</h1>
          <p className="text-slate-500 text-sm mt-0.5">{contracts.filter(c => c.status === 'Expiring Soon').length} expiring soon</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
          <Plus size={15} /> New Contract
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Active', count: contracts.filter(c => c.status === 'Active').length, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
          { label: 'Expiring Soon', count: contracts.filter(c => c.status === 'Expiring Soon').length, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
          { label: 'Expired', count: contracts.filter(c => c.status === 'Expired').length, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
          { label: 'Draft', count: contracts.filter(c => c.status === 'Draft').length, color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/20' },
        ].map(({ label, count, color, bg }) => (
          <div key={label} className={`${bg} border rounded-xl px-4 py-4`}>
            <p className={`text-2xl font-bold ${color}`}>{count}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 bg-[#161b27] border border-[#1e2536] rounded-lg px-3 py-2 flex-1 min-w-56">
          <Search size={14} className="text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search contracts..."
            className="bg-transparent text-sm text-slate-300 placeholder:text-slate-600 outline-none flex-1" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {(['All', 'Active', 'Expiring Soon', 'Expired', 'Draft'] as const).map(f => (
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
              {['Staff Member', 'Department', 'Type', 'Start Date', 'End Date', 'Salary', 'Status', ''].map(h => (
                <th key={h} className="text-xs text-slate-500 uppercase tracking-wider font-medium px-4 py-3 text-left whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id} className="border-b border-[#1e2536] last:border-0 hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-3">
                  <p className="text-sm font-medium text-slate-200">{c.staffName}</p>
                  <p className="text-xs text-slate-500">{c.position}</p>
                </td>
                <td className="px-4 py-3 text-sm text-slate-400 whitespace-nowrap">{c.department}</td>
                <td className="px-4 py-3"><span className={`text-xs px-2.5 py-1 rounded-full font-medium ${typeStyle[c.type]}`}>{c.type}</span></td>
                <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{c.startDate}</td>
                <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{c.endDate}</td>
                <td className="px-4 py-3 text-sm font-medium text-slate-300 whitespace-nowrap">${c.salary.toLocaleString()}/mo</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1 w-fit ${statusStyle[c.status]}`}>
                    <StatusIcon s={c.status} />
                    {c.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors" title="View"><Eye size={13} /></button>
                    <button className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors" title="Download"><Download size={13} /></button>
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
              <h2 className="text-lg font-bold text-white">New Contract</h2>
              <button onClick={() => setShowAdd(false)} className="text-slate-500 hover:text-slate-300"><X size={18} /></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Staff Member', col: 2, placeholder: 'Select staff member' },
                { label: 'Position', col: 1, placeholder: 'Job title' },
                { label: 'Department', col: 1, placeholder: 'Department' },
                { label: 'Contract Type', col: 1, placeholder: 'Select type' },
                { label: 'Monthly Salary ($)', col: 1, type: 'number', placeholder: '0' },
                { label: 'Start Date', col: 1, type: 'date', placeholder: '' },
                { label: 'End Date', col: 1, type: 'date', placeholder: '' },
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
              <button className="flex-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg py-2.5 text-sm font-semibold transition-colors">Save Contract</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
