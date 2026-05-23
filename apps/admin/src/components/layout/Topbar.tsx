'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, LogOut, Menu, Search, Settings2, Shield, UserCircle2, Users } from 'lucide-react';
import { usePlatformSearch } from '@/hooks/usePlatform';
import { useAdminAuthStore } from '@/store/admin-auth.store';
import { useHydration } from '@/hooks/useHydration';

export default function Topbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const user = useAdminAuthStore((s) => s.user);
  const logout = useAdminAuthStore((s) => s.logout);
  const hydrated = useHydration();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const searchResults = usePlatformSearch(debouncedQuery);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 200);

    return () => window.clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    const handlePointer = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    window.addEventListener('mousedown', handlePointer);
    return () => window.removeEventListener('mousedown', handlePointer);
  }, []);

  const showSearchPanel = debouncedQuery.length >= 2;
  const resultCount = useMemo(() => {
    if (!searchResults.data) return 0;
    return (
      searchResults.data.hotels.length +
      searchResults.data.users.length +
      searchResults.data.actions.length
    );
  }, [searchResults.data]);

  const navigateToAuditSearch = () => {
    const params = new URLSearchParams();
    params.set('search', debouncedQuery);
    router.push(`/audit-logs?${params.toString()}`);
    setQuery('');
    setDebouncedQuery('');
  };

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
        <div className="relative hidden w-[min(34rem,100%)] md:block">
          <div className="flex items-center gap-3 rounded-lg border border-[#d9ddd4] bg-white px-3 py-2">
            <Search size={14} className="text-slate-500" />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search hotels, users, or actions..."
              className="flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
            />
          </div>

          {showSearchPanel ? (
            <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 overflow-hidden rounded-2xl border border-[#d9ddd4] bg-white shadow-xl">
              {searchResults.isLoading ? (
                <div className="px-4 py-4 text-sm text-slate-500">Searching platform data...</div>
              ) : resultCount === 0 ? (
                <div className="space-y-2 px-4 py-4">
                  <p className="text-sm text-slate-500">No quick matches found.</p>
                  <button
                    type="button"
                    onClick={navigateToAuditSearch}
                    className="text-sm font-semibold text-teal-900"
                  >
                    Search audit logs for “{debouncedQuery}”
                  </button>
                </div>
              ) : (
                <div className="max-h-[24rem] overflow-y-auto p-2">
                  {searchResults.data?.hotels.length ? (
                    <div className="mb-2 rounded-xl bg-slate-50 p-2">
                      <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                        Hotels
                      </p>
                      {searchResults.data.hotels.map((hotel) => (
                        <Link
                          key={hotel.id}
                          href={`/hotels/${hotel.id}`}
                          onClick={() => setQuery('')}
                          className="block rounded-lg px-2 py-2 text-sm text-slate-700 transition hover:bg-white hover:text-slate-900"
                        >
                          <p className="font-medium text-slate-900">{hotel.name}</p>
                          <p className="text-xs text-slate-500">
                            {hotel.city}, {hotel.country}
                            {hotel.domain ? ` • ${hotel.domain}` : ''}
                          </p>
                        </Link>
                      ))}
                    </div>
                  ) : null}

                  {searchResults.data?.users.length ? (
                    <div className="mb-2 rounded-xl bg-slate-50 p-2">
                      <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                        Users
                      </p>
                      {searchResults.data.users.map((userResult) => (
                        <Link
                          key={userResult.id}
                          href={`/users/${userResult.id}`}
                          onClick={() => setQuery('')}
                          className="block rounded-lg px-2 py-2 text-sm text-slate-700 transition hover:bg-white hover:text-slate-900"
                        >
                          <p className="font-medium text-slate-900">{userResult.name}</p>
                          <p className="text-xs text-slate-500">
                            {userResult.email}
                            {userResult.hotel ? ` • ${userResult.hotel.name}` : ''}
                          </p>
                        </Link>
                      ))}
                    </div>
                  ) : null}

                  {searchResults.data?.actions.length ? (
                    <div className="rounded-xl bg-slate-50 p-2">
                      <div className="flex items-center justify-between px-2 pb-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Actions</p>
                        <button
                          type="button"
                          onClick={navigateToAuditSearch}
                          className="text-xs font-semibold text-teal-900"
                        >
                          View all
                        </button>
                      </div>
                      {searchResults.data.actions.map((action) => (
                        <button
                          key={action.id}
                          type="button"
                          onClick={navigateToAuditSearch}
                          className="block w-full rounded-lg px-2 py-2 text-left text-sm text-slate-700 transition hover:bg-white hover:text-slate-900"
                        >
                          <p className="font-medium text-slate-900">{action.action}</p>
                          <p className="text-xs text-slate-500">
                            {action.actorName}
                            {action.hotel ? ` • ${action.hotel.name}` : ''}
                          </p>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>

      <div className="ml-3 flex items-center gap-3">
        <div className="hidden items-center gap-2 rounded-full border border-teal-700/15 bg-teal-700/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-teal-900 sm:flex">
          <Shield size={12} />
          Super Admin
        </div>
        {hydrated && user ? (
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((current) => !current)}
              className="flex items-center gap-2 rounded-lg border border-[#d9ddd4] bg-white px-3 py-2 text-sm font-medium text-slate-700"
            >
              <UserCircle2 size={16} />
              <span className="max-w-32 truncate">{user.name || user.email}</span>
              <ChevronDown size={14} className="text-slate-500" />
            </button>

            {menuOpen ? (
              <div className="absolute right-0 top-[calc(100%+0.5rem)] z-30 w-60 overflow-hidden rounded-2xl border border-[#d9ddd4] bg-white shadow-xl">
                <div className="border-b border-slate-100 px-4 py-3">
                  <p className="truncate text-sm font-semibold text-slate-900">{user.name || user.email}</p>
                  <p className="truncate text-xs text-slate-500">{user.email}</p>
                </div>
                <div className="p-2">
                  <Link
                    href="/profile"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
                  >
                    <Settings2 size={15} />
                    My profile
                  </Link>
                  <Link
                    href="/admins"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
                  >
                    <Users size={15} />
                    Super admins
                  </Link>
                  <button
                    type="button"
                    onClick={() => logout()}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-rose-700 transition hover:bg-rose-50"
                  >
                    <LogOut size={15} />
                    Sign out
                  </button>
                </div>
              </div>
            ) : null}
          </div>
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
