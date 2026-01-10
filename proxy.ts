import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

export const proxy = (request: NextRequest) => {
  const token = request.cookies.get('token')?.value;
  const path = request.nextUrl.pathname;

  const publicPaths = ['/auth/login', '/auth/register', '/payment/vnpay-return'];
  if (publicPaths.includes(path)) {
    if (token) {
      try {
        const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
        const role = decoded.role;
        if (role === 'admin') return NextResponse.redirect(new URL('/admin/dashboard', request.url));
        if (role === 'owner') return NextResponse.redirect(new URL('/owner/dashboard', request.url));
        if (role === 'driver') return NextResponse.redirect(new URL('/driver', request.url));
        return NextResponse.redirect(new URL('/', request.url));
      } catch {
        return NextResponse.next();
      }
    }
    return NextResponse.next();
  }

  if (!token) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('callbackUrl', path);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    const role = decoded.role;

    if (path.startsWith('/admin') && role !== 'admin') return NextResponse.redirect(new URL('/403', request.url));
    if (path.startsWith('/owner') && role !== 'owner' && role !== 'admin') return NextResponse.redirect(new URL('/403', request.url));
    if (path.startsWith('/driver') && !['driver', 'owner', 'admin'].includes(role)) return NextResponse.redirect(new URL('/403', request.url));

    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }
};

export const config = {
  matcher: [
    '/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
