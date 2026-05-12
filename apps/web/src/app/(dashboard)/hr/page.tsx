'use client';

import Link from 'next/link';
import {
  BookOpen,
  UserCog,
  FileText,
  Receipt,
  Settings,
  ShieldCheck,
  DollarSign,
  History,
} from 'lucide-react';

export default function HRPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Human Resources</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Overview, contract operations, access control, and future HR reporting
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Overview', description: 'Track contract health, approvals, and staffing signals', href: '/hr/overview', icon: BookOpen, color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20' },
          { label: 'User Accounts', description: 'Create logins and assign system roles to staff members', href: '/hr/accounts', icon: UserCog, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
          { label: 'Contracts', description: 'Manage staff employment contracts and documents', href: '/hr/contracts', icon: FileText, color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20' },
          { label: 'Audit Logs', description: 'Search HR contract history across approvals, renewals, and documents', href: '/hr/audit-logs', icon: History, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' },
          { label: 'Settings', description: 'Approval routes and future HR-specific configuration', href: '/hr/settings', icon: Settings, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
          { label: 'Payroll', description: 'Salary records, payment history and payslips', href: '/hr/payroll', icon: Receipt, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', disabled: true, badge: 'Coming soon' },
        ].map(({ label, description, href, icon: Icon, color, bg, disabled, badge }) => (
          disabled ? (
            <div key={href} className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5 opacity-85">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className={`w-11 h-11 rounded-xl border ${bg} flex items-center justify-center`}>
                  <Icon size={20} className={color} />
                </div>
                {badge ? (
                  <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-300">
                    {badge}
                  </span>
                ) : null}
              </div>
              <p className="text-sm font-bold text-slate-200">{label}</p>
              <p className="text-xs text-slate-500 mt-1">{description}</p>
            </div>
          ) : (
            <Link key={href} href={href}
              className="bg-[#161b27] border border-[#1e2536] hover:border-slate-600 rounded-xl p-5 group transition-all">
              <div className={`w-11 h-11 rounded-xl border ${bg} flex items-center justify-center mb-4`}>
                <Icon size={20} className={color} />
              </div>
              <p className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors">{label}</p>
              <p className="text-xs text-slate-500 mt-1">{description}</p>
            </Link>
          )
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
