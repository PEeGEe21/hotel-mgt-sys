'use client';

import Link from 'next/link';
import {
  Building2, Users, Package, BedDouble, Truck,
  Clock, Shield, Settings, ChevronRight, Hotel
} from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';

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
    label: 'Inventory Categories',
    description: 'Manage bar and store product categories',
    href: '/settings/categories',
    icon: Package,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
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
    label: 'User Accounts',
    description: 'Create logins and assign roles to staff',
    href: '/settings/users',
    icon: Users,
    color: 'text-slate-400',
    bg: 'bg-slate-500/10 border-slate-500/20',
    adminOnly: true,
  },
];

export default function SettingsPage() {
  const { isAdmin, isManagement } = usePermissions();

  const visible = sections.filter(s => !s.adminOnly || isAdmin);

  return (
    <div className="space-y-6 max-w-full">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Settings</h1>
        <p className="text-slate-500 text-sm mt-0.5">Configure your hotel system</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {visible.map(({ label, description, href, icon: Icon, color, bg }) => (
          <Link key={href} href={href}
            className="bg-[#161b27] border border-[#1e2536] hover:border-slate-600 rounded-xl p-5 flex items-center gap-4 transition-all group">
            <div className={`w-11 h-11 rounded-xl border ${bg} flex items-center justify-center shrink-0`}>
              <Icon size={20} className={color} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">{label}</p>
              <p className="text-xs text-slate-500 mt-0.5 truncate">{description}</p>
            </div>
            <ChevronRight size={16} className="text-slate-600 group-hover:text-slate-400 transition-colors shrink-0" />
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