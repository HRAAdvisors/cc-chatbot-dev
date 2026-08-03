import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAdminToken } from './lib/admin-auth';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/admin/login') || pathname === '/api/admin/login') {
    return NextResponse.next();
  }

  const secret = process.env.ADMIN_SECRET;
  const cookie = req.cookies.get('admin_auth')?.value;
  const expected = secret ? await getAdminToken(secret) : null;

  if (expected && cookie === expected) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/admin')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.redirect(new URL('/admin/login', req.url));
}

export const config = {
  matcher: ['/admin', '/admin/:path*', '/api/admin/:path*'],
};
