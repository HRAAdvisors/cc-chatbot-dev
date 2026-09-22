import { NextResponse } from 'next/server';
import { getAdminToken } from '@/lib/admin-auth';

export async function POST(req: Request) {
  const { password } = await req.json();
  // Trim: env values pasted into Vercel's dashboard sometimes carry a
  // trailing newline/space, which would otherwise silently break this
  // exact-match comparison against the untrimmed form value.
  const secret = process.env.ADMIN_SECRET?.trim();
  if (!secret || password?.trim() !== secret) {
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
