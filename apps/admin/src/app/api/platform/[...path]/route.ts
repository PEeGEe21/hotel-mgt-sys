import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { adminRefreshAction } from '@/actions/admin-auth.actions';

const API_URL =
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:4000/api/v1';

const ADMIN_COOKIE_ACCESS = 'admin_access_token';
const TENANT_COOKIE_ACCESS = 'hotel_access_token';

async function proxyRequest(req: NextRequest, params: { path: string[] }) {
  const cookieStore = await cookies();
  const token =
    cookieStore.get(ADMIN_COOKIE_ACCESS)?.value ??
    cookieStore.get(TENANT_COOKIE_ACCESS)?.value ??
    process.env.ADMIN_ACCESS_TOKEN ??
    null;

  if (!token) {
    return NextResponse.json(
      {
        message: 'No platform access token is available yet. Admin auth wiring is the next step.',
      },
      { status: 401 },
    );
  }

  const upstreamPath = params.path.join('/');
  const search = req.nextUrl.search || '';
  const body =
    req.method === 'GET' || req.method === 'HEAD' ? undefined : await req.text();

  const sendRequest = (accessToken: string) =>
    fetch(`${API_URL}/platform/${upstreamPath}${search}`, {
      method: req.method,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
        ...(body ? { 'Content-Type': req.headers.get('content-type') || 'application/json' } : {}),
      },
      body,
      cache: 'no-store',
    });

  const response = await sendRequest(token);

  if (response.status === 401) {
    const refreshed = await adminRefreshAction();
    if (refreshed.success) {
      const refreshedCookieStore = await cookies();
      const refreshedToken = refreshedCookieStore.get(ADMIN_COOKIE_ACCESS)?.value ?? null;

      if (refreshedToken) {
        const retry = await sendRequest(refreshedToken);
        const retryText = await retry.text();
        return new NextResponse(retryText, {
          status: retry.status,
          headers: {
            'content-type': retry.headers.get('content-type') || 'application/json',
          },
        });
      }
    }
  }

  const text = await response.text();

  return new NextResponse(text, {
    status: response.status,
    headers: {
      'content-type': response.headers.get('content-type') || 'application/json',
    },
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } },
) {
  return proxyRequest(req, params);
}

export async function POST(
  req: NextRequest,
  { params }: { params: { path: string[] } },
) {
  return proxyRequest(req, params);
}
