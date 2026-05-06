'use client';

import { Clock } from 'lucide-react';
import { DashboardRenderer } from './_components/DashboardRenderer';
import { useAuthStore } from '@/store/auth.store';

export default function DashboardPage() {
  const { user } = useAuthStore();
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Welcome back, <span className="capitalize">{user?.username}</span>
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">Here&apos;s what you can act on today.</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-[#1e2536] bg-[#161b27] px-4 py-2 text-sm text-slate-400">
          <Clock size={14} />
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </div>
      </div>

      <DashboardRenderer />
    </div>
  );
}
