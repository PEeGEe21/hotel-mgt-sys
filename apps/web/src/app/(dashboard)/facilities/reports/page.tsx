'use client';

import { FileBarChart, Wrench, AlertTriangle, ClipboardList, Receipt, TrendingUp } from 'lucide-react';

export default function FacilityReportsPage() {
  const summaryCards = [
    { label: 'Total Facilities', value: '10', sub: '8 Active · 1 Maintenance · 1 Inactive', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', icon: FileBarChart },
    { label: 'Complaints This Month', value: '6', sub: '2 Open · 2 In Progress · 2 Resolved', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20', icon: AlertTriangle },
    { label: 'Inspections This Month', value: '6', sub: '4 Passed · 1 Failed · 1 Scheduled', color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20', icon: ClipboardList },
    { label: 'Maintenance Tasks', value: '6', sub: '3 Completed · 2 Active · 1 On Hold', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', icon: Wrench },
    { label: 'Requisitions', value: '6', sub: '2 Pending · 2 Approved · 1 Fulfilled', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', icon: Receipt },
    { label: 'Maintenance Spend', value: '₦229k', sub: 'Completed work this month', color: 'text-pink-400', bg: 'bg-pink-500/10 border-pink-500/20', icon: TrendingUp },
  ];

  const facilityHealth = [
    { name: 'Swimming Pool', complaints: 1, inspections: 1, maintenance: 1, score: 92, health: 'Good' },
    { name: 'Generator House', complaints: 0, inspections: 1, maintenance: 1, score: 54, health: 'Poor' },
    { name: 'Gym & Fitness', complaints: 1, inspections: 1, maintenance: 1, score: 79, health: 'Fair' },
    { name: 'Main Entrance', complaints: 1, inspections: 1, maintenance: 0, score: 88, health: 'Good' },
    { name: 'Conference Hall A', complaints: 1, inspections: 0, maintenance: 1, score: 85, health: 'Good' },
    { name: 'Rooftop Bar', complaints: 0, inspections: 0, maintenance: 1, score: 0, health: 'Maintenance' },
    { name: 'Laundry Room', complaints: 0, inspections: 0, maintenance: 1, score: 95, health: 'Good' },
    { name: 'Kitchen', complaints: 0, inspections: 1, maintenance: 0, score: 88, health: 'Good' },
  ];

  const healthStyle: Record<string, string> = {
    Good: 'bg-emerald-500/15 text-emerald-400',
    Fair: 'bg-amber-500/15 text-amber-400',
    Poor: 'bg-red-500/15 text-red-400',
    Maintenance: 'bg-orange-500/15 text-orange-400',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Facility Reports</h1>
        <p className="text-slate-500 text-sm mt-0.5">Overview of facility health and activity — March 2026</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {summaryCards.map(({ label, value, sub, color, bg, icon: Icon }) => (
          <div key={label} className={`${bg} border rounded-xl p-5`}>
            <div className="flex items-center gap-3 mb-3">
              <Icon size={16} className={color} />
              <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">{label}</span>
            </div>
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-slate-500 mt-1.5">{sub}</p>
          </div>
        ))}
      </div>

      <div className="bg-[#161b27] border border-[#1e2536] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1e2536]">
          <h2 className="text-sm font-semibold text-white">Facility Health Overview</h2>
          <p className="text-xs text-slate-500 mt-0.5">Inspection scores and activity summary per facility</p>
        </div>
        <table className="w-full">
          <thead className="border-b border-[#1e2536] bg-[#0f1117]/50">
            <tr>
              {['Facility', 'Complaints', 'Inspections', 'Maintenance', 'Inspection Score', 'Health'].map(h => (
                <th key={h} className="text-xs text-slate-500 uppercase tracking-wider font-medium px-4 py-3 text-left whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {facilityHealth.map(f => (
              <tr key={f.name} className="border-b border-[#1e2536] last:border-0 hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-3 text-sm font-medium text-slate-200 whitespace-nowrap">{f.name}</td>
                <td className="px-4 py-3 text-sm text-slate-400 text-center">{f.complaints}</td>
                <td className="px-4 py-3 text-sm text-slate-400 text-center">{f.inspections}</td>
                <td className="px-4 py-3 text-sm text-slate-400 text-center">{f.maintenance}</td>
                <td className="px-4 py-3">
                  {f.score > 0 ? (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-[#0f1117] rounded-full overflow-hidden max-w-[80px]">
                        <div className={`h-full rounded-full ${f.score >= 80 ? 'bg-emerald-500' : f.score >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                          style={{ width: `${f.score}%` }} />
                      </div>
                      <span className={`text-sm font-bold ${f.score >= 80 ? 'text-emerald-400' : f.score >= 60 ? 'text-amber-400' : 'text-red-400'}`}>{f.score}%</span>
                    </div>
                  ) : <span className="text-xs text-slate-600">Not inspected</span>}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${healthStyle[f.health]}`}>{f.health}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
