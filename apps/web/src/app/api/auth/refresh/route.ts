import { NextResponse } from 'next/server';
import { refreshAction } from '@/actions/auth.actions';

export async function POST() {
  const result = await refreshAction();

  if (!result.success) {
    return NextResponse.json({ message: 'Session expired' }, { status: 401 });
  }

  return NextResponse.json({ message: 'Token refreshed' }, { status: 200 });
}
