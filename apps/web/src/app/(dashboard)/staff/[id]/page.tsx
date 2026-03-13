'use client';

import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Phone, Mail, Briefcase, Calendar, DollarSign,
  Clock, Edit2, CheckCircle2, XCircle, AlertTriangle,
  Shield, TrendingUp, FileText, UserCheck
} from 'lucide-react';

type StaffRole = 'Admin' | 'Manager' | 'Receptionist' | 'Housekeeping' | 'Cashier' | 'Bartender' | 'Security' | 'Maintenance';
type StaffStatus = 'Active' | 'On Leave' | 'Off Duty' | 'Clocked In';

type StaffMember = {
  id: string; employeeCode: string; firstName: string; lastName: string;
  email: string; phone: string; department: string; position: string;
  role: StaffRole; status: StaffStatus; hireDate: string;
  shift: string; salary: number;
};

const staffList: StaffMember[] = [
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

const attendanceLog = [
  { date: 'Mon, Mar 10', clockIn: '07:58 AM', clockOut: '04:02 PM', hours: 8.1, status: 'Full Day' },
  { date: 'Tue, Mar 09', clockIn: '08:03 AM', clockOut: '04:00 PM', hours: 7.9, status: 'Full Day' },
  { date: 'Wed, Mar 08', clockIn: '08:30 AM', clockOut: '04:00 PM', hours: 7.5, status: 'Late' },
  { date: 'Thu, Mar 07', clockIn: '07:55 AM', clockOut: '04:05 PM', hours: 8.2, status: 'Full Day' },
  { date: 'Fri, Mar 06', clockIn: '—', clockOut: '—', hours: 0, status: 'Absent' },
  { date: 'Sat, Mar 05', clockIn: '08:00 AM', clockOut: '12:00 PM', hours: 4, status: 'Half Day' },
  { date: 'Sun, Mar 04', clockIn: '—', clockOut: '—', hours: 0, status: 'Day Off' },
];

const statusStyle: Record<StaffStatus, string> = {
  'Clocked In': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  'Active': 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  'On Leave': 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  'Off Duty': 'bg-slate-500/15 text-slate-400 border-slate-500/20',
};

const attendanceStyle: Record<string, string> = {
  'Full Day': 'bg-emerald-500/15 text-emerald-400',
  'Late': 'bg-amber-500/15 text-amber-400',
  'Half Day': 'bg-blue-500/15 text-blue-400',
  'Absent': 'bg-red-500/15 text-red-400',
  'Day Off': 'bg-slate-500/15 text-slate-400',
};

const roleColor: Record<StaffRole, string> = {
  Admin: 'text-violet-400', Manager: 'text-blue-400', Receptionist: 'text-sky-400',
  Housekeeping: 'text-emerald-400', Cashier: 'text-amber-400', Bartender: 'text-orange-400',
  Security: 'text-red-400', Maintenance: 'text-slate-400',
};

export default function StaffDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const staff = staffList.find(s => s.id === id) ?? staffList[0];

  const totalHours = attendanceLog.reduce((s, d) => s + d.hours, 0);
  const daysPresent = attendanceLog.filter(d => d.status !== 'Absent' && d.status !== 'Day Off').length;
  const hireDate = new Date(staff.hireDate);
  const monthsEmployed = Math.floor((Date.now() - hireDate.getTime()) / (1000 * 60 * 60 * 24 * 30));

  return (
    <div className="space-y-6 max-w-full">
      {/* Back + Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/staff')}
            className="w-9 h-9 rounded-lg bg-[#161b27] border border-[#1e2536] flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors">
            <ArrowLeft size={16} />
          </button>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-600/50 to-slate-700/50 border border-white/10 flex items-center justify-center text-xl font-bold text-white">
              {staff.firstName[0]}{staff.lastName[0]}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-white">{staff.firstName} {staff.lastName}</h1>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${statusStyle[staff.status]}`}>{staff.status}</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <p className={`text-sm font-medium ${roleColor[staff.role]}`}>{staff.position}</p>
                <span className="text-slate-700">·</span>
                <p className="text-sm text-slate-500">{staff.department}</p>
                <span className="text-slate-700">·</span>
                <p className="text-sm text-slate-500">{staff.employeeCode}</p>
              </div>
            </div>
          </div>
        </div>
        <button className="flex items-center gap-2 bg-[#161b27] border border-[#1e2536] hover:border-blue-500/40 text-slate-300 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Edit2 size={14} /> Edit Profile
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left */}
        <div className="space-y-5">
          {/* Contact */}
          <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5">
            <h2 className="text-xs text-slate-500 uppercase tracking-widest font-medium mb-4">Contact & Info</h2>
            <div className="space-y-3">
              {[
                { icon: Phone, label: 'Phone', value: staff.phone },
                { icon: Mail, label: 'Email', value: staff.email },
                { icon: Briefcase, label: 'Department', value: staff.department },
                { icon: Shield, label: 'Role', value: staff.role },
                { icon: Clock, label: 'Shift', value: `${staff.shift} Shift` },
                { icon: Calendar, label: 'Hire Date', value: staff.hireDate },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#0f1117] border border-[#1e2536] flex items-center justify-center shrink-0">
                    <Icon size={13} className="text-slate-500" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-600">{label}</p>
                    <p className="text-sm text-slate-300">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5">
            <h2 className="text-xs text-slate-500 uppercase tracking-widest font-medium mb-4">This Week</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Hours Worked', value: `${totalHours.toFixed(1)}h`, color: 'text-blue-400' },
                { label: 'Days Present', value: `${daysPresent}/6`, color: 'text-emerald-400' },
                { label: 'Monthly Pay', value: `$${staff.salary.toLocaleString()}`, color: 'text-violet-400' },
                { label: 'Tenure', value: `${monthsEmployed}mo`, color: 'text-amber-400' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-[#0f1117] border border-[#1e2536] rounded-lg p-3">
                  <p className="text-xs text-slate-600 mb-1">{label}</p>
                  <p className={`text-sm font-bold ${color}`}>{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5">
            <h2 className="text-xs text-slate-500 uppercase tracking-widest font-medium mb-3">Actions</h2>
            <div className="space-y-2">
              {[
                { label: 'Clock In / Out', icon: Clock, color: 'text-emerald-400', bg: 'hover:bg-emerald-500/10' },
                { label: 'Request Leave', icon: Calendar, color: 'text-amber-400', bg: 'hover:bg-amber-500/10' },
                { label: 'View Pay Slip', icon: DollarSign, color: 'text-blue-400', bg: 'hover:bg-blue-500/10' },
                { label: 'Performance Review', icon: TrendingUp, color: 'text-violet-400', bg: 'hover:bg-violet-500/10' },
              ].map(({ label, icon: Icon, color, bg }) => (
                <button key={label} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-transparent ${bg} transition-colors text-left`}>
                  <Icon size={15} className={color} />
                  <span className="text-sm text-slate-300">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right — 2 wide */}
        <div className="xl:col-span-2 space-y-5">
          {/* Today's Clock Status */}
          <div className={`border rounded-xl p-5 flex items-center justify-between ${staff.status === 'Clocked In' ? 'bg-emerald-500/10 border-emerald-500/25' : 'bg-[#161b27] border-[#1e2536]'}`}>
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${staff.status === 'Clocked In' ? 'bg-emerald-500/20' : 'bg-slate-500/10'}`}>
                <UserCheck size={22} className={staff.status === 'Clocked In' ? 'text-emerald-400' : 'text-slate-500'} />
              </div>
              <div>
                <p className="text-base font-bold text-white">
                  {staff.status === 'Clocked In' ? 'Currently Clocked In' : 'Not Clocked In Today'}
                </p>
                <p className="text-sm text-slate-500 mt-0.5">
                  {staff.status === 'Clocked In' ? 'Since 07:58 AM · 4h 22m elapsed' : 'Last seen: Yesterday, 4:02 PM'}
                </p>
              </div>
            </div>
            <button className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${staff.status === 'Clocked In' ? 'bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/20' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}>
              {staff.status === 'Clocked In' ? 'Clock Out' : 'Clock In'}
            </button>
          </div>

          {/* Attendance Log */}
          <div className="bg-[#161b27] border border-[#1e2536] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#1e2536] flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2"><Clock size={14} className="text-blue-400" /> Attendance — This Week</h2>
              <button className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1.5 transition-colors">
                <FileText size={12} /> Full Report
              </button>
            </div>
            <table className="w-full">
              <thead className="border-b border-[#1e2536] bg-[#0f1117]/40">
                <tr>
                  {['Date', 'Clock In', 'Clock Out', 'Hours', 'Status'].map(h => (
                    <th key={h} className="text-xs text-slate-500 uppercase tracking-wider font-medium px-4 py-2.5 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {attendanceLog.map((day, i) => (
                  <tr key={i} className="border-b border-[#1e2536] last:border-0 hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 text-sm text-slate-300">{day.date}</td>
                    <td className="px-4 py-3">
                      <span className={`text-sm ${day.clockIn === '—' ? 'text-slate-600' : 'text-slate-300'}`}>{day.clockIn}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm ${day.clockOut === '—' ? 'text-slate-600' : 'text-slate-300'}`}>{day.clockOut}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-medium ${day.hours > 0 ? 'text-slate-200' : 'text-slate-600'}`}>
                        {day.hours > 0 ? `${day.hours}h` : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${attendanceStyle[day.status]}`}>
                        {day.status === 'Full Day' && <span className="flex items-center gap-1"><CheckCircle2 size={10} /> {day.status}</span>}
                        {day.status === 'Absent' && <span className="flex items-center gap-1"><XCircle size={10} /> {day.status}</span>}
                        {day.status === 'Late' && <span className="flex items-center gap-1"><AlertTriangle size={10} /> {day.status}</span>}
                        {(day.status === 'Half Day' || day.status === 'Day Off') && day.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-5 py-3 bg-[#0f1117]/40 border-t border-[#1e2536] flex items-center justify-between">
              <span className="text-xs text-slate-500">Total hours this week</span>
              <span className="text-sm font-bold text-white">{totalHours.toFixed(1)} hrs</span>
            </div>
          </div>

          {/* Leave History */}
          <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2"><Calendar size={14} className="text-violet-400" /> Leave History</h2>
              <button className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors">
                <FileText size={12} /> Request Leave
              </button>
            </div>
            <div className="space-y-3">
              {[
                { type: 'Annual Leave', from: '2026-01-06', to: '2026-01-10', days: 5, status: 'Approved' },
                { type: 'Sick Leave', from: '2025-11-14', to: '2025-11-15', days: 2, status: 'Approved' },
                { type: 'Annual Leave', from: '2025-08-04', to: '2025-08-08', days: 5, status: 'Approved' },
              ].map((leave, i) => (
                <div key={i} className="flex items-center justify-between py-2.5 border-b border-[#1e2536] last:border-0">
                  <div>
                    <p className="text-sm font-medium text-slate-200">{leave.type}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{leave.from} → {leave.to} · {leave.days} days</p>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-emerald-500/15 text-emerald-400">{leave.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}