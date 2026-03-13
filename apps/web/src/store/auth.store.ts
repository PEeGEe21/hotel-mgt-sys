'use client';

import { loginAction, logoutAction } from '@/app/actions/auth.actions';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser } from '@/app/actions/auth.actions';

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; field?: string; message?: string }>;
  logout: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        const result = await loginAction(email, password);
        if (!result.success) {
          set({ isLoading: false, error: result.message });
          return { success: false, field: result.field, message: result.message };
        }
        set({ user: result.user, isAuthenticated: true, isLoading: false, error: null });
        return { success: true };
      },

      logout: async () => {
        set({ isLoading: true });
        await logoutAction();
        set({ user: null, isAuthenticated: false, isLoading: false, error: null });
      },

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      clearError: () => set({ error: null }),
    }),
    {
      name: 'hotel-auth',
      storage: {
        getItem: (key) => JSON.parse(sessionStorage.getItem(key) ?? 'null'),
        setItem: (key, val) => sessionStorage.setItem(key, JSON.stringify(val)),
        removeItem: (key) => sessionStorage.removeItem(key),
      },
      partialize: (state) =>
        ({
          user: state.user,
          isAuthenticated: state.isAuthenticated,
        }) as AuthState,
    },
  ),
);
