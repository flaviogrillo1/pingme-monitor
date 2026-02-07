import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Protected routes
  const isProtectedRoute = req.nextUrl.pathname.startsWith('/app');
  const isAuthRoute = req.nextUrl.pathname.startsWith('/auth');

  // Redirect to home if trying to access protected route without session
  if (isProtectedRoute && !session) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  // Redirect to app if trying to access auth route with session
  if (isAuthRoute && session) {
    return NextResponse.redirect(new URL('/app', req.url));
  }

  return res;
}

export const config = {
  matcher: ['/app/:path*', '/auth/:path*'],
};
