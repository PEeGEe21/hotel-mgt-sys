'use client';

import { useAuthStore } from '@/store/auth.store';
import {
  ROLE_PERMISSIONS, NAV_PERMISSIONS, resolvePermissions,
  type Permission, type Role
} from '@/lib/permissions';

export function usePermissions() {
  const user = useAuthStore(s => s.user);
  const role = (user?.role ?? 'SUPER_ADMIN') as Role;

  // user.permissionOverrides is populated on login from API
  // shape: { grants: Permission[], denies: Permission[] }
  const overrides = (user as any)?.permissionOverrides ?? {};
  const permissions = resolvePermissions(role, overrides);

  const can     = (p: Permission)    => permissions.includes(p);
  const canAll  = (ps: Permission[]) => ps.every(p  => permissions.includes(p));
  const canAny  = (ps: Permission[]) => ps.some(p   => permissions.includes(p));
  const canNav  = (href: string)     => { const r = NAV_PERMISSIONS[href]; return !r || permissions.includes(r); };
  const isAdmin = role === 'SUPER_ADMIN' || role === 'ADMIN';
  const isManagement = isAdmin || role === 'MANAGER';

  return { can, canAll, canAny, canNav, isAdmin, isManagement, role, permissions };
}