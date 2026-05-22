'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { adminLoginAction, adminLogoutAction, adminSkipMfaAction, adminVerifyMfaAction } from '@/actions/admin-auth.actions';

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
  mfaEnabled?: boolean;
  mfaSetupAt?: string | null;
  impersonatorId?: string | null;
  isImpersonation?: boolean;
  permissionOverrides: {
    grants: string[];
    denies: string[];
  };
};

export type AdminMfaChallenge = {
  challengeToken: string;
  message: string;
  mfaRequired: true;
  mfaSetupRequired: boolean;
  secret?: string;
  otpAuthUrl?: string;
};

type AdminAuthState = {
  user: AdminAuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (
    email: string,
    password: string,
  ) => Promise<
    | { success: true; user: AdminAuthUser }
    | { success: false; message: string; mfaChallenge?: AdminMfaChallenge }
  >;
  verifyMfa: (
    challengeToken: string,
    code: string,
  ) => Promise<{ success: true; user: AdminAuthUser } | { success: false; message: string }>;
  skipMfa: (
    challengeToken: string,
  ) => Promise<{ success: true; user: AdminAuthUser } | { success: false; message: string }>;
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
          const isMfaChallenge = 'mfaRequired' in result;
          set({ isLoading: false, error: isMfaChallenge ? null : result.message });
          return {
            success: false,
            message: result.message,
            mfaChallenge: 'mfaRequired' in result
              ? {
                  challengeToken: result.challengeToken,
                  message: result.message,
                  mfaRequired: true,
                  mfaSetupRequired: result.mfaSetupRequired,
                  secret: result.secret,
                  otpAuthUrl: result.otpAuthUrl,
                }
              : undefined,
          };
        }

        set({ user: result.user, isAuthenticated: true, isLoading: false, error: null });
        return { success: true, user: result.user };
      },

      verifyMfa: async (challengeToken, code) => {
        set({ isLoading: true, error: null });
        const result = await adminVerifyMfaAction(challengeToken, code);

        if (!result.success) {
          set({ isLoading: false, error: result.message });
          return { success: false, message: result.message };
        }

        set({ user: result.user, isAuthenticated: true, isLoading: false, error: null });
        return { success: true, user: result.user };
      },

      skipMfa: async (challengeToken) => {
        set({ isLoading: true, error: null });
        const result = await adminSkipMfaAction(challengeToken);

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
