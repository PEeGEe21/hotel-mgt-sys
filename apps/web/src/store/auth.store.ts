'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { loginAction, logoutAction } from '@/actions/auth.actions'; // ← correct path
import { disconnectRealtimeSocket, leaveRealtimePresence } from '@/lib/realtime';

// ─── Types ────────────────────────────────────────────────────────────────────
// Single source of truth — auth.actions.ts imports this from here
export type AuthUser = {
  id: string;
  email: string;
  name: string;
  username?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  employeeCode?: string | null;
  attendancePinSet?: boolean;
  joinDate?: string | null;
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

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; hotel?: any; user?: AuthUser; message?: string }>;
  logout: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
  clearError: () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────
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
          return { success: false, message: result.message };
        }

        console.log(result, 'ffs');

        set({ user: result.user, isAuthenticated: true, isLoading: false, error: null });
        return { success: true, hotel: result.hotel, user: result.user };
      },

      logout: async () => {
        set({ isLoading: true });
        await leaveRealtimePresence();
        disconnectRealtimeSocket();
        set({ user: null, isAuthenticated: false, isLoading: false, error: null });
        await logoutAction();
      },

      setUser: (user) => {
        if (!user) {
          disconnectRealtimeSocket();
        }
        set({ user, isAuthenticated: !!user });
      },
      clearError: () => set({ error: null }),
    }),
    {
      name: 'hotel-auth',
      storage: {
        getItem: (key) => JSON.parse(localStorage.getItem(key) ?? 'null'),
        setItem: (key, val) => localStorage.setItem(key, JSON.stringify(val)),
        removeItem: (key) => localStorage.removeItem(key),
      },
      partialize: (state) =>
        ({
          user: state.user,
          isAuthenticated: state.isAuthenticated,
        }) as AuthState,
    },
  ),
);
