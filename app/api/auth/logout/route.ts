import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const cookieStore = await cookies();

    // `delete` may be undefined in some environments/types; guard and fallback
    if (typeof cookieStore.delete === 'function') {
      cookieStore.delete('token');
    } else {
      // Fallback: instruct client to clear the cookie by returning Set-Cookie header
      return NextResponse.json(
        { message: 'Đăng xuất thành công' },
        {
          status: 200,
          headers: {
            'Set-Cookie': 'token=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict'
          }
        }
      );
    }

    return NextResponse.json(
      { message: 'Đăng xuất thành công' },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { message: 'Lỗi server', error: error.message },
      { status: 500 }
    );
  }
}
