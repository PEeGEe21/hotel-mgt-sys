'use client';

import Link from 'next/link';
import {
  Building2,
  Users,
  Package,
  BedDouble,
  Truck,
  Clock,
  Shield,
  Settings,
  ChevronRight,
  Hotel,
  ShoppingCart,
  Table,
  Bell,
  KeyRound,
  ShieldCheck,
  Mail,
  LayoutDashboard,
  Radio,
} from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { Layers } from '@solar-icons/react';

const sections = [
  {
    label: 'Hotel Profile',
    description: 'Name, address, currency, timezone, logo',
    href: '/settings/hotel',
    icon: Hotel,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/20',
  },
  {
    label: 'Departments',
    description: 'Create and manage hotel departments',
    href: '/settings/departments',
    icon: Building2,
    color: 'text-violet-400',
    bg: 'bg-violet-500/10 border-violet-500/20',
  },
  {
    label: 'Roles & Permissions',
    description: 'Control what each role can access',
    href: '/settings/roles',
    icon: Shield,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/20',
    adminOnly: true,
  },
  {
    label: 'Dashboard Layouts',
    description: 'Configure widgets by role',
    href: '/settings/dashboard',
    icon: LayoutDashboard,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/20',
    adminOnly: true,
  },
  {
    label: 'Inventory Categories',
    description: 'Manage bar and store product categories',
    href: '/settings/categories',
    icon: Package,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
  },
  {
    label: 'Floors & Areas',
    description: 'Define floors, levels and outside areas',
    href: '/settings/floors',
    icon: Layers,
    color: 'text-violet-400',
    bg: 'bg-violet-500/10 border-violet-500/20',
  },
  {
    label: 'Room Types',
    description: 'Define room types and base rates',
    href: '/settings/room-types',
    icon: BedDouble,
    color: 'text-sky-400',
    bg: 'bg-sky-500/10 border-sky-500/20',
  },
  {
    label: 'Suppliers',
    description: 'Manage vendors and supplier contacts',
    href: '/settings/suppliers',
    icon: Truck,
    color: 'text-orange-400',
    bg: 'bg-orange-500/10 border-orange-500/20',
  },
  {
    label: 'Shift Templates',
    description: 'Define morning, evening and night shifts',
    href: '/settings/shifts',
    icon: Clock,
    color: 'text-pink-400',
    bg: 'bg-pink-500/10 border-pink-500/20',
  },
  {
    label: 'User Account',
    description: 'Create logins and assign roles to staff',
    href: '/profile',
    icon: Users,
    color: 'text-slate-400',
    bg: 'bg-slate-500/10 border-slate-500/20',
    adminOnly: true,
  },
  {
    label: 'Notifications',
    description: 'Manage email, in-app and push alerts',
    href: '/profile?tab=notifications',
    icon: Bell,
    color: 'text-sky-400',
    bg: 'bg-sky-500/10 border-sky-500/20',
  },
  {
    label: 'My Permissions',
    description: 'View effective role permissions and overrides',
    href: '/profile?tab=permissions',
    icon: Shield,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/20',
  },
  {
    label: 'Audit Logs',
    description: 'Track sensitive actions and access',
    href: '/settings/audit-logs',
    icon: ShieldCheck,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    adminOnly: true,
  },
  {
    label: 'Realtime Diagnostics',
    description: 'Monitor websocket health across live operational modules',
    href: '/settings/realtime',
    icon: Radio,
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10 border-cyan-500/20',
    adminOnly: true,
  },
  // {
  //   label: 'Mailing',
  //   description: 'Inspect sent, failed, and skipped emails',
  //   href: '/settings/mailing',
  //   icon: Mail,
  //   color: 'text-sky-400',
  //   bg: 'bg-sky-500/10 border-sky-500/20',
  //   adminOnly: true,
  // },
  {
    label: 'Password Reset',
    description: 'Self-service password change and security',
    href: '/profile?tab=password',
    icon: KeyRound,
    color: 'text-rose-400',
    bg: 'bg-rose-500/10 border-rose-500/20',
  },
  {
    label: 'Pos Product Categories',
    description: 'Manage Categories For Pos Products',
    href: '/settings/pos-product-categories',
    icon: ShoppingCart,
    color: 'text-slate-400',
    bg: 'bg-slate-500/10 border-slate-500/20',
    adminOnly: true,
  },
  {
    label: 'Tables',
    description: 'Manage Tables For Bars, Restaurant etc',
    href: '/settings/tables',
    icon: Table,
    color: 'text-slate-400',
    bg: 'bg-slate-500/10 border-slate-500/20',
    adminOnly: true,
  },
];

export default function SettingsPage() {
  const { isAdmin, isManagement } = usePermissions();

  const visible = sections.filter((s) => !s.adminOnly || isAdmin);

  return (
    <div className="space-y-6 max-w-full">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Settings</h1>
        <p className="text-slate-500 text-sm mt-0.5">Configure your hotel system</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {visible.map(({ label, description, href, icon: Icon, color, bg }) => (
          <Link
            key={href}
            href={href}
            className="bg-[#161b27] border border-[#1e2536] hover:border-slate-600 rounded-xl p-5 flex items-center gap-4 transition-all group"
          >
            <div
              className={`w-11 h-11 rounded-xl border ${bg} flex items-center justify-center shrink-0`}
            >
              <Icon size={20} className={color} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">
                {label}
              </p>
              <p className="text-xs text-slate-500 mt-0.5 truncate">{description}</p>
            </div>
            <ChevronRight
              size={16}
              className="text-slate-600 group-hover:text-slate-400 transition-colors shrink-0"
            />
          </Link>
        ))}
      </div>

      {/* System info */}
      <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5">
        <h2 className="text-xs text-slate-500 uppercase tracking-widest font-medium mb-4 flex items-center gap-2">
          <Settings size={12} /> System Info
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Version', value: 'v1.0.0' },
            { label: 'Environment', value: 'Development' },
            { label: 'Database', value: 'PostgreSQL' },
            { label: 'Last Updated', value: 'Mar 11, 2026' },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs text-slate-600">{label}</p>
              <p className="text-sm text-slate-300 font-medium mt-0.5">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
