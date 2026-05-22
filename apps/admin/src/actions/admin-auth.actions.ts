'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  adminApiFetch,
  clearAdminAuthCookies,
  clearHotelAuthCookies,
  getAdminAccessToken,
  getAdminRefreshToken,
  getHotelAccessToken,
  getHotelRefreshToken,
  setHotelAuthCookies,
  setAdminAuthCookies,
} from '@/lib/admin-fetch-config';
import type { AdminAuthUser } from '@/store/admin-auth.store';

const COOKIE_REFRESH = 'admin_refresh_token';
const WEB_APP_URL =
  process.env.FRONTEND_URL ||
  process.env.NEXT_PUBLIC_WEB_APP_URL ||
  'http://localhost:3000';

export type AdminAuthResult =
  | { success: true; user: AdminAuthUser }
  | { success: false; message: string; field?: 'email' | 'password' | 'general' }
  | {
      success: false;
      message: string;
      mfaRequired: true;
      mfaSetupRequired: boolean;
      challengeToken: string;
      secret?: string;
      otpAuthUrl?: string;
    };

function normalizeUser(user: any): AdminAuthUser {
  return {
    ...user,
    permissionOverrides: user.permissionOverrides ?? { grants: [], denies: [] },
  };
}

function normalizeTenantUser(user: any) {
  return {
    ...user,
    permissionOverrides: user.permissionOverrides ?? { grants: [], denies: [] },
  };
}

function secondsUntil(value: string | null | undefined) {
  if (!value) return 60 * 60 * 24 * 7;
  return Math.max(60, Math.floor((new Date(value).getTime() - Date.now()) / 1000));
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

    if (data?.mfaRequired) {
      return {
        success: false,
        message: data?.message ?? 'Multi-factor verification is required.',
        mfaRequired: true,
        mfaSetupRequired: Boolean(data?.mfaSetupRequired),
        challengeToken: data.challengeToken,
        secret: data.secret,
        otpAuthUrl: data.otpAuthUrl,
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

export async function adminVerifyMfaAction(
  challengeToken: string,
  code: string,
): Promise<{ success: true; user: AdminAuthUser } | { success: false; message: string }> {
  if (!challengeToken || !code) {
    return { success: false, message: 'Challenge token and verification code are required.' };
  }

  try {
    const response = await adminApiFetch('/auth/mfa/verify', {
      method: 'POST',
      body: JSON.stringify({ challengeToken, code }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        success: false,
        message: data?.message ?? 'MFA verification failed. Please try again.',
      };
    }

    if (data?.user?.role !== 'SUPER_ADMIN') {
      return {
        success: false,
        message: 'Only super admins can sign in to the platform console.',
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
      message: 'Could not verify MFA right now. Please try again.',
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

async function readTenantMeWithRefresh() {
  const cookieStore = await cookies();
  let accessToken = await getHotelAccessToken();

  if (!accessToken) {
    return { success: false as const };
  }

  let response = await adminApiFetch('/auth/me', {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });

  if (response.status === 401) {
    const refreshToken = await getHotelRefreshToken();
    if (!refreshToken) {
      await clearHotelAuthCookies(cookieStore);
      return { success: false as const };
    }

    const refreshResponse = await adminApiFetch('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });

    if (!refreshResponse.ok) {
      await clearHotelAuthCookies(cookieStore);
      return { success: false as const };
    }

    const refreshData = await refreshResponse.json();
    accessToken = refreshData.accessToken;
    await setHotelAuthCookies(cookieStore, refreshData.accessToken, refreshData.refreshToken);

    response = await adminApiFetch('/auth/me', {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });
  }

  if (!response.ok) {
    await clearHotelAuthCookies(cookieStore);
    return { success: false as const };
  }

  const data = await response.json();
  return { success: true as const, data };
}

export async function adminStartTenantImpersonationAction(
  userId: string,
): Promise<{ success: true; launchUrl: string } | { success: false; message: string }> {
  const accessToken = await getAdminAccessToken();
  if (!accessToken) {
    return { success: false, message: 'Your admin session is no longer available.' };
  }

  try {
    const response = await adminApiFetch(`/auth/impersonate/${userId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { success: false, message: data?.message ?? 'Could not start impersonation.' };
    }

    const cookieStore = await cookies();
    await setHotelAuthCookies(cookieStore, data.accessToken, data.refreshToken);

    const meResult = await readTenantMeWithRefresh();
    const expiresAt =
      meResult.success && meResult.data?.user?.impersonationExpiresAt
        ? meResult.data.user.impersonationExpiresAt
        : null;

    if (expiresAt) {
      await setHotelAuthCookies(cookieStore, data.accessToken, data.refreshToken, secondsUntil(expiresAt));
    }

    return {
      success: true,
      launchUrl: WEB_APP_URL.replace(/\/$/, ''),
    };
  } catch {
    return { success: false, message: 'Could not reach the server. Check your connection.' };
  }
}

export async function adminGetTenantImpersonationStatusAction(): Promise<
  | {
      success: true;
      active: true;
      user: {
        id: string;
        name: string;
        email: string;
        role: string;
        hotelName: string | null;
        impersonationExpiresAt: string | null;
      };
    }
  | { success: true; active: false }
  | { success: false; message: string }
> {
  try {
    const result = await readTenantMeWithRefresh();
    if (!result.success) {
      return { success: true, active: false };
    }

    const user = normalizeTenantUser(result.data.user);
    if (!user.isImpersonation) {
      return { success: true, active: false };
    }

    return {
      success: true,
      active: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        hotelName: result.data.hotel?.name ?? null,
        impersonationExpiresAt: user.impersonationExpiresAt ?? null,
      },
    };
  } catch {
    return { success: false, message: 'Could not read impersonation status right now.' };
  }
}

export async function adminStopTenantImpersonationAction(): Promise<
  { success: true; message: string } | { success: false; message: string }
> {
  const cookieStore = await cookies();
  const accessToken = await getHotelAccessToken();
  const refreshToken = await getHotelRefreshToken();

  if (!accessToken || !refreshToken) {
    await clearHotelAuthCookies(cookieStore);
    return { success: true, message: 'No active tenant impersonation session was found.' };
  }

  try {
    const response = await adminApiFetch('/auth/impersonate/stop', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ refreshToken }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      await clearHotelAuthCookies(cookieStore);
      return {
        success: false,
        message: data?.message ?? 'Could not stop impersonation cleanly. Tenant cookies were cleared.',
      };
    }

    if (data?.accessToken && data?.refreshToken) {
      try {
        await adminApiFetch('/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${data.accessToken}` },
          body: JSON.stringify({ refreshToken: data.refreshToken }),
        });
      } catch {
        // Best effort: the temporary return session is not needed in the admin app.
      }
    }

    await clearHotelAuthCookies(cookieStore);
    return { success: true, message: 'Tenant impersonation stopped.' };
  } catch {
    await clearHotelAuthCookies(cookieStore);
    return { success: false, message: 'Could not reach the server. Tenant cookies were cleared locally.' };
  }
}
