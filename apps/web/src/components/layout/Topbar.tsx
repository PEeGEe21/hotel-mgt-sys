'use client';
import { Bell, Search } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';

export default function Topbar() {
  const user = useAuthStore((s) => s.user);
  return (
    <header className="h-16 bg-[#161b27] border-b border-[#1e2536] flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-3 bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2 w-72">
        <Search size={14} className="text-slate-500" />
        <input
          type="text"
          placeholder="Search rooms, guests, bookings..."
          className="bg-transparent text-sm text-slate-300 placeholder:text-slate-600 outline-none flex-1"
        />
      </div>
      <div className="flex items-center gap-4">
        <button className="relative w-9 h-9 rounded-lg border border-[#1e2536] bg-[#0f1117] flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors">
          <Bell size={16} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full" />
        </button>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold">
            {user?.email?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-slate-200 leading-none">{user?.email?.split('@')[0]}</p>
            <p className="text-xs text-slate-500 mt-0.5 capitalize">{user?.role?.toLowerCase()}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
