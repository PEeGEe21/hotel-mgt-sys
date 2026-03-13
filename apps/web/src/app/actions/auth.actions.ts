'use server';

import { apiFetch, clearAuthCookies, COOKIE_ACCESS, COOKIE_REFRESH, setAuthCookies } from '@/lib/fetch-config';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

// ─── Types ─────────────────────────────────────────────────────────────────────
export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  department: string;
  position: string;
  permissionOverrides?: {
    grants: string[];
    denies: string[];
  };
};

export type AuthResult =
  | { success: true;  user: AuthUser; message: string }
  | { success: false; message: string; field?: 'email' | 'password' | 'general' };


// ─── Login ─────────────────────────────────────────────────────────────────────
export async function loginAction(email: string, password: string): Promise<AuthResult> {
  // Basic validation server-side (Zod can be added here later)
  if (!email || !password) {
    return { success: false, message: 'Email and password are required.', field: 'general' };
  }
  if (!email.includes('@')) {
    return { success: false, message: 'Enter a valid email address.', field: 'email' };
  }

  try {
    const response = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      // Map common API errors to field-specific messages
      const message = data?.message ?? 'Login failed. Please try again.';
      const lower = message.toLowerCase();
      const field = lower.includes('password') ? 'password'
                  : lower.includes('email') || lower.includes('user') ? 'email'
                  : 'general';
      return { success: false, message, field };
    }

    const cookieStore = await cookies();
    await setAuthCookies(cookieStore, data.accessToken, data.refreshToken);

    return {
      success: true,
      user: data.user,
      message: data.message ?? 'Login successful',
    };
  } catch {
    return {
      success: false,
      message: 'Could not reach the server. Check your connection.',
      field: 'general',
    };
  }
}

// ─── Logout ────────────────────────────────────────────────────────────────────
export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies();

  try {
    const refreshToken = cookieStore.get(COOKIE_REFRESH)?.value;
    const accessToken  = cookieStore.get(COOKIE_ACCESS)?.value;

    // Tell the API to invalidate the refresh token
    if (refreshToken && accessToken) {
      await apiFetch('/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ refreshToken }),
      });
    }
  } catch {
    // Even if the API call fails, clear cookies client-side
  } finally {
    await clearAuthCookies(cookieStore);
    redirect('/login');
  }
}

// ─── Refresh access token ──────────────────────────────────────────────────────
// Called from middleware when the access token is expired.
export async function refreshTokenAction(): Promise<{ success: boolean }> {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(COOKIE_REFRESH)?.value;

  if (!refreshToken) return { success: false };

  try {
    const response = await apiFetch('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      await clearAuthCookies(cookieStore);
      return { success: false };
    }

    const data = await response.json();
    await setAuthCookies(cookieStore, data.accessToken, data.refreshToken);
    return { success: true };
  } catch {
    await clearAuthCookies(cookieStore);
    return { success: false };
  }
}

// ─── Get session (server components) ─────────────────────────────────────────
// Use this in Server Components / layouts to read the current user.
// Returns null if not authenticated.
export async function getSession(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(COOKIE_ACCESS)?.value;

  if (!accessToken) return null;

  try {
    const response = await apiFetch('/auth/me', {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) return null;

    const data = await response.json();
    return data.user ?? null;
  } catch {
    return null;
  }
}