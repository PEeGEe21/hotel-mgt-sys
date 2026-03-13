'use client';

import { useState } from 'react';
import { Receipt, Download, CheckCircle2, Clock, DollarSign, Users, TrendingUp, Calendar } from 'lucide-react';

type PayrollStatus = 'Paid' | 'Pending' | 'Processing';

type PayrollRecord = {
  id: string; staffName: string; position: string; department: string;
  baseSalary: number; deductions: number; bonus: number; net: number;
  month: string; status: PayrollStatus; paidDate: string;
};

const payroll: PayrollRecord[] = [
  { id: 'p1', staffName: 'Blessing Adeyemi', position: 'Hotel Manager', department: 'Management', baseSalary: 2800, deductions: 280, bonus: 300, net: 2820, month: 'March 2026', status: 'Pending', paidDate: '—' },
  { id: 'p2', staffName: 'Chidi Nwosu', position: 'Head Receptionist', department: 'Front Desk', baseSalary: 1400, deductions: 140, bonus: 0, net: 1260, month: 'March 2026', status: 'Pending', paidDate: '—' },
  { id: 'p3', staffName: 'Ngozi Eze', position: 'Receptionist', department: 'Front Desk', baseSalary: 1100, deductions: 110, bonus: 0, net: 990, month: 'March 2026', status: 'Processing', paidDate: '—' },
  { id: 'p4', staffName: 'Emeka Obi', position: 'Head Housekeeper', department: 'Housekeeping', baseSalary: 1200, deductions: 120, bonus: 100, net: 1180, month: 'March 2026', status: 'Pending', paidDate: '—' },
  { id: 'p5', staffName: 'Adaeze Okafor', position: 'Housekeeper', department: 'Housekeeping', baseSalary: 900, deductions: 90, bonus: 0, net: 810, month: 'March 2026', status: 'Pending', paidDate: '—' },
  { id: 'p6', staffName: 'Tunde Bakare', position: 'Head Bartender', department: 'Bar', baseSalary: 1300, deductions: 130, bonus: 150, net: 1320, month: 'March 2026', status: 'Paid', paidDate: '2026-03-05' },
  { id: 'p7', staffName: 'Seun Lawal', position: 'Security Officer', department: 'Security', baseSalary: 950, deductions: 95, bonus: 0, net: 855, month: 'March 2026', status: 'Paid', paidDate: '2026-03-05' },
  { id: 'p8', staffName: 'Yetunde Aina', position: 'Maintenance Tech', department: 'Maintenance', baseSalary: 1000, deductions: 100, bonus: 0, net: 900, month: 'March 2026', status: 'Paid', paidDate: '2026-03-05' },
];

const statusStyle: Record<PayrollStatus, string> = {
  Paid: 'bg-emerald-500/15 text-emerald-400',
  Pending: 'bg-amber-500/15 text-amber-400',
  Processing: 'bg-blue-500/15 text-blue-400',
};

const months = ['March 2026', 'February 2026', 'January 2026', 'December 2025'];

export default function PayrollPage() {
  const [selectedMonth, setSelectedMonth] = useState('March 2026');
  const [filter, setFilter] = useState<'All' | PayrollStatus>('All');

  const filtered = payroll.filter(p =>
    p.month === selectedMonth && (filter === 'All' || p.status === filter)
  );

  const totalNet = filtered.reduce((s, p) => s + p.net, 0);
  const totalBase = filtered.reduce((s, p) => s + p.baseSalary, 0);
  const totalBonus = filtered.reduce((s, p) => s + p.bonus, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Payroll</h1>
          <p className="text-slate-500 text-sm mt-0.5">Salary records and payment history</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
            className="bg-[#161b27] border border-[#1e2536] rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-blue-500 transition-colors">
            {months.map(m => <option key={m}>{m}</option>)}
          </select>
          <button className="flex items-center gap-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/20 text-emerald-400 px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
            <CheckCircle2 size={14} /> Process All Pending
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Payroll', value: `$${totalNet.toLocaleString()}`, icon: DollarSign, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
          { label: 'Base Salaries', value: `$${totalBase.toLocaleString()}`, icon: Users, color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20' },
          { label: 'Total Bonuses', value: `$${totalBonus.toLocaleString()}`, icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
          { label: 'Paid', value: `${payroll.filter(p => p.status === 'Paid').length}/${payroll.length}`, icon: Calendar, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`${bg} border rounded-xl px-4 py-4 flex items-center gap-3`}>
            <Icon size={18} className={color} />
            <div>
              <p className={`text-xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-slate-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-1.5">
        {(['All', 'Paid', 'Pending', 'Processing'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${filter === f ? 'bg-blue-600/20 border-blue-500/30 text-blue-400' : 'bg-[#161b27] border-[#1e2536] text-slate-400 hover:text-slate-200'}`}>
            {f}
          </button>
        ))}
      </div>

      <div className="bg-[#161b27] border border-[#1e2536] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-[#1e2536] bg-[#0f1117]/50">
            <tr>
              {['Staff Member', 'Department', 'Base Salary', 'Deductions', 'Bonus', 'Net Pay', 'Status', 'Paid Date', ''].map(h => (
                <th key={h} className="text-xs text-slate-500 uppercase tracking-wider font-medium px-4 py-3 text-left whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id} className="border-b border-[#1e2536] last:border-0 hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-3">
                  <p className="text-sm font-medium text-slate-200">{p.staffName}</p>
                  <p className="text-xs text-slate-500">{p.position}</p>
                </td>
                <td className="px-4 py-3 text-sm text-slate-400 whitespace-nowrap">{p.department}</td>
                <td className="px-4 py-3 text-sm text-slate-300 whitespace-nowrap">${p.baseSalary.toLocaleString()}</td>
                <td className="px-4 py-3 text-sm text-red-400 whitespace-nowrap">-${p.deductions}</td>
                <td className="px-4 py-3 text-sm text-emerald-400 whitespace-nowrap">{p.bonus > 0 ? `+$${p.bonus}` : '—'}</td>
                <td className="px-4 py-3 text-sm font-bold text-white whitespace-nowrap">${p.net.toLocaleString()}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1 w-fit ${statusStyle[p.status]}`}>
                    {p.status === 'Paid' ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                    {p.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{p.paidDate}</td>
                <td className="px-4 py-3">
                  <button className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors" title="Download Payslip">
                    <Download size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-5 py-3 bg-[#0f1117]/40 border-t border-[#1e2536] flex items-center justify-between">
          <span className="text-xs text-slate-500">{selectedMonth} · {filtered.length} staff</span>
          <span className="text-sm font-bold text-white">Total: ${totalNet.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
