import { NextResponse } from 'next/server';
import { adminRefreshAction } from '@/actions/admin-auth.actions';

export const dynamic = 'force-dynamic';

export async function POST() {
  const result = await adminRefreshAction();
  if (!result.success) {
    return NextResponse.json({ message: 'Session expired' }, { status: 401 });
  }
  return NextResponse.json({ message: 'Token refreshed' }, { status: 200 });
}
