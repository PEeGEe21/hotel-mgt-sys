'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { LayoutDashboard, Building2, Users, Shield, ScrollText, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const nav = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Hotels', href: '/hotels', icon: Building2 },
  { label: 'Users', href: '/users', icon: Users },
  { label: 'Audit Logs', href: '/audit-logs', icon: ScrollText },
];

type SidebarProps = {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
};

function SidebarContent({ mobile = false, pathname, onNavigate }: { mobile?: boolean; pathname: string; onNavigate?: () => void }) {
  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r border-[#d9ddd4] bg-[#f7f5ef] shrink-0',
        mobile ? 'w-[min(86vw,18rem)]' : 'hidden w-64 lg:flex',
      )}
    >
      <div className="flex items-center gap-3 border-b border-[#d9ddd4] px-5 py-5 lg:px-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-700 to-slate-800">
          <Shield size={18} className="text-white" />
        </div>
        <div className="min-w-0">
          <span className="block truncate text-base font-bold tracking-tight text-slate-900">HotelOS Admin</span>
          <p className="text-[10px] uppercase tracking-widest text-slate-500">Platform Console</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = item.href === '/' ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all duration-150',
                active
                  ? 'border-teal-700/15 bg-teal-700/10 text-teal-900'
                  : 'border-transparent text-slate-600 hover:bg-white/70 hover:text-slate-900',
              )}
            >
              <Icon size={16} strokeWidth={active ? 2 : 1.75} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-[#d9ddd4] p-3 text-xs text-slate-500">
        Standalone super-admin workspace
      </div>
    </aside>
  );
}

export default function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname() ?? '';

  return (
    <>
      <SidebarContent pathname={pathname} />

      <AnimatePresence>
        {mobileOpen ? (
          <>
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onMobileClose}
              className="fixed inset-0 z-40 bg-slate-950/45 lg:hidden"
              aria-label="Close navigation overlay"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="fixed inset-y-0 left-0 z-50 lg:hidden"
            >
              <div className="absolute right-3 top-3 z-10">
                <button
                  type="button"
                  onClick={onMobileClose}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-[#d9ddd4] bg-white text-slate-700 shadow-sm"
                  aria-label="Close navigation"
                >
                  <X size={16} />
                </button>
              </div>
              <SidebarContent mobile pathname={pathname} onNavigate={onMobileClose} />
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}
