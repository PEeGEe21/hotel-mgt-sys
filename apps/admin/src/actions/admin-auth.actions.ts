'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  adminApiFetch,
  clearAdminAuthCookies,
  getAdminAccessToken,
  getAdminRefreshToken,
  setAdminAuthCookies,
} from '@/lib/admin-fetch-config';
import type { AdminAuthUser } from '@/store/admin-auth.store';

const COOKIE_REFRESH = 'admin_refresh_token';

export type AdminAuthResult =
  | { success: true; user: AdminAuthUser }
  | { success: false; message: string; field?: 'email' | 'password' | 'general' };

function normalizeUser(user: any): AdminAuthUser {
  return {
    ...user,
    permissionOverrides: user.permissionOverrides ?? { grants: [], denies: [] },
  };
}

export async function adminLoginAction(email: string, password: string): Promise<AdminAuthResult> {
  if (!email || !password) {
    return { success: false, message: 'Email and password are required.', field: 'general' };
  }

  try {
    const response = await adminApiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        success: false,
        message: data?.message ?? 'Login failed. Please try again.',
        field: 'general',
      };
    }

    if (data?.user?.role !== 'SUPER_ADMIN') {
      return {
        success: false,
        message: 'Only super admins can sign in to the platform console.',
        field: 'general',
      };
    }

    const cookieStore = await cookies();
    await setAdminAuthCookies(cookieStore, data.accessToken, data.refreshToken);

    return {
      success: true,
      user: normalizeUser(data.user),
    };
  } catch {
    return {
      success: false,
      message: 'Could not reach the server. Check your connection.',
      field: 'general',
    };
  }
}

export async function adminLogoutAction(): Promise<void> {
  const cookieStore = await cookies();

  try {
    const refreshToken = cookieStore.get(COOKIE_REFRESH)?.value;
    const accessToken = cookieStore.get('admin_access_token')?.value;

    if (refreshToken && accessToken) {
      await adminApiFetch('/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ refreshToken }),
      });
    }
  } catch {
    // no-op
  } finally {
    await clearAdminAuthCookies(cookieStore);
    redirect('/login');
  }
}

export async function adminRefreshAction(): Promise<{ success: boolean }> {
  const cookieStore = await cookies();
  const refreshToken = await getAdminRefreshToken();

  if (!refreshToken) return { success: false };

  try {
    const response = await adminApiFetch('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      await clearAdminAuthCookies(cookieStore);
      return { success: false };
    }

    const data = await response.json();
    if (data?.user?.role && data.user.role !== 'SUPER_ADMIN') {
      await clearAdminAuthCookies(cookieStore);
      return { success: false };
    }

    await setAdminAuthCookies(cookieStore, data.accessToken, data.refreshToken);
    return { success: true };
  } catch {
    await clearAdminAuthCookies(cookieStore);
    return { success: false };
  }
}

export async function getAdminMeAction(): Promise<{ success: true; user: AdminAuthUser } | { success: false }> {
  const accessToken = await getAdminAccessToken();
  if (!accessToken) return { success: false };

  try {
    const res = await adminApiFetch('/auth/me', {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });

    if (!res.ok) return { success: false };
    const data = await res.json();
    if (data?.user?.role !== 'SUPER_ADMIN') return { success: false };

    return { success: true, user: normalizeUser(data.user) };
  } catch {
    return { success: false };
  }
}
