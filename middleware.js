import { NextResponse } from 'next/server';

// Routes that require authentication
const PROTECTED_PATHS = [
  '/my',
  '/profile/settings',
  '/favorites',
  '/chat',
];

// Routes that should never be blocked
const PUBLIC_PATHS = [
  '/',
  '/login',
  '/listing',
  '/admin-panel',
  '/api/auth',
  '/api/listings',
  '/api/geocode',
  '/api/translate',
  '/monitoring',
];

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Skip public routes and static assets
  const isPublic = PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));
  if (isPublic) {
    return NextResponse.next();
  }

  // Skip Next.js internals and static files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Check if this is a protected route
  const isProtected = PROTECTED_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));
  
  if (!isProtected) {
    return NextResponse.next();
  }

  // Check for the auth cookie
  const cookie = request.cookies.get('app_session');
  
  if (!cookie?.value) {
    // For API routes, return 401
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // For page routes, redirect to login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Cookie exists — let the request through.
  // JWT verification happens in the actual handler (lib/auth.js).
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
