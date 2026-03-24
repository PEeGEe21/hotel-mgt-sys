'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  BedDouble,
  CalendarCheck,
  Users,
  UserCheck,
  Clock,
  ShoppingCart,
  Package,
  Sparkles,
  DollarSign,
  BarChart3,
  Dumbbell,
  LogOut,
  Hotel,
  Settings,
  ChevronDown,
  Building2,
  AlertTriangle,
  Wrench,
  ClipboardList,
  FileBarChart,
  UserCog,
  Receipt,
  FileText,
  BookOpen,
  Landmark,
  CreditCard,
  Shield,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useAppStore } from '@/store/app.store';
import { usePermissions } from '@/hooks/usePermissions';
import { useHydration } from '@/hooks/useHydration';
import { Lock } from '@solar-icons/react';
import { chevronVariants, dropdownVariants, itemVariants } from '@/utils/animations';
import { motion, AnimatePresence } from 'framer-motion';

type NavItem = { label: string; href: string; icon: any };
type NavGroup = { label: string; href: string; icon: any; permission: string; children: NavItem[] };
type NavEntry = NavItem | NavGroup;
const isGroup = (item: NavEntry): item is NavGroup => 'children' in item;

const nav: NavEntry[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Rooms', href: '/rooms', icon: BedDouble },
  { label: 'Reservations', href: '/reservations', icon: CalendarCheck },
  { label: 'Guests', href: '/guests', icon: Users },
  { label: 'Staff', href: '/staff', icon: UserCheck },
  { label: 'Attendance', href: '/attendance', icon: Clock },
  { label: 'Clock', href: '/clock', icon: Clock },
  {
    label: 'POS / Store',
    href: '/pos',
    icon: ShoppingCart,
    permission: 'manage:pos',
    children: [
      { label: 'Manage POS', href: '/pos/manage-pos', icon: Building2 },
      { label: 'POS Products', href: '/pos/products', icon: Lock },
    ],
  },
  { label: 'Inventory', href: '/inventory', icon: Package },
  { label: 'Housekeeping', href: '/housekeeping', icon: Sparkles },
  {
    label: 'Finance',
    href: '/finance',
    icon: DollarSign,
    permission: 'view:finance',
    children: [
      { label: 'Overview', href: '/finance/overview', icon: DollarSign },
      { label: 'Invoices', href: '/finance/invoices', icon: Receipt },
      { label: 'Ledger', href: '/finance/ledger', icon: BookOpen },
      { label: 'Chart of Accounts', href: '/finance/accounts', icon: Landmark },
      { label: 'Payments', href: '/finance/payments', icon: CreditCard },
    ],
  },
  { label: 'Reports', href: '/reports', icon: BarChart3 },
  {
    label: 'Facilities',
    href: '/#',
    icon: Dumbbell,
    permission: 'view:facilities',
    children: [
      { label: 'Facility List', href: '/facilities/list', icon: Building2 },
      { label: 'Reservations', href: '/facilities/reservations', icon: Lock },
      { label: 'Complaints', href: '/facilities/complaints', icon: AlertTriangle },
      { label: 'Inspections', href: '/facilities/inspections', icon: ClipboardList },
      { label: 'Maintenance', href: '/facilities/maintenance', icon: Wrench },
      { label: 'Requisitions', href: '/facilities/requisitions', icon: Receipt },
      { label: 'Reports', href: '/facilities/reports', icon: FileBarChart },
    ],
  },
  {
    label: 'HR',
    href: '/hr',
    icon: UserCog,
    permission: 'view:staff',
    children: [
      { label: 'User Accounts', href: '/hr/accounts', icon: UserCog },
      { label: 'Permissions', href: '/hr/permissions', icon: Shield },
      { label: 'Contracts', href: '/hr/contracts', icon: FileText },
      { label: 'Payroll', href: '/hr/payroll', icon: Receipt },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const hotel = useAppStore((s) => s.hotel);
  const logout = useAuthStore((s) => s.logout);
  const hydrated = useHydration();
  const { canNav, can, ready } = usePermissions();

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    nav.forEach((item) => {
      if (isGroup(item)) {
        const active = item.children.some(
          (c) => pathname === c.href || pathname.startsWith(c.href + '/'),
        );
        if (active) init[item.href] = true;
      }
    });
    return init;
  });

  const toggleGroup = (href: string) => setOpenGroups((o) => ({ ...o, [href]: !o[href] }));
  const isActive = (href: string) =>
    pathname === href || (href !== '/dashboard' && pathname.startsWith(href + '/'));

  return (
    <aside className="w-64 bg-[#161b27] border-r border-[#1e2536] flex flex-col h-full shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-[#1e2536]">
        {!hydrated ? (
          <>
            <div className="w-9 h-9 rounded-xl bg-[#1e2536] animate-pulse shrink-0" />
            <div className="space-y-1.5">
              <div className="w-28 h-3.5 rounded bg-[#1e2536] animate-pulse" />
              <div className="w-16 h-2.5 rounded bg-[#1e2536] animate-pulse" />
            </div>
          </>
        ) : (
          <>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shrink-0 overflow-hidden">
              {hotel?.logo ? (
                <img src={hotel.logo} alt={hotel.name} className="w-full h-full object-cover" />
              ) : (
                <Hotel size={18} className="text-white" />
              )}
            </div>
            <div className="min-w-0">
              <span className="text-white font-bold text-base tracking-tight truncate block">
                {hotel?.name ?? 'HotelOS'}
              </span>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest">
                {hotel?.city ?? 'Management'}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {!ready && (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-9 rounded-lg bg-[#1e2536] animate-pulse" />
            ))}
          </div>
        )}

        {/* search */}
        {ready && <></>}
        {ready &&
          nav.map((item) => {
            if (isGroup(item)) {
              if (!canNav(item.href)) return null;
              const open = !!openGroups[item.href];
              const groupActive = item.children.some((c) => isActive(c.href));
              const Icon = item.icon;
              return (
                <div key={item.href}>
                  <button
                    onClick={() => toggleGroup(item.href)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                      groupActive
                        ? 'bg-blue-600/20 text-blue-400  border-blue-500/20'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                    }`}
                  >
                    <Icon size={16} strokeWidth={groupActive ? 2 : 1.5} />
                    <span className="flex-1 text-left">{item.label}</span>
                    <motion.div
                      variants={chevronVariants}
                      animate={open ? 'open' : 'closed'}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown
                        size={14}
                        className={`transition-transform duration-200  ${groupActive ? 'text-blue-400' : 'text-slate-600'}`}
                      />
                    </motion.div>
                  </button>
                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.div
                        variants={dropdownVariants}
                        initial="closed"
                        animate="open"
                        exit="closed"
                        transition={{
                          height: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
                          opacity: {
                            duration: 0.3,
                            delay: 0.1,
                            ease: [0.4, 0, 0.2, 1],
                          },
                        }}
                        className="overflow-hidden mt-0.5 ml-3 pl-3 border-l border-[#1e2536] space-y-0.5"
                      >
                        {item.children.map((child, index) => {
                          const CIcon = child.icon;
                          const active = isActive(child.href);
                          return (
                            <motion.div
                              key={child.href}
                              variants={itemVariants}
                              initial="closed"
                              animate="open"
                              exit="closed"
                              custom={index}
                            >
                              <Link
                                key={child.href}
                                href={child.href}
                                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
                                  active
                                    ? 'bg-blue-600/20 text-blue-400 font-medium'
                                    : 'text-slate-500 hover:text-slate-200 hover:bg-white/5'
                                }`}
                              >
                                <CIcon size={14} strokeWidth={active ? 2 : 1.5} />
                                {child.label}
                              </Link>
                            </motion.div>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            }

            if (!canNav(item.href)) return null;
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 border ${
                  active
                    ? 'bg-blue-600/20 text-blue-400 border-blue-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border-transparent'
                }`}
              >
                <Icon size={16} strokeWidth={active ? 2 : 1.5} />
                {item.label}
              </Link>
            );
          })}
      </nav>

      {/* Settings + Logout */}
      <div className="p-3 border-t border-[#1e2536] space-y-1">
        {can('view:settings') && (
          <Link
            href="/settings"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              pathname.startsWith('/settings')
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Settings size={16} />
            Settings
          </Link>
        )}
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all w-full"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
