'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { adminLoginAction, adminLogoutAction } from '@/actions/admin-auth.actions';

export type AdminAuthUser = {
  id: string;
  email: string;
  name: string;
  username?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  employeeCode?: string | null;
  lastLoginAt?: string | null;
  avatar?: string | null;
  rolePermissions?: string[];
  role: string;
  department: string | null;
  position: string | null;
  mustChangePassword: boolean;
  impersonatorId?: string | null;
  isImpersonation?: boolean;
  permissionOverrides: {
    grants: string[];
    denies: string[];
  };
};

type AdminAuthState = {
  user: AdminAuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; user?: AdminAuthUser; message?: string }>;
  logout: () => Promise<void>;
  setUser: (user: AdminAuthUser | null) => void;
  clearError: () => void;
};

export const useAdminAuthStore = create<AdminAuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        const result = await adminLoginAction(email, password);

        if (!result.success) {
          set({ isLoading: false, error: result.message });
          return { success: false, message: result.message };
        }

        set({ user: result.user, isAuthenticated: true, isLoading: false, error: null });
        return { success: true, user: result.user };
      },

      logout: async () => {
        set({ isLoading: true });
        set({ user: null, isAuthenticated: false, isLoading: false, error: null });
        await adminLogoutAction();
      },

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      clearError: () => set({ error: null }),
    }),
    {
      name: 'hotel-admin-auth',
      storage: {
        getItem: (key) => JSON.parse(localStorage.getItem(key) ?? 'null'),
        setItem: (key, val) => localStorage.setItem(key, JSON.stringify(val)),
        removeItem: (key) => localStorage.removeItem(key),
      },
      partialize: (state) =>
        ({
          user: state.user,
          isAuthenticated: state.isAuthenticated,
        }) as AdminAuthState,
    },
  ),
);
