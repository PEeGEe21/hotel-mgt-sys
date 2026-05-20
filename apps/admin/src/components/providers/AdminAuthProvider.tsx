'use client';

import { useEffect } from 'react';
import { getAdminMeAction } from '@/actions/admin-auth.actions';
import { useAdminAuthStore } from '@/store/admin-auth.store';

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const { user, setUser } = useAdminAuthStore();

  useEffect(() => {
    if (user) return;

    getAdminMeAction().then((result) => {
      if (result.success) {
        setUser(result.user);
      }
    });
  }, [user, setUser]);

  return <>{children}</>;
}
