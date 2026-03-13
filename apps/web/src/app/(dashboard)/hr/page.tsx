'use client';

import Link from 'next/link';
import { UserCog, FileText, Receipt, ChevronRight, Users, ShieldCheck, DollarSign } from 'lucide-react';

export default function HRPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Human Resources</h1>
        <p className="text-slate-500 text-sm mt-0.5">Manage user access, contracts and payroll</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'User Accounts', description: 'Create logins and assign system roles to staff members', href: '/hr/accounts', icon: UserCog, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
          { label: 'Contracts', description: 'Manage staff employment contracts and documents', href: '/hr/contracts', icon: FileText, color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20' },
          { label: 'Payroll', description: 'Salary records, payment history and payslips', href: '/hr/payroll', icon: Receipt, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
        ].map(({ label, description, href, icon: Icon, color, bg }) => (
          <Link key={href} href={href}
            className="bg-[#161b27] border border-[#1e2536] hover:border-slate-600 rounded-xl p-5 group transition-all">
            <div className={`w-11 h-11 rounded-xl border ${bg} flex items-center justify-center mb-4`}>
              <Icon size={20} className={color} />
            </div>
            <p className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors">{label}</p>
            <p className="text-xs text-slate-500 mt-1">{description}</p>
          </Link>
        ))}
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Staff with System Access', value: '7', icon: ShieldCheck, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
          { label: 'Active Contracts', value: '9', icon: FileText, color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20' },
          { label: 'Monthly Payroll', value: '₦11.7M', icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`${bg} border rounded-xl px-4 py-4 flex items-center gap-3`}>
            <Icon size={18} className={color} />
            <div>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-slate-500">{label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
