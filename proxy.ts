import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

export function proxy(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const path = request.nextUrl.pathname;

  const publicPaths = [
    '/auth/login',
    '/auth/register',
    '/auth/owner-register',
    '/payment/vnpay-return',
  ];

  /* =======================
     PUBLIC ROUTES
  ======================== */
  if (publicPaths.includes(path)) {
    if (!token) return NextResponse.next();

    try {
      const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
      const { role, companyStatus } = decoded;

      if (role === 'admin') {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url));
      }

      if (role === 'owner') {
        return companyStatus === 'active'
          ? NextResponse.redirect(new URL('/owner/dashboard', request.url))
          : NextResponse.redirect(new URL('/pending-approval', request.url));
      }

      if (role === 'driver') {
        return NextResponse.redirect(new URL('/driver', request.url));
      }

      return NextResponse.redirect(new URL('/', request.url));
    } catch {
      return NextResponse.next();
    }
  }

  /* =======================
     NOT LOGIN
  ======================== */
  if (!token) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('callbackUrl', path);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    const { role, companyStatus } = decoded;

    /* =======================
       BLOCK HOME PAGE /
    ======================== */
    if (path === '/') {
      if (role === 'admin') {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url));
      }

      if (role === 'owner') {
        return companyStatus === 'active'
          ? NextResponse.redirect(new URL('/owner/dashboard', request.url))
          : NextResponse.redirect(new URL('/pending-approval', request.url));
      }

      if (role === 'driver') {
        return NextResponse.redirect(new URL('/driver', request.url));
      }
    }

    /* =======================
       ADMIN
    ======================== */
    if (path.startsWith('/admin') && role !== 'admin') {
      return NextResponse.redirect(new URL('/403', request.url));
    }

    /* =======================
       OWNER
    ======================== */
    if (path.startsWith('/owner')) {
      if (!['owner', 'admin'].includes(role)) {
        return NextResponse.redirect(new URL('/403', request.url));
      }

      if (role === 'owner' && companyStatus !== 'active') {
        return NextResponse.redirect(new URL('/pending-approval', request.url));
      }
    }

    /* =======================
       DRIVER
    ======================== */
    if (path.startsWith('/driver') && !['driver', 'owner', 'admin'].includes(role)) {
      return NextResponse.redirect(new URL('/403', request.url));
    }

    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }
}

export const config = {
  matcher: [
    '/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
