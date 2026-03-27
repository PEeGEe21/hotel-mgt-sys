'use client';

import { useAuthStore } from '@/store/auth.store';
import { useMe } from '@/hooks/useMe';
import {
  ROLE_PERMISSIONS,
  NAV_PERMISSIONS,
  type Permission,
  type Role,
} from '@/lib/permissions';

export function usePermissions() {
  const user = useAuthStore(s => s.user);
  const { data } = useMe();
  const liveUser =
    data?.user && user && data.user.id !== user.id
      ? user
      : data?.user ?? user;
  const ready = !!liveUser;
  const role = (liveUser?.role ?? 'STAFF') as Role;

  // user.permissionOverrides is populated on login from API
  // shape: { grants: Permission[], denies: Permission[] }
  const overrides = (liveUser as any)?.permissionOverrides ?? {};
  const base = new Set((liveUser as any)?.rolePermissions ?? ROLE_PERMISSIONS[role] ?? []);
  if (overrides?.grants) overrides.grants.forEach((p: Permission) => base.add(p));
  if (overrides?.denies) overrides.denies.forEach((p: Permission) => base.delete(p));
  const permissions = Array.from(base);

  const can     = (p: Permission)    => ready && permissions.includes(p);
  const canAll  = (ps: Permission[]) => ready && ps.every(p  => permissions.includes(p));
  const canAny  = (ps: Permission[]) => ready && ps.some(p   => permissions.includes(p));
  const canNav  = (href: string)     => {
    if (!ready) return false;
    const r = NAV_PERMISSIONS[href];
    return !r || permissions.includes(r);
  };

  const canPath = (pathname: string) => {
    if (!ready) return false;
    const key = Object.keys(NAV_PERMISSIONS).find(
      (p) => pathname === p || pathname.startsWith(p + '/'),
    );
    if (!key) return true;
    return permissions.includes(NAV_PERMISSIONS[key]);
  };
  const isAdmin = role === 'SUPER_ADMIN' || role === 'ADMIN';
  const isManagement = isAdmin || role === 'MANAGER';

  return { can, canAll, canAny, canNav, canPath, isAdmin, isManagement, role, permissions, ready };
}
