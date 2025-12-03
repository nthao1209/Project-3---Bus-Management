import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const cookieStore = await cookies();

    
    cookieStore.delete('token');

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