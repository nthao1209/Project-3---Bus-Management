import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

export const proxy = (request: NextRequest) => {
  const token = request.cookies.get('token')?.value;
  const path = request.nextUrl.pathname;

  // === Các trang public không bị redirect ===
  const publicPaths = ['/auth/login', '/auth/register', '/payment/vnpay-return'];
  if (publicPaths.includes(path)) {
    // Nếu đã login thì redirect ra dashboard tương ứng
    if (token) {
      try {
        const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
        const role = decoded.role;
        if (role === 'admin') return NextResponse.redirect(new URL('/admin/dashboard', request.url));
        if (role === 'owner') return NextResponse.redirect(new URL('/owner/dashboard', request.url));
        if (role === 'driver') return NextResponse.redirect(new URL('/driver/dashboard', request.url));
        return NextResponse.redirect(new URL('/', request.url));
      } catch {
        // Token lỗi -> cho qua, user vào login
        return NextResponse.next();
      }
    }
    return NextResponse.next();
  }

  // === Trang protected ===
  if (!token) {
    // Chưa login -> redirect về login
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('callbackUrl', path);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    const role = decoded.role;

    // Role-based access
    if (path.startsWith('/admin') && role !== 'admin') return NextResponse.redirect(new URL('/403', request.url));
    if (path.startsWith('/owner') && role !== 'owner' && role !== 'admin') return NextResponse.redirect(new URL('/403', request.url));
    if (path.startsWith('/driver') && !['driver', 'owner', 'admin'].includes(role)) return NextResponse.redirect(new URL('/403', request.url));

    return NextResponse.next();
  } catch {
    // Token lỗi -> redirect login
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }
};

export const config = {
  matcher: [
    '/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
