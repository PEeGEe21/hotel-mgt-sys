'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { useAppStore } from '@/store/app.store';
import { getMeAction } from '@/actions/auth.actions';

/**
 * Wrap the dashboard layout with this.
 * On mount it checks if the user is in the Zustand store.
 * If not (page refresh cleared sessionStorage) but cookies still exist,
 * it calls GET /auth/me to rehydrate the user silently.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, setUser } = useAuthStore();
  const { setHotel }      = useAppStore();

  useEffect(() => {
    // Already hydrated from sessionStorage — nothing to do
    if (user) return;

    // Store is empty but cookies may still exist — try to rehydrate
    getMeAction().then(result => {
      if (result.success) {
        setUser(result.user);
        if (result.hotel) setHotel(result.hotel);
      }
      // If it fails, middleware will catch the next navigation and redirect to /login
    });
  }, []);

  return <>{children}</>;
}