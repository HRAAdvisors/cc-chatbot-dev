import { NextResponse } from 'next/server';
import { getAdminToken } from '@/lib/admin-auth';

export async function POST(req: Request) {
  const { password } = await req.json();
  const secret = process.env.ADMIN_SECRET;
  if (!secret || password !== secret) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set('admin_auth', await getAdminToken(secret), {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 8, // 8 hours
    path: '/',
  });
  return res;
}
