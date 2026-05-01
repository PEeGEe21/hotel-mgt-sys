'use client';
import Link from 'next/link';
import { Search, User, LogOut, ChevronDown, Menu } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useHydration } from '@/hooks/useHydration';
import NotificationInboxBell from '@/components/layout/NotificationInboxBell';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function Topbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const hydrated = useHydration();

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n: string) => n[0])
        .slice(0, 2)
        .join('')
    : 'U';

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-[#1e2536] bg-[#161b27] px-4 sm:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#1e2536] bg-[#0f1117] text-slate-300 lg:hidden"
          aria-label="Open navigation"
        >
          <Menu size={18} />
        </button>
        <div className="hidden w-72 items-center gap-3 rounded-lg border border-[#1e2536] bg-[#0f1117] px-3 py-2 md:flex">
          <Search size={14} className="text-slate-500" />
          <input
            type="text"
            placeholder="Search rooms, guests, bookings..."
            className="flex-1 bg-transparent text-sm text-slate-300 outline-none placeholder:text-slate-600"
          />
        </div>
      </div>
      <div className="ml-3 flex items-center gap-2 sm:gap-4">
        <NotificationInboxBell />
        {/* User avatar + info */}
        {!hydrated ? (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#1e2536] animate-pulse" />
            <div className="hidden sm:block space-y-1.5">
              <div className="w-20 h-3 rounded bg-[#1e2536] animate-pulse" />
              <div className="w-14 h-2.5 rounded bg-[#1e2536] animate-pulse" />
            </div>
          </div>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex min-w-0 items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/5 outline-none focus-visible:outline-none sm:min-w-28 sm:px-2.5">
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt="User Avatar"
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {initials}
                  </div>
                )}

                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium text-slate-200 leading-none">{user?.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5 capitalize">
                    {user?.role?.toLowerCase()}
                  </p>
                </div>
                <ChevronDown size={14} className="hidden text-slate-500 sm:block" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-44 !bg-[#161b27] border border-[#1e2536] ring-0 text-white">
              <DropdownMenuItem asChild>
                <Link href="/profile" className="flex items-center gap-2 cursor-pointer hover:!bg-white/5 !text-white outline-none focus-visible:outline-none">
                  <User size={14} /> Profile
                </Link>
              </DropdownMenuItem>
              {/* <DropdownMenuItem asChild>
                <Link href="/settings" className="flex items-center gap-2 cursor-pointer hover:!bg-white/5 !text-white">
                  <Settings size={14} /> Settings
                </Link>
              </DropdownMenuItem> */}
              <DropdownMenuSeparator className="bg-[#161b27]" />
              <DropdownMenuItem onClick={logout} className="text-red-400 focus:text-red-400 cursor-pointer hover:!bg-white/5 outline-none focus-visible:outline-none">
                <LogOut size={14} /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
