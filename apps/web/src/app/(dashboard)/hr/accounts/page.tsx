'use client';

import { useState } from 'react';
import { UserCog, Plus, Search, Shield, X, Pencil, Trash2, CheckCircle2, XCircle, Key } from 'lucide-react';

type Role = 'ADMIN' | 'MANAGER' | 'RECEPTIONIST' | 'HOUSEKEEPING' | 'CASHIER' | 'BARTENDER' | 'STAFF';
type AccountStatus = 'Active' | 'Suspended' | 'Pending';

type UserAccount = {
  id: string; staffName: string; username: string; email: string;
  role: Role; status: AccountStatus; lastLogin: string; createdAt: string;
};

const accounts: UserAccount[] = [
  { id: 'a1', staffName: 'Blessing Adeyemi', username: 'blessing.a', email: 'blessing.a@hotel.com', role: 'MANAGER', status: 'Active', lastLogin: '2026-03-11 08:32', createdAt: '2022-01-15' },
  { id: 'a2', staffName: 'Chidi Nwosu', username: 'chidi.n', email: 'chidi.n@hotel.com', role: 'RECEPTIONIST', status: 'Active', lastLogin: '2026-03-11 07:58', createdAt: '2022-03-01' },
  { id: 'a3', staffName: 'Ngozi Eze', username: 'ngozi.e', email: 'ngozi.e@hotel.com', role: 'RECEPTIONIST', status: 'Active', lastLogin: '2026-03-10 19:02', createdAt: '2023-06-10' },
  { id: 'a4', staffName: 'Emeka Obi', username: 'emeka.o', email: 'emeka.o@hotel.com', role: 'HOUSEKEEPING', status: 'Active', lastLogin: '2026-03-11 07:45', createdAt: '2022-08-20' },
  { id: 'a5', staffName: 'Tunde Bakare', username: 'tunde.b', email: 'tunde.b@hotel.com', role: 'BARTENDER', status: 'Active', lastLogin: '2026-03-10 22:15', createdAt: '2022-11-01' },
  { id: 'a6', staffName: 'Kemi Adebayo', username: 'kemi.a', email: 'kemi.a@hotel.com', role: 'CASHIER', status: 'Suspended', lastLogin: '2026-03-01 09:10', createdAt: '2023-04-15' },
  { id: 'a7', staffName: 'Adaeze Okafor', username: 'adaeze.o', email: 'adaeze.o@hotel.com', role: 'HOUSEKEEPING', status: 'Active', lastLogin: '2026-03-11 08:00', createdAt: '2023-01-05' },
  { id: 'a8', staffName: 'Yetunde Aina', username: 'yetunde.a', email: 'yetunde.a@hotel.com', role: 'STAFF', status: 'Pending', lastLogin: 'Never', createdAt: '2024-02-01' },
];

const roleColors: Record<Role, string> = {
  ADMIN: 'text-violet-400 bg-violet-500/15',
  MANAGER: 'text-blue-400 bg-blue-500/15',
  RECEPTIONIST: 'text-sky-400 bg-sky-500/15',
  HOUSEKEEPING: 'text-emerald-400 bg-emerald-500/15',
  CASHIER: 'text-amber-400 bg-amber-500/15',
  BARTENDER: 'text-orange-400 bg-orange-500/15',
  STAFF: 'text-slate-400 bg-slate-500/15',
};

const statusStyle: Record<AccountStatus, string> = {
  Active: 'bg-emerald-500/15 text-emerald-400',
  Suspended: 'bg-red-500/15 text-red-400',
  Pending: 'bg-amber-500/15 text-amber-400',
};

const roles: Role[] = ['ADMIN', 'MANAGER', 'RECEPTIONIST', 'HOUSEKEEPING', 'CASHIER', 'BARTENDER', 'STAFF'];

export default function UserAccountsPage() {
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const filtered = accounts.filter(a =>
    `${a.staffName} ${a.username} ${a.email} ${a.role}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">User Accounts</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage system access and roles for staff</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
          <Plus size={15} /> Create Account
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Accounts', value: accounts.length, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
          { label: 'Active', value: accounts.filter(a => a.status === 'Active').length, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
          { label: 'Suspended', value: accounts.filter(a => a.status === 'Suspended').length, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
          { label: 'Pending Setup', value: accounts.filter(a => a.status === 'Pending').length, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`${bg} border rounded-xl px-4 py-4`}>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 bg-[#161b27] border border-[#1e2536] rounded-lg px-3 py-2 max-w-80">
        <Search size={14} className="text-slate-500" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search accounts..."
          className="bg-transparent text-sm text-slate-300 placeholder:text-slate-600 outline-none flex-1" />
      </div>

      <div className="bg-[#161b27] border border-[#1e2536] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-[#1e2536] bg-[#0f1117]/50">
            <tr>
              {['Staff Member', 'Username', 'Role', 'Status', 'Last Login', 'Created', ''].map(h => (
                <th key={h} className="text-xs text-slate-500 uppercase tracking-wider font-medium px-4 py-3 text-left whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(acc => (
              <tr key={acc.id} className="border-b border-[#1e2536] last:border-0 hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/30 to-violet-500/30 border border-white/10 flex items-center justify-center text-xs font-bold text-white shrink-0">
                      {acc.staffName.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-200">{acc.staffName}</p>
                      <p className="text-xs text-slate-500">{acc.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-slate-400 font-mono">{acc.username}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${roleColors[acc.role]}`}>{acc.role}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1 w-fit ${statusStyle[acc.status]}`}>
                    {acc.status === 'Active' ? <CheckCircle2 size={10} /> : acc.status === 'Suspended' ? <XCircle size={10} /> : null}
                    {acc.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{acc.lastLogin}</td>
                <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{acc.createdAt}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button className="p-1.5 rounded-lg text-slate-500 hover:text-amber-400 hover:bg-amber-500/10 transition-colors" title="Reset Password"><Key size={13} /></button>
                    <button className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"><Pencil size={13} /></button>
                    <button className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"><Trash2 size={13} /></button>
                  </div>
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
              <h2 className="text-lg font-bold text-white">Create User Account</h2>
              <button onClick={() => setShowAdd(false)} className="text-slate-500 hover:text-slate-300"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              {[
                { label: 'Staff Member', placeholder: 'Select staff member' },
                { label: 'Username', placeholder: 'e.g. john.doe' },
                { label: 'Email', placeholder: 'work email address' },
                { label: 'Temporary Password', placeholder: 'Will be changed on first login', type: 'password' },
              ].map(({ label, placeholder, type }) => (
                <div key={label}>
                  <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">{label}</label>
                  <input type={type ?? 'text'} placeholder={placeholder}
                    className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-blue-500 transition-colors" />
                </div>
              ))}
              <div>
                <label className="text-xs text-slate-500 uppercase tracking-wider mb-2 block">Assign Role</label>
                <div className="flex flex-wrap gap-2">
                  {roles.map(r => (
                    <button key={r} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors bg-[#0f1117] border-[#1e2536] ${roleColors[r].split(' ')[0]} hover:opacity-80`}>{r}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowAdd(false)} className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg py-2.5 text-sm font-medium transition-colors">Cancel</button>
              <button className="flex-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg py-2.5 text-sm font-semibold transition-colors">Create Account</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
