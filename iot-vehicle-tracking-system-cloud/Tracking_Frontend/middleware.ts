import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const publicPrefixes = ['/login', '/api', '/landing'];
const publicFilePattern = /\/[^/]+\.[^/]+$/;
const legacyZonePathPatterns = [
  /^\/dashboard\/geofences$/,
  /^\/dashboard\/operations\/geofences$/,
  /^\/dashboard\/geofences\/[^/]+$/,
  /^\/dashboard\/operations\/geofences\/[^/]+$/,
];

const isPublicPath = (pathname: string) => {
  if (pathname === '/') {
    return true;
  }

  if (publicFilePattern.test(pathname)) {
    return true;
  }

  return publicPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
};

const canonicalizeProtectedPath = (pathname: string) => {
  if (legacyZonePathPatterns.some((pattern) => pattern.test(pathname))) {
    return '/dashboard/zones';
  }

  return pathname;
};

export const middleware = (request: NextRequest) => {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get('session_token');

  if (!sessionCookie) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', canonicalizeProtectedPath(pathname));
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
};

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
