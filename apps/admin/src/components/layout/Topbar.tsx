'use client';

import Link from 'next/link';
import { Menu, Search, Shield, UserCircle2 } from 'lucide-react';
import { useAdminAuthStore } from '@/store/admin-auth.store';
import { useHydration } from '@/hooks/useHydration';

export default function Topbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const user = useAdminAuthStore((s) => s.user);
  const logout = useAdminAuthStore((s) => s.logout);
  const hydrated = useHydration();

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-[#d9ddd4] bg-[#f7f5ef] px-4 sm:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#d9ddd4] bg-white text-slate-700 lg:hidden"
          aria-label="Open navigation"
        >
          <Menu size={18} />
        </button>
        <div className="hidden w-80 items-center gap-3 rounded-lg border border-[#d9ddd4] bg-white px-3 py-2 md:flex">
          <Search size={14} className="text-slate-500" />
          <input
            type="text"
            placeholder="Search hotels, users, or actions..."
            className="flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
          />
        </div>
      </div>

      <div className="ml-3 flex items-center gap-3">
        <div className="hidden items-center gap-2 rounded-full border border-teal-700/15 bg-teal-700/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-teal-900 sm:flex">
          <Shield size={12} />
          Super Admin
        </div>
        {hydrated && user ? (
          <button
            type="button"
            onClick={() => logout()}
            className="flex items-center gap-2 rounded-lg border border-[#d9ddd4] bg-white px-3 py-2 text-sm font-medium text-slate-700"
          >
            <UserCircle2 size={16} />
            {user.name || 'Sign out'}
          </button>
        ) : (
          <Link
            href="/login"
            className="flex items-center gap-2 rounded-lg border border-[#d9ddd4] bg-white px-3 py-2 text-sm font-medium text-slate-700"
          >
            <UserCircle2 size={16} />
            Admin Login
          </Link>
        )}
      </div>
    </header>
  );
}
