'use server';

import { cookies } from 'next/headers';

// ─── Constants ─────────────────────────────────────────────────────────────────
const API_URL = process.env.API_URL || 'http://localhost:4000/api/v1';
const IS_PROD        = process.env.NODE_ENV === 'production';
const COOKIE_ACCESS = 'hotel_access_token';
const COOKIE_REFRESH = 'hotel_refresh_token';

// ─── Helpers ───────────────────────────────────────────────────────────────────
export async function apiFetch(path: string, options: RequestInit) {
  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}

export async function setAuthCookies(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
  accessToken: string,
  refreshToken: string,
) {
  cookieStore.set({
    name: COOKIE_ACCESS,
    value: accessToken,
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 15, // 15 minutes
  });

  cookieStore.set({
    name: COOKIE_REFRESH,
    value: refreshToken,
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function clearAuthCookies(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  cookieStore.delete(COOKIE_ACCESS);
  cookieStore.delete(COOKIE_REFRESH);
}

// ─── Get access token (for API calls inside server actions) ──────────────────
// Use this in other server actions that need to call the API on behalf of the user.
export async function getAccessToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_ACCESS)?.value ?? null;
}
