import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const publicAuthRoutes = ['/login', '/forgot-password', '/reset-password'];

  // Always allow Next.js internals and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/api/')
  ) {
    return NextResponse.next();
  }

  const access  = req.cookies.get('hotel_access_token')?.value;
  const refresh = req.cookies.get('hotel_refresh_token')?.value;
  const isLoggedIn = !!(access || refresh);

  // Already logged in — redirect away from auth-only pages
  if (publicAuthRoutes.includes(pathname)) {
    return isLoggedIn
      ? NextResponse.redirect(new URL('/dashboard', req.url))
      : NextResponse.next();
  }

  // Redirect root based on auth state
  if (pathname === '/') {
    return NextResponse.redirect(
      new URL(isLoggedIn ? '/dashboard' : '/login', req.url)
    );
  }

  // Protected routes — no tokens, send to login
  if (!isLoggedIn) {
    const url = new URL('/login', req.url);
    url.searchParams.set('from', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
