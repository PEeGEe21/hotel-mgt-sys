import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_ROUTES = ['/login', '/api/auth/refresh'];
const PROTECTED_ROOT = '/dashboard';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always allow public routes and Next.js internals
  if (
    PUBLIC_ROUTES.some((r) => pathname.startsWith(r)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next();
  }

  const accessToken = req.cookies.get('hotel_access_token')?.value;
  const refreshToken = req.cookies.get('hotel_refresh_token')?.value;

  // Redirect root to dashboard or login
  if (pathname === '/') {
    return NextResponse.redirect(
      new URL(accessToken || refreshToken ? PROTECTED_ROOT : '/login', req.url),
    );
  }

  // Protected routes — must have at least a refresh token
  // (access token may be expired; the client will refresh it automatically)
  if (!accessToken && !refreshToken) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Match everything except static files
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
