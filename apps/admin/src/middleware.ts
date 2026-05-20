import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const publicAuthRoutes = ['/login'];

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/api/')
  ) {
    return NextResponse.next();
  }

  const access = req.cookies.get('admin_access_token')?.value;
  const refresh = req.cookies.get('admin_refresh_token')?.value;
  const isLoggedIn = !!(access || refresh);

  if (publicAuthRoutes.includes(pathname)) {
    return isLoggedIn ? NextResponse.redirect(new URL('/', req.url)) : NextResponse.next();
  }

  if (pathname === '/') {
    return isLoggedIn ? NextResponse.next() : NextResponse.redirect(new URL('/login', req.url));
  }

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
