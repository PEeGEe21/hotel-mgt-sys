'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  UserCheck, Search, Plus, Phone, Mail, ChevronRight,
  Shield, Clock, X, Briefcase
} from 'lucide-react';

type StaffRole = 'Admin' | 'Manager' | 'Receptionist' | 'Housekeeping' | 'Cashier' | 'Bartender' | 'Security' | 'Maintenance';
type StaffStatus = 'Active' | 'On Leave' | 'Off Duty' | 'Clocked In';

type StaffMember = {
  id: string; employeeCode: string; firstName: string; lastName: string;
  email: string; phone: string; department: string; position: string;
  role: StaffRole; status: StaffStatus; hireDate: string; avatar?: string;
  shift: string; salary: number;
};

export const staffList: StaffMember[] = [
  { id: 's1', employeeCode: 'EMP001', firstName: 'Blessing', lastName: 'Adeyemi', email: 'blessing.a@hotel.com', phone: '+234 802 111 2222', department: 'Management', position: 'Hotel Manager', role: 'Manager', status: 'Clocked In', hireDate: '2022-01-15', shift: 'Morning', salary: 2800 },
  { id: 's2', employeeCode: 'EMP002', firstName: 'Chidi', lastName: 'Nwosu', email: 'chidi.n@hotel.com', phone: '+234 803 222 3333', department: 'Front Desk', position: 'Head Receptionist', role: 'Receptionist', status: 'Clocked In', hireDate: '2022-03-01', shift: 'Morning', salary: 1400 },
  { id: 's3', employeeCode: 'EMP003', firstName: 'Ngozi', lastName: 'Eze', email: 'ngozi.e@hotel.com', phone: '+234 804 333 4444', department: 'Front Desk', position: 'Receptionist', role: 'Receptionist', status: 'Off Duty', hireDate: '2023-06-10', shift: 'Evening', salary: 1100 },
  { id: 's4', employeeCode: 'EMP004', firstName: 'Emeka', lastName: 'Obi', email: 'emeka.o@hotel.com', phone: '+234 805 444 5555', department: 'Housekeeping', position: 'Head Housekeeper', role: 'Housekeeping', status: 'Clocked In', hireDate: '2022-08-20', shift: 'Morning', salary: 1200 },
  { id: 's5', employeeCode: 'EMP005', firstName: 'Adaeze', lastName: 'Okafor', email: 'adaeze.o@hotel.com', phone: '+234 806 555 6666', department: 'Housekeeping', position: 'Housekeeper', role: 'Housekeeping', status: 'Clocked In', hireDate: '2023-01-05', shift: 'Morning', salary: 900 },
  { id: 's6', employeeCode: 'EMP006', firstName: 'Tunde', lastName: 'Bakare', email: 'tunde.b@hotel.com', phone: '+234 807 666 7777', department: 'Bar', position: 'Head Bartender', role: 'Bartender', status: 'Clocked In', hireDate: '2022-11-01', shift: 'Evening', salary: 1300 },
  { id: 's7', employeeCode: 'EMP007', firstName: 'Kemi', lastName: 'Adebayo', email: 'kemi.a@hotel.com', phone: '+234 808 777 8888', department: 'Finance', position: 'Cashier', role: 'Cashier', status: 'On Leave', hireDate: '2023-04-15', shift: 'Morning', salary: 1050 },
  { id: 's8', employeeCode: 'EMP008', firstName: 'Seun', lastName: 'Lawal', email: 'seun.l@hotel.com', phone: '+234 809 888 9999', department: 'Security', position: 'Security Officer', role: 'Security', status: 'Clocked In', hireDate: '2023-09-01', shift: 'Night', salary: 950 },
  { id: 's9', employeeCode: 'EMP009', firstName: 'Yetunde', lastName: 'Aina', email: 'yetunde.a@hotel.com', phone: '+234 810 999 0000', department: 'Maintenance', position: 'Maintenance Tech', role: 'Maintenance', status: 'Off Duty', hireDate: '2024-02-01', shift: 'Morning', salary: 1000 },
];

const statusStyle: Record<StaffStatus, string> = {
  'Clocked In': 'bg-emerald-500/15 text-emerald-400',
  'Active': 'bg-blue-500/15 text-blue-400',
  'On Leave': 'bg-amber-500/15 text-amber-400',
  'Off Duty': 'bg-slate-500/15 text-slate-400',
};

const roleColor: Record<StaffRole, string> = {
  Admin: 'text-violet-400', Manager: 'text-blue-400', Receptionist: 'text-sky-400',
  Housekeeping: 'text-emerald-400', Cashier: 'text-amber-400', Bartender: 'text-orange-400',
  Security: 'text-red-400', Maintenance: 'text-slate-400',
};

const departments = ['All', 'Management', 'Front Desk', 'Housekeeping', 'Bar', 'Finance', 'Security', 'Maintenance'];

function AddStaffModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#161b27] border border-[#1e2536] rounded-2xl p-6 w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">Add Staff Member</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors"><X size={18} /></button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'First Name', col: 1 }, { label: 'Last Name', col: 1 },
            { label: 'Email', col: 2 }, { label: 'Phone', col: 1 },
            { label: 'Department', col: 1 }, { label: 'Position', col: 1 },
            { label: 'Salary', col: 1 },
          ].map(({ label, col }) => (
            <div key={label} className={col === 2 ? 'col-span-2' : ''}>
              <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">{label}</label>
              <input type="text" placeholder={label} className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-blue-500 transition-colors" />
            </div>
          ))}
          <div className="col-span-2">
            <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">Role</label>
            <div className="flex flex-wrap gap-2">
              {(['Manager', 'Receptionist', 'Housekeeping', 'Cashier', 'Bartender', 'Security', 'Maintenance'] as StaffRole[]).map(r => (
                <button key={r} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#0f1117] border border-[#1e2536] text-slate-400 hover:text-slate-200 transition-colors">{r}</button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg py-2.5 text-sm font-medium transition-colors">Cancel</button>
          <button className="flex-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg py-2.5 text-sm font-semibold transition-colors">Add Staff</button>
        </div>
      </div>
    </div>
  );
}

export default function StaffPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [dept, setDept] = useState('All');
  const [showAdd, setShowAdd] = useState(false);

  const filtered = staffList.filter(s => {
    const matchSearch = `${s.firstName} ${s.lastName} ${s.position} ${s.employeeCode}`.toLowerCase().includes(search.toLowerCase());
    const matchDept = dept === 'All' || s.department === dept;
    return matchSearch && matchDept;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Staff</h1>
          <p className="text-slate-500 text-sm mt-0.5">{staffList.length} team members</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
          <Plus size={15} /> Add Staff
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Staff', value: staffList.length, icon: UserCheck, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
          { label: 'Clocked In', value: staffList.filter(s => s.status === 'Clocked In').length, icon: Clock, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
          { label: 'On Leave', value: staffList.filter(s => s.status === 'On Leave').length, icon: Briefcase, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
          { label: 'Departments', value: departments.length - 1, icon: Shield, color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`${bg} border rounded-xl px-4 py-4 flex items-center gap-3`}>
            <Icon size={18} className={color} />
            <div>
              <p className="text-2xl font-bold text-white">{value}</p>
              <p className="text-xs text-slate-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search + Department filter */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 bg-[#161b27] border border-[#1e2536] rounded-lg px-3 py-2 flex-1 min-w-56">
          <Search size={14} className="text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, position or code..."
            className="bg-transparent text-sm text-slate-300 placeholder:text-slate-600 outline-none flex-1" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {departments.map(d => (
            <button key={d} onClick={() => setDept(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${dept === d ? 'bg-blue-600/20 border-blue-500/30 text-blue-400' : 'bg-[#161b27] border-[#1e2536] text-slate-400 hover:text-slate-200'}`}>
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-[#161b27] border border-[#1e2536] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-[#1e2536] bg-[#0f1117]/50">
            <tr>
              {['Staff Member', 'Contact', 'Department', 'Shift', 'Status', 'Salary', ''].map(h => (
                <th key={h} className="text-xs text-slate-500 uppercase tracking-wider font-medium px-4 py-3 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s.id} onClick={() => router.push(`/staff/${s.id}`)}
                className="border-b border-[#1e2536] last:border-0 hover:bg-white/[0.02] transition-colors cursor-pointer">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-600/50 to-slate-700/50 border border-white/10 flex items-center justify-center text-sm font-bold text-white shrink-0">
                      {s.firstName[0]}{s.lastName[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-200">{s.firstName} {s.lastName}</p>
                      <p className={`text-xs font-medium ${roleColor[s.role]}`}>{s.position}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <p className="text-xs text-slate-400 flex items-center gap-1.5"><Phone size={10} className="text-slate-600" />{s.phone}</p>
                  <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5"><Mail size={10} className="text-slate-600" />{s.email}</p>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs bg-slate-500/15 text-slate-400 px-2.5 py-1 rounded-full">{s.department}</span>
                </td>
                <td className="px-4 py-3 text-sm text-slate-400">{s.shift}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusStyle[s.status]}`}>{s.status}</span>
                </td>
                <td className="px-4 py-3 text-sm text-slate-300">${s.salary.toLocaleString()}/mo</td>
                <td className="px-4 py-3"><ChevronRight size={16} className="text-slate-600" /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-16 text-center">
            <UserCheck size={32} className="text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No staff found</p>
          </div>
        )}
      </div>

      {showAdd && <AddStaffModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}