import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_URL = process.env.API_URL || 'http://localhost:4000/api/v1';
const COOKIE_ACCESS = 'hotel_access_token';

async function handler(
  req: Request,
  { params }: { params: { path: string[] } },
) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(COOKIE_ACCESS)?.value;

  const url = new URL(req.url);
  const path = params.path?.join('/') ?? '';
  const targetUrl = `${API_URL}/${path}${url.search}`;

  const headers = new Headers(req.headers);
  headers.delete('host');
  headers.delete('cookie');
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

  const init: RequestInit = {
    method: req.method,
    headers,
    body: ['GET', 'HEAD'].includes(req.method) ? undefined : await req.arrayBuffer(),
    redirect: 'manual',
  };

  const res = await fetch(targetUrl, init);
  const resHeaders = new Headers(res.headers);
  resHeaders.delete('content-encoding');

  return new NextResponse(res.body, {
    status: res.status,
    headers: resHeaders,
  });
}

export { handler as GET, handler as POST, handler as PUT, handler as PATCH, handler as DELETE, handler as OPTIONS };
