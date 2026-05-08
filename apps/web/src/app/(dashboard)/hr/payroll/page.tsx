'use client';

import Link from 'next/link';
import { ArrowLeft, Clock3, Receipt } from 'lucide-react';

export default function PayrollPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/hr"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#1e2536] bg-[#161b27] text-slate-400 transition-colors hover:text-slate-200"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Payroll</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            This module is reserved for a future release.
          </p>
        </div>
      </div>

      <div className="max-w-2xl rounded-2xl border border-[#1e2536] bg-[#161b27] p-6">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10 text-amber-300">
          <Clock3 size={20} />
        </div>
        <div className="space-y-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">
            <Receipt size={12} />
            Coming soon
          </span>
          <h2 className="text-lg font-semibold text-white">Payroll is not live yet</h2>
          <p className="text-sm leading-6 text-slate-400">
            We’ve hidden payroll from day-to-day navigation for now so it does not look active before
            the feature is ready. When payroll ships, this area can expand into salary runs,
            deductions, payslips, and approval workflows.
          </p>
          <p className="text-sm text-slate-500">
            User accounts, permissions, and contracts remain available under HR today.
          </p>
        </div>
      </div>
    </div>
  );
}
